"""
backtester.py — HMM training, auto-labelling, technical indicators,
                trade signal logic, and backtesting engine.

Architecture:
  1. train_hmm()         → fit GaussianHMM to feature matrix
  2. label_states()      → Viterbi decode + rank states by mean return
  3. compute_indicators()→ 8 technical indicator columns on the DataFrame
  4. check_confirmations()→ evaluate indicator conditions for a single bar
  5. run_backtest()      → simulate trading over the full history
  6. compute_metrics()   → total return, alpha, max drawdown, win rate
"""

import warnings
import numpy as np
import pandas as pd
from hmmlearn.hmm import GaussianHMM
from ta.momentum import RSIIndicator
from ta.trend import MACD, ADXIndicator, EMAIndicator
from ta.volatility import AverageTrueRange
from ta.volume import OnBalanceVolumeIndicator

from data_loader import load_data, get_features

warnings.filterwarnings("ignore")

# ── Constants ──────────────────────────────────────────────────────────────────
N_STATES = 7          # number of HMM hidden states
LEVERAGE = 2.5        # leveraged long multiplier
COOLDOWN_HOURS = 48   # hard cooldown after any exit (in bars for hourly data)
CONFIRM_THRESH = 7    # minimum confirmations needed to enter (out of 8)
HYSTERESIS_LAG = 3    # consecutive bars required before accepting a regime change


# ── 1. HMM Training ───────────────────────────────────────────────────────────

def train_hmm(features: np.ndarray, n_states: int = N_STATES,
              n_iter: int = 200, random_state: int = 42) -> GaussianHMM:
    """
    Fit a Gaussian Hidden Markov Model to the feature matrix.

    The HMM models the market as a latent process:
        P(x_t | S_t = k) = N(x_t; μ_k, Σ_k)   ← emission (Gaussian)
        P(S_t | S_{t-1}) = A[S_{t-1}, S_t]       ← transition matrix

    Training: Baum-Welch (Expectation-Maximisation)
        E-step: forward-backward algorithm → soft state probabilities γ_t(k)
        M-step: update μ_k, Σ_k, A to maximise expected log-likelihood
        Repeat until |ΔlogL| < tol or n_iter reached.

    Parameters
    ----------
    features     : (n_samples, 3) array from get_features()
    n_states     : number of hidden states (default 7)
    n_iter       : maximum EM iterations
    random_state : seed for reproducibility

    Returns
    -------
    Trained GaussianHMM object
    """
    model = GaussianHMM(
        n_components=n_states,
        covariance_type="full",   # full 3×3 covariance matrix per state
        n_iter=n_iter,
        random_state=random_state,
        tol=1e-4,
    )
    print(f"[backtester] Training {n_states}-state Gaussian HMM on {len(features)} bars ...")
    model.fit(features)
    print(f"[backtester] Training complete  log-likelihood = {model.score(features):.2f}")
    return model


# ── 2. State Auto-Labelling ────────────────────────────────────────────────────

def label_states(model: GaussianHMM, df: pd.DataFrame,
                 features: np.ndarray) -> tuple[dict, pd.DataFrame]:
    """
    Decode the most likely state sequence (Viterbi) and auto-label states.

    Auto-labelling strategy:
        - Rank all states by their mean return over the full history
        - Highest mean return  → 'Bull Run'
        - Lowest mean return   → 'Bear/Crash'
        - All others           → 'Chop/Noise'

    This is robust to the random initialisation of Baum-Welch: the state
    that receives the 'Bull Run' label may differ across runs, but the
    ranking ensures the correct semantic label is always applied.

    Returns
    -------
    state_labels : dict {int: str}  mapping state index to label string
    df           : input DataFrame with 'state' and 'regime' columns added
    """
    # Viterbi decode: most likely state sequence
    hidden_states = model.predict(features)
    df = df.copy()
    df["state"] = hidden_states

    # Mean return per state
    state_returns = df.groupby("state")["returns"].mean()
    bull_state = int(state_returns.idxmax())
    bear_state = int(state_returns.idxmin())

    state_labels: dict[int, str] = {}
    for s in range(model.n_components):
        if s == bull_state:
            state_labels[s] = "Bull Run"
        elif s == bear_state:
            state_labels[s] = "Bear/Crash"
        else:
            state_labels[s] = "Chop/Noise"

    df["regime"] = df["state"].map(state_labels)

    # Log state summary
    stats = df.groupby("state")["returns"].agg(["mean", "std", "count"])
    stats["label"] = stats.index.map(state_labels)
    print("\n[backtester] State summary:")
    print(stats.to_string())
    print()

    return state_labels, df


