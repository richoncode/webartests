# HMM Trader — Learning Plan

A progressive 8-lesson course building a Hidden Markov Model regime-detection trading system from scratch. Each lesson adds one conceptual layer toward the complete Python application.

---

## Learning Arc

```
Price Data → Returns → Distributions → HMM → Regimes → Features → Indicators → Full System
```

The system classifies Bitcoin's market state into one of 7 hidden regimes using a Gaussian HMM, then applies an 8-confirmation technical filter before entering leveraged long trades.

---

## Lessons

### Lesson 01 — Returns & Price Math
**Concepts:** percentage return, log return, random walk, return distribution
**Why it matters:** HMMs and most financial models operate on returns, not raw prices. Prices are non-stationary; returns are approximately stationary.
**Key formula:** `r_t = (P_t - P_{t-1}) / P_{t-1}`, log return = `ln(P_t / P_{t-1})`
**Interactive:** Toggle between price, returns, and log-return views of a synthetic price series. Histogram of returns.

### Lesson 02 — Market Regimes
**Concepts:** trending market, mean-reverting market, volatility clustering, regime switching
**Why it matters:** A strategy that works in a trending market destroys capital in a choppy one. Regime awareness is the edge.
**Interactive:** Synthetic multi-regime price series with revealed colored zones (Bull Run, Bear, Sideways Chop). Statistical comparison of each regime's properties.

### Lesson 03 — Gaussian Distributions
**Concepts:** probability density function, mean (μ), standard deviation (σ), mixture of Gaussians
**Why it matters:** Each HMM state emits observations from a multivariate Gaussian. Different regimes have different μ and σ — this is how the model distinguishes them.
**Key formula:** `f(x) = (1/σ√2π) exp(-(x-μ)²/2σ²)`
**Interactive:** Sliders for μ and σ. Overlay Bull vs Bear distributions. Preview mixture of Gaussians.

### Lesson 04 — HMM Foundations
**Concepts:** hidden state, observable emission, transition matrix, emission distribution, Markov property
**Why it matters:** The HMM is the core of the regime classifier. Understanding its three components (π, A, B) is essential to interpreting and trusting the model.
**Key components:**
- `π` — initial state probabilities
- `A` — transition matrix (7×7 for 7 states)
- `B` — emission distributions (one Gaussian per state)

**Interactive:** State machine diagram. Transition probability heatmap. Animated state walk.

### Lesson 05 — Viterbi & Baum-Welch Training
**Concepts:** forward-backward algorithm, Viterbi decoding, EM (expectation-maximisation), convergence
**Why it matters:** To use an HMM you must (1) train it (Baum-Welch) and (2) decode the most likely regime sequence for new data (Viterbi).
**Interactive:** Step-by-step Viterbi on a 3-state toy model with 20 observations. Watch the decoding trellis fill in.

### Lesson 06 — Feature Engineering
**Concepts:** feature selection, normalisation, multivariate Gaussian, stationarity, outlier clipping
**Why it matters:** The HMM only sees the three features you give it. Good features separate regimes cleanly; bad features make the model blind.
**Three features:**
1. `returns` — percentage change in close price (captures direction and magnitude)
2. `range` — (High - Low) / Close (normalised daily/hourly range, captures volatility)
3. `volume_change` — percentage change in volume (captures participation)

**Interactive:** OHLCV data → three derived time series. Before/after visualisation.

### Lesson 07 — Indicators & Signal Logic
**Concepts:** RSI, MACD, ADX, EMA, ATR, OBV, signal hysteresis, cooldown period, leverage
**Why it matters:** The HMM gives the macro regime filter (Factor 1). Eight technical indicators provide micro confirmation (Factor 2). Both must agree before entry.
**The 8 confirmations:**
1. RSI < 90 (not extremely overbought)
2. Positive 10-bar momentum
3. ATR > 0.5% of price (sufficient volatility)
4. Volume 10% above 20-bar average
5. ADX > 25 (strong trend)
6. Price above 50-bar EMA
7. MACD line above signal line
8. On-Balance Volume rising (5-bar slope positive)

**Risk rules:** 48-hour cooldown after any exit. 3-bar hysteresis before accepting regime change.
**Leverage:** 2.5× applied to strategy returns.

**Interactive:** Synthetic price with computed RSI panel. Live confirmation checklist. Hysteresis state machine demo.

### Lesson 08 — The Full System
**Concepts:** modular architecture, backtesting mechanics, equity curve, alpha, max drawdown, Streamlit dashboard
**Why it matters:** Putting it all together into a runnable Python application.
**Components:**
- `data_loader.py` — yfinance download, feature engineering
- `backtester.py` — HMM training, auto-labelling, indicator computation, trade loop
- `dashboard.py` — Streamlit UI, charts, trade log

---

## Python Setup

### Dependencies

```bash
pip install hmmlearn yfinance ta streamlit plotly pandas numpy scikit-learn
```

Or with the provided requirements file:

```bash
pip install -r requirements.txt
```

### Running the Dashboard

```bash
streamlit run dashboard.py
```

The app will open at `http://localhost:8501`. First run downloads ~730 days of hourly BTC-USD data and trains the HMM (typically 20–60 seconds). Results are cached for 1 hour.

---

## Key References

- Rabiner, L. R. (1989). *A tutorial on Hidden Markov Models and selected applications in speech recognition.* Proceedings of the IEEE, 77(2), 257–286.
- Hamilton, J. D. (1989). *A new approach to the economic analysis of nonstationary time series and the business cycle.* Econometrica, 57(2), 357–384.
- Ang, A., & Bekaert, G. (2002). *Regime switches in interest rates.* Journal of Business & Economic Statistics, 20(2), 163–182.
- hmmlearn documentation: https://hmmlearn.readthedocs.io
- ta library (technical analysis): https://technical-analysis-library-in-python.readthedocs.io

---

## Disclaimer

This course is for educational purposes only. The system described does not constitute financial advice. Backtested performance is not indicative of future results. Cryptocurrency markets are highly volatile.
