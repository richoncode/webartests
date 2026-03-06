# Time Series Forecasting

> Part of the [Learning Fintech-AI](../) interactive course series.

Master the mathematical models behind financial prediction — from classical statistics to deep learning. Seven interactive lessons build from first principles to a complete forecasting system with Python code you can run on real market data.

## Curriculum

| Lesson | Topic | Key Concepts |
|--------|-------|-------------|
| [01](01-basics/) | Time Series Basics | Autocorrelation, ACF plots, lag plots, log returns |
| [02](02-stationarity/) | Stationarity & Differencing | ADF test, unit roots, differencing order d |
| [03](03-arima/) | ARIMA | AR/MA/I components, model order selection, forecasting |
| [04](04-garch/) | GARCH | Volatility clustering, ARCH effects, GARCH(1,1) |
| [05](05-volatility/) | Volatility Forecasting | Multi-step VaR, leverage effect, GJR-GARCH |
| [06](06-transformers/) | Transformers | Self-attention, positional encoding, PatchTST |
| [07](07-full-system/) | Full System | Complete pipeline: ARIMA + GARCH + Transformer |

## Key Concepts

### Autocorrelation Function (ACF)

```
ACF(k) = Corr(x_t, x_{t-k})
       = E[(x_t - μ)(x_{t-k} - μ)] / Var(x_t)

For efficient market returns: ACF(k) ≈ 0 for all k > 0
Significant spikes → predictability or microstructure noise
```

### ARIMA(p, d, q)

```
Step 1: Difference d times to achieve stationarity
Step 2: Fit ARMA(p, q) to differenced series:

x_t = c + φ₁x_{t-1} + ... + φ_p x_{t-p}
        + ε_t + θ₁ε_{t-1} + ... + θ_q ε_{t-q}

Model selection: minimise AIC = -2·log L + 2k
                            BIC = -2·log L + k·log(n)
```

### GARCH(1,1)

```
σ²_t = ω + α·ε²_{t-1} + β·σ²_{t-1}

α + β < 1           stationarity condition
σ²_∞ = ω / (1-α-β) long-run variance
Half-life ≈ log(0.5) / log(α+β)

Typical equity: α ≈ 0.10, β ≈ 0.85, α+β ≈ 0.95
```

### Scaled Dot-Product Attention

```
Attention(Q, K, V) = softmax( Q·Kᵀ / √d_k ) · V

Q: query matrix    K: key matrix    V: value matrix
d_k: key dimension (scaling prevents saturation)
```

### PatchTST

```
Input: x ∈ ℝ^L  →  patches ∈ ℝ^{P × p}  →  embed ∈ ℝ^{P × d_model}
         ↓
    TransformerEncoder  →  Flatten  →  Linear head  →  ℝ^T

P = ⌊(L - p) / s⌋ + 2    (number of patches)
p = patch length,  s = stride
```

## Quick Start

```bash
pip install -r code/requirements.txt
python code/train.py --ticker SPY --epochs 50
python code/train.py --ticker QQQ --lookback 192 --horizon 5
```

## File Structure

```
ts-forecasting/
├── index.html              # Course hub
├── README.md               # This file
│
├── 01-basics/              # ACF plots, lag plots, log returns
├── 02-stationarity/        # ADF test, differencing
├── 03-arima/               # AR/MA/I, forecast demo
├── 04-garch/               # Volatility clustering, GARCH simulation
├── 05-volatility/          # Variance forecasts, VaR, GJR-GARCH
├── 06-transformers/        # Attention, positional encoding, PatchTST
├── 07-full-system/         # Architecture diagram, comparison, code tabs
│
└── code/
    ├── arima_model.py      # ADF test, ARIMA fit, walk-forward evaluation
    ├── garch_model.py      # ARCH test, GARCH fit, VaR, rolling volatility
    ├── transformer_model.py # PatchTST architecture, sequence builder
    ├── train.py            # Training script with CLI, model comparison table
    └── requirements.txt
```

## Typical Results (SPY daily log-returns, 5y, 252-bar test)

| Model | MAE | Directional Accuracy | Notes |
|-------|-----|---------------------|-------|
| ARIMA(1,0,1) | 0.0078 | 52% | Best for 1-step mean |
| GARCH(1,1) | — | — | QLIKE ≈ 2.1, volatility R² ≈ 0.31 |
| Transformer | 0.0091 | 55% | Best for 5-step horizon |

Directional accuracy > 50% is statistically meaningful. At 54–55% it can generate consistent alpha when combined with position sizing and transaction cost management.

## References

- Box, G.E.P. & Jenkins, G.M. (1970). *Time Series Analysis: Forecasting and Control.*
- Engle, R.F. (1982). Autoregressive Conditional Heteroskedasticity. *Econometrica* 50(4).
- Bollerslev, T. (1986). Generalised Autoregressive Conditional Heteroskedasticity. *Journal of Econometrics* 31(3).
- Glosten, Jagannathan & Runkle (1993). On the Relation Between the Expected Value and the Volatility of the Nominal Excess Return on Stocks. *Journal of Finance* 48(5).
- Vaswani et al. (2017). Attention Is All You Need. *NeurIPS 2017.*
- Nie et al. (2023). A Time Series is Worth 64 Words: Long-term Forecasting with Transformers. *ICLR 2023.*
- [statsmodels documentation](https://www.statsmodels.org/)
- [arch package documentation](https://arch.readthedocs.io/)
- [PyTorch documentation](https://pytorch.org/docs/)