def get_state_probabilities(model: GaussianHMM, features: np.ndarray) -> np.ndarray:
    """
    Return the posterior state probabilities for each bar.
    Shape: (n_samples, n_states). Uses the forward-backward algorithm.
    """
    return model.predict_proba(features)


# ── 3. Technical Indicators ────────────────────────────────────────────────────

def compute_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute all 8 technical indicators used for trade confirmation.

    Indicator design:
        1. RSI(14)       — momentum oscillator; rule: RSI < 90
        2. Momentum(10)  — price minus 10-bar-ago price; rule: > 0
        3. ATR(14)       — average true range; rule: ATR/Close > 0.5%
        4. Volume ratio  — volume / 20-bar MA; rule: > 1.10
        5. ADX(14)       — trend strength; rule: ADX > 25
        6. EMA(50)       — trend filter; rule: Close > EMA50
        7. MACD(12,26,9) — momentum; rule: MACD line > signal line
        8. OBV(5-slope)  — volume flow; rule: 5-bar OBV slope > 0

    Returns
    -------
    DataFrame with indicator columns appended. Rows with NaN (warm-up)
    are dropped.
    """
    close  = df["Close"]
    high   = df["High"]
    low    = df["Low"]
    volume = df["Volume"]

    # 1. RSI
    df["rsi"] = RSIIndicator(close, window=14).rsi()

    # 2. Momentum (10-bar)
    df["momentum"] = close - close.shift(10)

    # 3. ATR / normalised volatility
    df["atr"]     = AverageTrueRange(high, low, close, window=14).average_true_range()
    df["atr_pct"] = df["atr"] / close

    # 4. Volume ratio (vs 20-bar MA)
    df["vol_ma20"]  = volume.rolling(20).mean()
    df["vol_ratio"] = volume / df["vol_ma20"]

    # 5. ADX
    df["adx"] = ADXIndicator(high, low, close, window=14).adx()

    # 6. EMA (50-period)
    df["ema50"] = EMAIndicator(close, window=50).ema_indicator()

    # 7. MACD (12/26/9)
    _macd = MACD(close, window_slow=26, window_fast=12, window_sign=9)
    df["macd"]        = _macd.macd()
    df["macd_signal"] = _macd.macd_signal()

    # 8. On-Balance Volume — 5-bar slope
    df["obv"]       = OnBalanceVolumeIndicator(close, volume).on_balance_volume()
    df["obv_slope"] = df["obv"].diff(5)

    return df.dropna()


def check_confirmations(row: pd.Series) -> dict[str, bool]:
    """
    Evaluate all 8 technical conditions for a single bar.

    Returns a dict {condition_label: bool}. Entry requires the sum
    to reach CONFIRM_THRESH (default 7 out of 8).
    """
    return {
        "RSI < 90":          bool(row["rsi"]         < 90),
        "Positive Momentum": bool(row["momentum"]    > 0),
        "Volatility OK":     bool(row["atr_pct"]     > 0.005),
        "Volume Surge":      bool(row["vol_ratio"]   > 1.10),
        "ADX Trending":      bool(row["adx"]         > 25),
        "Above EMA50":       bool(row["Close"]       > row["ema50"]),
        "MACD Bullish":      bool(row["macd"]        > row["macd_signal"]),
        "OBV Rising":        bool(row["obv_slope"]   > 0),
    }


# ── 4. Backtesting Engine ──────────────────────────────────────────────────────

def run_backtest(df: pd.DataFrame, leverage: float = LEVERAGE,
                 confirm_thresh: int = CONFIRM_THRESH) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Simulate the HMM regime strategy over the full historical DataFrame.

    Entry logic (two-factor gate):
        Factor 1 — HMM regime must be confirmed 'Bull Run'
                   (requires HYSTERESIS_LAG consecutive bull bars)
        Factor 2 — At least confirm_thresh out of 8 technical conditions pass

    Exit logic:
        - Confirmed regime flips to 'Bear/Crash'

    Risk management:
        - COOLDOWN_HOURS hard lock after any exit
        - HYSTERESIS_LAG-bar delay before accepting any regime change
        - leverage × applied to strategy return while in trade

    Returns
    -------
    df       : original DataFrame with added columns:
                 position (0/1), equity, bh_equity
    trade_df : DataFrame with one row per entry/exit event
    """
    positions  = []
    trade_log  = []

    in_trade         = False
    entry_price      = None
    cooldown_until   = None
    pending_regime   = df["regime"].iloc[0]
    confirmed_regime = df["regime"].iloc[0]
    regime_count     = 0

    equity    = [1.0]
    bh_equity = [1.0]

    for i in range(1, len(df)):
        row        = df.iloc[i]
        bar_return = row["returns"]

        # Buy-and-hold baseline (always fully invested, no leverage)
        bh_equity.append(bh_equity[-1] * (1.0 + bar_return))

        # ── Regime hysteresis ──────────────────────────────────────────────
        # Require HYSTERESIS_LAG consecutive bars in the same regime before
        # accepting a regime change. Prevents whipsaw on noisy boundaries.
        raw_regime = row["regime"]
        if raw_regime == pending_regime:
            regime_count += 1
        else:
            pending_regime = raw_regime
            regime_count   = 1

        if regime_count >= HYSTERESIS_LAG:
            confirmed_regime = pending_regime

        # ── Exit check (checked before entry) ─────────────────────────────
        if in_trade:
            equity.append(equity[-1] * (1.0 + bar_return * leverage))

            if confirmed_regime == "Bear/Crash":
                in_trade     = False
                exit_price   = row["Close"]
                pnl_pct      = (exit_price - entry_price) / entry_price * leverage

                cooldown_until = row.name + pd.Timedelta(hours=COOLDOWN_HOURS)
                trade_log.append({
                    "type":    "EXIT",
                    "time":    row.name,
                    "price":   round(float(exit_price), 2),
                    "regime":  confirmed_regime,
                    "pnl_pct": round(pnl_pct * 100, 2),
                    "reason":  "Regime → Bear/Crash",
                })
                positions.append(0)
            else:
                positions.append(1)
            continue

        # ── Cooldown check ────────────────────────────────────────────────
        if cooldown_until is not None and row.name < cooldown_until:
            equity.append(equity[-1])   # flat — no exposure
            positions.append(0)
            continue

        # ── Entry: Factor 1 — Bull Run regime ─────────────────────────────
        if confirmed_regime != "Bull Run":
            equity.append(equity[-1])
            positions.append(0)
            continue

        # ── Entry: Factor 2 — Technical confirmations ─────────────────────
        confirms  = check_confirmations(row)
        n_confirm = sum(confirms.values())

        if n_confirm >= confirm_thresh:
            in_trade    = True
            entry_price = row["Close"]

            trade_log.append({
                "type":     "ENTRY",
                "time":     row.name,
                "price":    round(float(entry_price), 2),
                "regime":   confirmed_regime,
                "confirms": n_confirm,
                "reason":   f"{n_confirm}/8 confirmations",
            })
            equity.append(equity[-1] * (1.0 + bar_return * leverage))
            positions.append(1)
        else:
            equity.append(equity[-1])
            positions.append(0)

    # Align index (first row was consumed for initialisation)
    df = df.iloc[1:].copy()
    df["position"]  = positions
    df["equity"]    = equity[1:]
    df["bh_equity"] = bh_equity[1:]

    trade_df = pd.DataFrame(trade_log)
    n_entries = len(trade_df[trade_df["type"] == "ENTRY"]) if len(trade_df) else 0
    print(f"[backtester] Backtest complete  |  {n_entries} trades executed")
    return df, trade_df


