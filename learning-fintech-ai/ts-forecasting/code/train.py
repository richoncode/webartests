"""Train and compare ARIMA, GARCH, and Transformer forecasting models.

Usage:
    python train.py --ticker SPY --epochs 50
    python train.py --ticker QQQ --lookback 192 --horizon 5
"""

import argparse
import numpy as np
import yfinance as yf
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from tqdm import tqdm

from arima_model import (
    test_stationarity,
    select_arima_order,
    fit_arima,
    walk_forward_arima,
    residual_diagnostics,
)
from garch_model import (
    test_arch_effects,
    fit_garch,
    forecast_garch,
    compute_var,
)
from transformer_model import (
    TSTransformer,
    make_sequences,
    normalise_sequences,
    evaluate_model,
)


def load_returns(ticker: str = 'SPY', period: str = '5y') -> np.ndarray:
    """Download adjusted close prices and compute log-returns.

    Args:
        ticker: Yahoo Finance ticker symbol.
        period: Historical period string (e.g. '5y', '2y').

    Returns:
        1D array of daily log-returns.
    """
    df = yf.download(ticker, period=period, auto_adjust=True, progress=False)
    prices = df['Close'].dropna().values
    returns = np.log(prices[1:] / prices[:-1])
    print(f"Loaded {len(returns)} log-returns for {ticker}")
    return returns


def run_arima(returns: np.ndarray, test_size: int = 252) -> dict:
    """Fit ARIMA and evaluate via walk-forward out-of-sample forecasting."""
    print("\n" + "=" * 40)
    print("ARIMA — mean forecasting")
    print("=" * 40)

    stat = test_stationarity(returns)
    print(f"ADF p-value: {stat['p_value']:.4f}  stationary: {stat['is_stationary']}")
    if not stat['is_stationary']:
        print("WARNING: returns may not be stationary — consider differencing")

    order = select_arima_order(returns[:-test_size])
    fitted = fit_arima(returns[:-test_size], order=order)
    residual_diagnostics(fitted)

    preds = walk_forward_arima(returns, order=order, test_size=test_size)
    actual = returns[-test_size:]
    mae = float(np.mean(np.abs(actual - preds)))
    dir_acc = float(np.mean(np.sign(actual) == np.sign(preds)))
    print(f"\nWalk-forward results ({test_size} bars):")
    print(f"  MAE:              {mae:.6f}")
    print(f"  Dir. accuracy:    {dir_acc:.1%}")
    return {'mae': mae, 'dir_acc': dir_acc, 'order': order}


def run_garch(returns: np.ndarray, test_size: int = 252) -> dict:
    """Fit GARCH(1,1) and compute QLIKE volatility loss on test window."""
    print("\n" + "=" * 40)
    print("GARCH(1,1) — volatility modelling")
    print("=" * 40)

    arch_test = test_arch_effects(returns)
    fitted = fit_garch(returns[:-test_size])

    # QLIKE loss on test window using expanding forecasts
    params = fitted.params
    omega = params.get('omega', 1e-6) / 10_000
    alpha = params.get('alpha[1]', 0.10)
    beta = params.get('beta[1]', 0.85)
    sigma2_lr = omega / (1 - alpha - beta) if (alpha + beta) < 1 else 1e-6

    test_returns = returns[-test_size:]
    sigma2 = fitted.conditional_volatility.values[-1] ** 2 / 10_000
    qlikes = []
    for r in test_returns:
        sigma2 = omega + alpha * r * r + beta * sigma2
        sigma2 = max(sigma2, 1e-10)
        qlikes.append(np.log(sigma2) + r * r / sigma2)

    qlike = float(np.mean(qlikes))
    var_95 = compute_var(fitted, confidence=0.95, horizon=1)
    print(f"\nTest window ({test_size} bars):")
    print(f"  QLIKE loss:       {qlike:.4f}")
    print(f"  1-day VaR 95%:    {var_95:.4f}  ({var_95 * 100:.2f}%)")
    return {'qlike': qlike, 'var_95': var_95}


