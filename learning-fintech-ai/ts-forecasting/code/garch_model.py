"""GARCH(1,1) volatility model for financial returns.

Usage:
    from garch_model import fit_garch, forecast_garch, compute_var
"""

import numpy as np
from arch import arch_model
from scipy.stats import norm


def test_arch_effects(returns: np.ndarray, lags: int = 12) -> dict:
    """Engle's ARCH-LM test for conditional heteroskedasticity.

    Args:
        returns: 1D array of log-returns.
        lags: Number of lags for the auxiliary regression.

    Returns:
        Dict with lm_stat, lm_pval, has_arch (bool).
    """
    from statsmodels.stats.diagnostic import het_arch
    lm_stat, lm_pval, f_stat, f_pval = het_arch(returns, nlags=lags)
    has_arch = lm_pval < 0.05
    print(f"ARCH-LM test: LM={lm_stat:.3f}  p={lm_pval:.4f}")
    print("ARCH effects present — GARCH warranted" if has_arch else "No significant ARCH effects")
    return {'lm_stat': lm_stat, 'lm_pval': lm_pval, 'has_arch': has_arch}


def fit_garch(
    returns: np.ndarray,
    p: int = 1,
    q: int = 1,
    dist: str = 'normal',
    model_type: str = 'GARCH',
):
    """Fit a GARCH-family model using maximum likelihood.

    Args:
        returns: 1D array of log-returns.
        p: GARCH lag order (variance lags).
        q: ARCH lag order (shock lags).
        dist: Innovation distribution — 'normal', 't', 'skewt'.
        model_type: 'GARCH', 'EGARCH', or 'GJR-GARCH'.

    Returns:
        arch ARCHModelResult object.
    """
    # arch library expects percent-scale returns
    scaled = returns * 100
    am = arch_model(scaled, vol=model_type, p=p, q=q, dist=dist)
    result = am.fit(disp='off')
    print(result.summary())
    return result


def forecast_garch(fitted, horizon: int = 10) -> np.ndarray:
    """Generate h-step ahead conditional variance forecasts.

    Args:
        fitted: ARCHModelResult from fit_garch().
        horizon: Number of steps ahead.

    Returns:
        1D array of length horizon with variance forecasts in return² units.
    """
    fc = fitted.forecast(horizon=horizon, reindex=False)
    # Convert from percent² back to return² units
    return fc.variance.values[-1] / 10_000


def compute_var(
    fitted,
    confidence: float = 0.95,
    horizon: int = 1,
) -> float:
    """Compute parametric Value at Risk.

    Args:
        fitted: ARCHModelResult from fit_garch().
        confidence: VaR confidence level (e.g. 0.95 → 5% tail).
        horizon: Forecast horizon in bars.

    Returns:
        VaR as a negative number representing the loss threshold.
    """
    var_fc = forecast_garch(fitted, horizon=horizon)
    sigma = np.sqrt(var_fc[0])
    z = norm.ppf(1 - confidence)   # e.g. -1.645 for 95%
    return z * sigma


def rolling_garch_vol(returns: np.ndarray, window: int = 252) -> np.ndarray:
    """Estimate conditional volatility using a rolling GARCH(1,1).

    For each bar from position `window` onwards, fits GARCH on the trailing
    window and records the 1-step-ahead conditional std dev.

    Args:
        returns: Full 1D return series.
        window: Rolling window length in bars.

    Returns:
        Array of length len(returns) with NaN for first `window` entries.
    """
    vols = np.full(len(returns), np.nan)
    for t in range(window, len(returns)):
        sub = returns[t - window:t]
        try:
            result = arch_model(sub * 100, vol='GARCH', p=1, q=1).fit(disp='off')
            fc = result.forecast(horizon=1, reindex=False)
            vols[t] = np.sqrt(fc.variance.values[-1, 0]) / 100
        except Exception:
            vols[t] = np.std(sub)
    return vols


def garch_standardised_residuals(fitted) -> np.ndarray:
    """Return standardised residuals ε_t / σ_t from a fitted GARCH model.

    Standardised residuals should be approximately i.i.d. N(0,1) if the model
    is correctly specified.

    Returns:
        1D array of standardised residuals.
    """
    resid = fitted.resid
    cond_vol = fitted.conditional_volatility
    return (resid / cond_vol).dropna().values
