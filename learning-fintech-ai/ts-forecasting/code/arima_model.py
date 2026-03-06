"""ARIMA forecasting for financial log-returns.

Usage:
    from arima_model import fit_arima, walk_forward_arima, test_stationarity
"""

import numpy as np
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.stattools import adfuller
from statsmodels.stats.diagnostic import acorr_ljungbox


def test_stationarity(series: np.ndarray, alpha: float = 0.05) -> dict:
    """Run Augmented Dickey-Fuller test.

    Args:
        series: 1D array of returns or prices.
        alpha: Significance level for rejecting H0 (unit root).

    Returns:
        Dict with adf_stat, p_value, is_stationary, critical_values.
    """
    result = adfuller(series, autolag='AIC')
    return {
        'adf_stat': result[0],
        'p_value': result[1],
        'is_stationary': result[1] < alpha,
        'critical_values': result[4],
        'n_lags': result[2],
    }


def select_arima_order(returns: np.ndarray, max_p: int = 3, max_q: int = 3) -> tuple:
    """Grid search ARIMA(p, 0, q) orders by AIC.

    Args:
        returns: Stationary return series (already differenced if needed).
        max_p: Maximum AR order to search.
        max_q: Maximum MA order to search.

    Returns:
        Best (p, d, q) order tuple.
    """
    best_aic = np.inf
    best_order = (1, 0, 1)
    for p in range(0, max_p + 1):
        for q in range(0, max_q + 1):
            if p == 0 and q == 0:
                continue
            try:
                aic = ARIMA(returns, order=(p, 0, q)).fit().aic
                if aic < best_aic:
                    best_aic = aic
                    best_order = (p, 0, q)
            except Exception:
                pass
    print(f"Best order: ARIMA{best_order}  AIC={best_aic:.2f}")
    return best_order


def fit_arima(returns: np.ndarray, order: tuple = (1, 0, 1)):
    """Fit ARIMA(p,d,q) model to return series.

    Args:
        returns: 1D array of log-returns (already stationary for d=0).
        order: (p, d, q) tuple.

    Returns:
        Fitted statsmodels ARIMAResults object.
    """
    model = ARIMA(returns, order=order)
    fitted = model.fit()
    print(f"ARIMA{order} — AIC: {fitted.aic:.2f}  BIC: {fitted.bic:.2f}")
    return fitted


def forecast_arima(fitted, horizon: int = 5) -> tuple:
    """Generate h-step ahead point forecast with 95% confidence intervals.

    Args:
        fitted: ARIMAResults from fit_arima().
        horizon: Number of steps ahead to forecast.

    Returns:
        Tuple of (mean, lower_ci, upper_ci) numpy arrays of length horizon.
    """
    result = fitted.get_forecast(steps=horizon)
    mean = result.predicted_mean.values
    ci = result.conf_int(alpha=0.05)
    return mean, ci.iloc[:, 0].values, ci.iloc[:, 1].values


def walk_forward_arima(
    returns: np.ndarray,
    order: tuple = (1, 0, 1),
    test_size: int = 252,
) -> np.ndarray:
    """Walk-forward one-step-ahead forecasts for out-of-sample evaluation.

    Trains on an expanding window ending at each bar, forecasts 1 step ahead.

    Args:
        returns: Full return series.
        order: ARIMA(p, d, q) order.
        test_size: Number of bars in the out-of-sample test window.

    Returns:
        1D array of test_size one-step-ahead predictions.
    """
    train_end = len(returns) - test_size
    preds = []
    for t in range(test_size):
        window = returns[:train_end + t]
        model = ARIMA(window, order=order).fit()
        preds.append(model.forecast(1)[0])
    return np.array(preds)


def residual_diagnostics(fitted) -> dict:
    """Run Ljung-Box test on model residuals.

    Returns:
        Dict with lb_stats and lb_pvalues arrays.
    """
    lb = acorr_ljungbox(fitted.resid, lags=[5, 10, 20], return_df=True)
    print("Ljung-Box p-values (lags 5,10,20):", lb['lb_pvalue'].values.round(3))
    no_autocorr = all(lb['lb_pvalue'] > 0.05)
    print("Residuals appear white-noise:" if no_autocorr else "WARNING: residual autocorrelation detected")
    return {'lb_pvalues': lb['lb_pvalue'].values}