def train_transformer(
    returns: np.ndarray,
    lookback: int = 96,
    horizon: int = 1,
    epochs: int = 30,
    lr: float = 1e-3,
    batch_size: int = 64,
) -> tuple:
    """Train a PatchTST-style Transformer and evaluate on a held-out set."""
    print("\n" + "=" * 40)
    print("Transformer — multi-step forecasting")
    print("=" * 40)

    X, y = make_sequences(returns, lookback, horizon)
    split = int(len(X) * 0.8)
    X_tr_raw, y_tr = X[:split], y[:split]
    X_val_raw, y_val = X[split:], y[split:]

    X_tr, X_val, mean, std = normalise_sequences(X_tr_raw, X_val_raw)
    X_tr_t = torch.tensor(X_tr)
    y_tr_t = torch.tensor(y_tr)
    X_val_t = torch.tensor(X_val)

    model = TSTransformer(lookback=lookback, forecast_horizon=horizon)
    n_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"Model parameters: {n_params:,}")

    opt = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=epochs)
    criterion = nn.HuberLoss()
    loader = DataLoader(
        TensorDataset(X_tr_t, y_tr_t),
        batch_size=batch_size,
        shuffle=True,
    )

    best_val_mae = np.inf
    for epoch in tqdm(range(1, epochs + 1), desc='Training', unit='ep'):
        model.train()
        total_loss = 0.0
        for xb, yb in loader:
            pred = model(xb)
            loss = criterion(pred, yb)
            opt.zero_grad()
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            opt.step()
            total_loss += loss.item()
        scheduler.step()

        if epoch % max(1, epochs // 5) == 0:
            metrics = evaluate_model(model, X_val, y_val)
            tqdm.write(
                f"Epoch {epoch:3d} | "
                f"train loss {total_loss / len(loader):.6f} | "
                f"val MAE {metrics['mae']:.6f} | "
                f"dir acc {metrics['dir_acc']:.1%}"
            )
            if metrics['mae'] < best_val_mae:
                best_val_mae = metrics['mae']
                torch.save(model.state_dict(), 'best_model.pt')

    final_metrics = evaluate_model(model, X_val, y_val)
    print(f"\nFinal results ({horizon}-step ahead):")
    print(f"  MAE:              {final_metrics['mae']:.6f}")
    print(f"  RMSE:             {final_metrics['rmse']:.6f}")
    print(f"  Dir. accuracy:    {final_metrics['dir_acc']:.1%}")
    return model, final_metrics


def print_summary(arima_res: dict, garch_res: dict, transformer_res: dict) -> None:
    """Print a comparison table of all three models."""
    print("\n" + "=" * 55)
    print("MODEL COMPARISON SUMMARY")
    print("=" * 55)
    print(f"{'Model':<20} {'Metric':<22} {'Value':>10}")
    print("-" * 55)
    print(f"{'ARIMA':<20} {'MAE':<22} {arima_res['mae']:>10.6f}")
    print(f"{'ARIMA':<20} {'Dir. accuracy':<22} {arima_res['dir_acc']:>10.1%}")
    print(f"{'GARCH(1,1)':<20} {'QLIKE loss':<22} {garch_res['qlike']:>10.4f}")
    print(f"{'GARCH(1,1)':<20} {'VaR 95% (daily)':<22} {garch_res['var_95']:>10.4f}")
    print(f"{'Transformer':<20} {'MAE':<22} {transformer_res['mae']:>10.6f}")
    print(f"{'Transformer':<20} {'Dir. accuracy':<22} {transformer_res['dir_acc']:>10.1%}")
    print("=" * 55)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Train and compare time series forecasting models.'
    )
    parser.add_argument('--ticker',   default='SPY',  help='Yahoo Finance ticker')
    parser.add_argument('--period',   default='5y',   help='Historical data period')
    parser.add_argument('--test',     type=int, default=252, help='Test window size (bars)')
    parser.add_argument('--epochs',   type=int, default=30,  help='Transformer training epochs')
    parser.add_argument('--lookback', type=int, default=96,  help='Transformer lookback window')
    parser.add_argument('--horizon',  type=int, default=1,   help='Forecast horizon (bars)')
    args = parser.parse_args()

    returns = load_returns(args.ticker, args.period)

    arima_res = run_arima(returns, test_size=args.test)
    garch_res = run_garch(returns, test_size=args.test)
    _, transformer_res = train_transformer(
        returns,
        lookback=args.lookback,
        horizon=args.horizon,
        epochs=args.epochs,
    )

    print_summary(arima_res, garch_res, transformer_res)
