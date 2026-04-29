"""
data_loader.py — Market data download and feature engineering.

Downloads hourly BTC-USD OHLCV data and computes three features
that the Gaussian HMM trains on:

  returns       = (Close[t] - Close[t-1]) / Close[t-1]
  range         = (High[t]  - Low[t])    / Close[t]    (normalised)
  volume_change = (Vol[t]   - Vol[t-1])  / Vol[t-1]

These three features give the HMM independent axes to separate regimes:
  - returns    → direction / drift (Bull vs Bear)
  - range      → intrabar volatility (high in Bear, low in Chop)
  - vol_change → participation (rising in Bull, spike-then-fall in Bear)
"""

import warnings
import numpy as np
import pandas as pd
import yfinance as yf

warnings.filterwarnings("ignore")


def load_data(ticker: str = "BTC-USD", period: str = "730d", interval: str = "1h") -> pd.DataFrame:
    """
    Download hourly OHLCV data from Yahoo Finance and compute HMM features.

    Parameters
    ----------
    ticker   : Yahoo Finance symbol, e.g. "BTC-USD", "ETH-USD", "SPY"
    period   : lookback period, e.g. "730d" (730 days ≈ 2 years of hourly bars)
    interval : bar frequency — "1h" gives ~17,000 bars over 730d

    Returns
    -------
    pd.DataFrame with columns:
        Open, High, Low, Close, Volume,
        returns, range, volume_change
    """
    print(f"[data_loader] Downloading {ticker}  period={period}  interval={interval} ...")
    raw = yf.download(ticker, period=period, interval=interval, progress=False)

    if raw.empty:
        raise ValueError(f"No data returned for {ticker}. Check ticker symbol and internet connection.")

    # yfinance sometimes returns MultiIndex columns (ticker, field).
    # Flatten to single-level field names.
    if isinstance(raw.columns, pd.MultiIndex):
        raw.columns = raw.columns.droplevel(1)

    # Keep only the five base columns
    df = raw[["Open", "High", "Low", "Close", "Volume"]].copy()
    df = df.replace([np.inf, -np.inf], np.nan).dropna()

    if len(df) < 200:
        raise ValueError(
            f"Only {len(df)} valid bars found for {ticker}. "
            "Need at least 200 for HMM training. Try a longer period."
        )

    # ── Feature engineering ────────────────────────────────────────────────
    # Feature 1: percentage return
    df["returns"] = df["Close"].pct_change()

    # Feature 2: normalised intrabar range (high-low / close)
    df["range"] = (df["High"] - df["Low"]) / df["Close"]

    # Feature 3: volume change (percentage)
    df["volume_change"] = df["Volume"].pct_change()

    # Drop first row (NaN from pct_change) and any remaining bad rows
    df = df.replace([np.inf, -np.inf], np.nan).dropna()

    print(f"[data_loader] {len(df)} bars ready  ({df.index[0]} → {df.index[-1]})")
    return df


def get_features(df: pd.DataFrame, clip_pct: float = 0.01) -> np.ndarray:
    """
    Return the (n_samples, 3) feature matrix for HMM training.

    Clips each feature to [clip_pct, 1-clip_pct] percentile range to
    prevent single extreme bars (flash crashes, exchange glitches) from
    distorting the Gaussian fit for an entire state.

    Parameters
    ----------
    df       : DataFrame returned by load_data()
    clip_pct : percentile to clip at each end (default 1%)

    Returns
    -------
    np.ndarray of shape (n, 3)
    """
    features = df[["returns", "range", "volume_change"]].copy()
    for col in features.columns:
        lo = features[col].quantile(clip_pct)
        hi = features[col].quantile(1.0 - clip_pct)
        features[col] = features[col].clip(lo, hi)
    return features.values


def get_feature_names() -> list[str]:
    return ["returns", "range", "volume_change"]