# ── 5. Performance Metrics ────────────────────────────────────────────────────

def compute_metrics(df: pd.DataFrame, trade_df: pd.DataFrame) -> dict:
    """
    Compute key performance metrics for the dashboard header.

    Metrics:
        total_return  — strategy equity curve end value − 1
        bh_return     — buy-and-hold end value − 1
        alpha         — total_return − bh_return  (excess return)
        max_drawdown  — peak-to-trough decline of the equity curve
        win_rate      — fraction of exit trades with positive P&L
        n_trades      — number of round-trip trades (EXIT rows)
    """
    total_return = float(df["equity"].iloc[-1]) - 1.0
    bh_return    = float(df["bh_equity"].iloc[-1]) - 1.0
    alpha        = total_return - bh_return

    # Max drawdown
    rolling_max = df["equity"].cummax()
    drawdown    = (df["equity"] - rolling_max) / rolling_max
    max_dd      = float(drawdown.min())

    # Win rate
    exits    = trade_df[trade_df["type"] == "EXIT"] if len(trade_df) > 0 else pd.DataFrame()
    win_rate = float((exits["pnl_pct"] > 0).mean()) if len(exits) > 0 else 0.0

    return {
        "total_return": round(total_return * 100, 2),
        "bh_return":    round(bh_return    * 100, 2),
        "alpha":        round(alpha        * 100, 2),
        "max_drawdown": round(max_dd       * 100, 2),
        "win_rate":     round(win_rate     * 100, 2),
        "n_trades":     len(exits),
    }


# ── CLI convenience ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    df = load_data()
    features = get_features(df)
    model = train_hmm(features)
    state_labels, df = label_states(model, df, features)
    df = compute_indicators(df)
    df, trade_df = run_backtest(df)
    metrics = compute_metrics(df, trade_df)
    print("\n── Performance Metrics ──────────────────")
    for k, v in metrics.items():
        print(f"  {k:<16} {v}")
