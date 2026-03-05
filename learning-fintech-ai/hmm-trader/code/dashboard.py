"""
dashboard.py — Streamlit web dashboard for the Regime Terminal.

Run with:
    streamlit run dashboard.py

Displays:
  - Current regime + confidence probability
  - Trade signal (Long / Cash / Enter / Exit)
  - 8-confirmation checklist for the latest bar
  - Equity curve vs Buy & Hold
  - Candlestick chart with regime overlay
  - Full trade log
"""

import warnings
import streamlit as st
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd

warnings.filterwarnings("ignore")

from data_loader import load_data, get_features
from backtester import (
    train_hmm, label_states, compute_indicators,
    check_confirmations, get_state_probabilities,
    run_backtest, compute_metrics,
    N_STATES, LEVERAGE, CONFIRM_THRESH,
)

# ── Page configuration ────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Regime Terminal",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown("""
<style>
  [data-testid="stMetricValue"] { font-size: 1.4rem; }
  .regime-label { font-size: 1.6rem; font-weight: 800; }
  .confirm-pass { color: #4caf50; font-weight: 600; }
  .confirm-fail { color: #e07070; }
  div[data-testid="stHorizontalBlock"] { align-items: flex-start; }
</style>
""", unsafe_allow_html=True)

# ── Sidebar controls ──────────────────────────────────────────────────────────
with st.sidebar:
    st.title("⚙️  Configuration")
    ticker          = st.text_input("Ticker", "BTC-USD")
    n_states        = st.slider("HMM states", 3, 10, N_STATES)
    leverage        = st.slider("Leverage ×", 1.0, 5.0, LEVERAGE, step=0.5)
    confirm_needed  = st.slider("Confirmations needed (of 8)", 4, 8, CONFIRM_THRESH)
    aggressive      = st.checkbox("Aggressive mode (5/8 confirmations, 4× leverage)", value=False)
    if aggressive:
        leverage       = 4.0
        confirm_needed = 5

    st.divider()
    refresh = st.button("🔄  Refresh data & retrain")
    st.caption("Data cached for 1 hour. Clear cache to force reload.")

# ── Data pipeline (cached) ────────────────────────────────────────────────────
@st.cache_data(ttl=3600, show_spinner=False)
def run_pipeline(ticker: str, n_states_val: int, leverage_val: float, confirm_val: int):
    df = load_data(ticker)
    feats = get_features(df)
    model = train_hmm(feats, n_states=n_states_val)
    state_labels, df = label_states(model, df, feats)
    state_probs = get_state_probabilities(model, feats)
    df = compute_indicators(df)
    df, trade_df = run_backtest(df, leverage=leverage_val, confirm_thresh=confirm_val)
    metrics = compute_metrics(df, trade_df)
    return df, trade_df, metrics, model, state_labels, state_probs

if refresh:
    st.cache_data.clear()

with st.spinner("Loading data and training HMM — this takes ~30 seconds on first run..."):
    try:
        df, trade_df, metrics, model, state_labels, state_probs = run_pipeline(
            ticker, n_states, leverage, confirm_needed
        )
    except Exception as exc:
        st.error(f"Pipeline error: {exc}")
        st.stop()

# ── Latest bar state ──────────────────────────────────────────────────────────
latest          = df.iloc[-1]
current_regime  = latest["regime"]
current_pos     = int(latest["position"])
latest_confirms = check_confirmations(latest)
n_passing       = sum(latest_confirms.values())

# Probability of current regime at latest bar
# state_probs aligns with the pre-dropna df; use last row
latest_probs   = state_probs[-1]  # shape (n_states,)
# Map state probs to regime labels and sum same-label probs
regime_prob: dict[str, float] = {}
for s, p in enumerate(latest_probs):
    lbl = state_labels.get(s, "Chop/Noise")
    regime_prob[lbl] = regime_prob.get(lbl, 0.0) + p
current_regime_prob = regime_prob.get(current_regime, 0.0)

# ── Header ────────────────────────────────────────────────────────────────────
st.title("📊  Regime Terminal")
st.caption(f"Asset: **{ticker}**  |  Model: {n_states}-state Gaussian HMM  |  Leverage: {leverage}×  |  Entry gate: {confirm_needed}/8")

# ── Top metrics row ───────────────────────────────────────────────────────────
c1, c2, c3, c4, c5, c6 = st.columns(6)

REGIME_DELTA = {"Bull Run": "🟢", "Bear/Crash": "🔴", "Chop/Noise": "⚪"}
regime_icon = REGIME_DELTA.get(current_regime, "⚪")
c1.metric("Regime", f"{regime_icon} {current_regime}")
c2.metric("Confidence", f"{current_regime_prob:.0%}")

signal_map = {1: "🟢 Long", 0: "⚪ Cash"}
c3.metric("Signal", signal_map.get(current_pos, "⚪ Cash"))
c4.metric("Total Return", f"{metrics['total_return']}%", delta=f"B&H: {metrics['bh_return']}%")
c5.metric("Alpha", f"{metrics['alpha']}%")
c6.metric("Max Drawdown", f"{metrics['max_drawdown']}%")

st.divider()

# ── Confirmation breakdown ────────────────────────────────────────────────────
st.subheader("🔍  Confirmations — latest bar")
conf_cols = st.columns(8)
for idx, (name, passed) in enumerate(latest_confirms.items()):
    icon  = "✅" if passed else "❌"
    color = "confirm-pass" if passed else "confirm-fail"
    conf_cols[idx].markdown(f"<div class='{color}'>{icon}<br><small>{name}</small></div>", unsafe_allow_html=True)

color_bar = "#4caf50" if n_passing >= confirm_needed else "#e07070"
st.markdown(
    f"<div style='margin-top:8px;font-size:13px;color:#888'>"
    f"<b style='color:{color_bar}'>{n_passing}</b>/8 passing — need {confirm_needed} to enter</div>",
    unsafe_allow_html=True,
)

st.divider()

# ── Chart tabs ────────────────────────────────────────────────────────────────
tab_price, tab_equity, tab_trades = st.tabs(["📈 Price + Regimes", "💰 Equity Curve", "📋 Trade Log"])

REGIME_COLORS = {
    "Bull Run":   "rgba(76, 175, 80, 0.12)",
    "Bear/Crash": "rgba(224, 112, 112, 0.12)",
    "Chop/Noise": "rgba(100, 100, 100, 0.06)",
}

with tab_price:
    fig = make_subplots(
        rows=2, cols=1, shared_xaxes=True,
        row_heights=[0.75, 0.25],
        subplot_titles=(f"{ticker} Price + Regime Overlay", "RSI (14)"),
        vertical_spacing=0.04,
    )

    # Candlestick
    fig.add_trace(go.Candlestick(
        x=df.index, open=df["Open"], high=df["High"], low=df["Low"], close=df["Close"],
        name=ticker,
        increasing_line_color="#4caf50",
        decreasing_line_color="#e07070",
        increasing_fillcolor="#4caf5044",
        decreasing_fillcolor="#e0707044",
    ), row=1, col=1)

    # Regime background shading
    regime_series = df["regime"]
    start_idx, prev_r = df.index[0], regime_series.iloc[0]
    for i in range(1, len(regime_series)):
        curr = regime_series.iloc[i]
        if curr != prev_r or i == len(regime_series) - 1:
            fig.add_vrect(
                x0=start_idx, x1=df.index[i],
                fillcolor=REGIME_COLORS.get(prev_r, "rgba(100,100,100,0.06)"),
                layer="below", line_width=0,
            )
            start_idx, prev_r = df.index[i], curr

    # RSI
    fig.add_trace(go.Scatter(
        x=df.index, y=df["rsi"], name="RSI",
        line=dict(color="#b07adf", width=1),
    ), row=2, col=1)
    for level, color in [(70, "#e07070"), (30, "#4caf50")]:
        fig.add_hline(y=level, line_dash="dash", line_color=color, opacity=0.4, row=2, col=1)

    fig.update_layout(
        template="plotly_dark", height=620,
        xaxis_rangeslider_visible=False,
        showlegend=False,
        margin=dict(l=0, r=0, t=36, b=0),
    )
    st.plotly_chart(fig, use_container_width=True)

with tab_equity:
    fig2 = go.Figure()
    fig2.add_trace(go.Scatter(
        x=df.index, y=(df["equity"] - 1) * 100,
        name=f"HMM Strategy ({leverage}×)",
        line=dict(color="#4caf50", width=2),
        fill="tozeroy", fillcolor="rgba(76,175,80,0.06)",
    ))
    fig2.add_trace(go.Scatter(
        x=df.index, y=(df["bh_equity"] - 1) * 100,
        name="Buy & Hold",
        line=dict(color="#5b9bd5", width=2, dash="dash"),
    ))
    fig2.update_layout(
        template="plotly_dark", height=420,
        title="Portfolio Cumulative Return (%)",
        yaxis_title="Return (%)",
        legend=dict(x=0.01, y=0.99),
        margin=dict(l=0, r=0, t=48, b=0),
    )
    st.plotly_chart(fig2, use_container_width=True)

    # Summary metrics below equity curve
    m1, m2, m3, m4, m5 = st.columns(5)
    m1.metric("Strategy", f"{metrics['total_return']}%")
    m2.metric("Buy & Hold", f"{metrics['bh_return']}%")
    m3.metric("Alpha", f"{metrics['alpha']}%")
    m4.metric("Win Rate", f"{metrics['win_rate']}%")
    m5.metric("# Trades", metrics["n_trades"])

with tab_trades:
    if len(trade_df) == 0:
        st.info("No trades executed in the backtest period.")
    else:
        show_cols = [c for c in ["type", "time", "price", "regime", "pnl_pct", "confirms", "reason"] if c in trade_df.columns]
        st.dataframe(
            trade_df[show_cols].sort_values("time", ascending=False),
            use_container_width=True,
            hide_index=True,
        )

# ── Footer ────────────────────────────────────────────────────────────────────
st.divider()
st.caption(
    "**Regime Terminal** — educational demonstration only. "
    "Not financial advice. Past performance is not indicative of future results. "
    "Backtested results assume no slippage, fees, or liquidity constraints."
)
