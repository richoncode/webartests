"""
train.py — Training loop for the DQN trading agent.

Run with:
    python train.py
    python train.py --ticker ETH-USD --episodes 300 --ep-len 100
    python train.py --ticker SPY --interval 1d --period 1825d

The script:
  1. Downloads OHLCV data via yfinance
  2. Splits into train (80%) and validation (20%) windows
  3. Trains the DQN agent for n_episodes
  4. Evaluates on the validation window every eval_every episodes
  5. Saves the best checkpoint to best_dqn_<ticker>.pt
  6. Prints a final performance summary
"""

import argparse
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import yfinance as yf
from tqdm import tqdm

from environment import TradingEnv
from agent import DQNAgent

warnings.filterwarnings("ignore")


# ── Data loading ──────────────────────────────────────────────────────────────

def load_prices(ticker: str = "BTC-USD",
                period: str = "730d",
                interval: str = "1d") -> np.ndarray:
    """Download closing prices from Yahoo Finance."""
    print(f"[train] Downloading {ticker}  period={period}  interval={interval}")
    raw = yf.download(ticker, period=period, interval=interval, progress=False)
    if hasattr(raw.columns, "levels"):
        raw.columns = raw.columns.droplevel(1)
    prices = raw["Close"].replace(0, np.nan).dropna().values.astype(np.float64)
    print(f"[train] {len(prices)} bars  ({raw.index[0].date()} → {raw.index[-1].date()})")
    return prices


# ── Evaluation ────────────────────────────────────────────────────────────────

def evaluate(prices: np.ndarray, agent: DQNAgent,
             n_episodes: int = 10, ep_len: int = 100) -> dict:
    """Run n_episodes with greedy policy, return mean metrics."""
    env = TradingEnv(prices, ep_len=ep_len)
    rewards, portfolios = [], []
    for _ in range(n_episodes):
        obs, _ = env.reset()
        done, ep_r = False, 0.0
        while not done:
            a = agent.act(obs, greedy=True)
            obs, r, done, _, info = env.step(a)
            ep_r += r
        rewards.append(ep_r)
        portfolios.append(info["portfolio"])
    return {
        "mean_reward":    float(np.mean(rewards)),
        "std_reward":     float(np.std(rewards)),
        "mean_portfolio": float(np.mean(portfolios)),
        "win_rate":       float(np.mean([p > 1.0 for p in portfolios])),
    }


# ── Training loop ─────────────────────────────────────────────────────────────

def train(
    ticker:     str = "BTC-USD",
    period:     str = "730d",
    interval:   str = "1d",
    n_episodes: int = 500,
    ep_len:     int = 100,
    eval_every: int = 50,
    n_eval_eps: int = 10,
    lr:         float = 3e-4,
    gamma:      float = 0.99,
    eps_decay:  int   = 3_000,
    batch_size: int   = 64,
    tc:         float = 0.001,
    dd_lambda:  float = 0.5,
    save_path:  str   = None,
):
    prices = load_prices(ticker, period, interval)

    # 80/20 train-val split
    split  = int(len(prices) * 0.8)
    tr_prices = prices[:split]
    va_prices = prices[split - 20:]  # include some overlap for window

    if save_path is None:
        save_path = f"best_dqn_{ticker.replace('-','_')}.pt"

    train_env = TradingEnv(tr_prices, ep_len=ep_len, tc=tc, dd_lambda=dd_lambda)
    agent     = DQNAgent(
        obs_dim=10, n_actions=3,
        lr=lr, gamma=gamma,
        eps_decay=eps_decay,
        batch_size=batch_size,
    )

    best_eval_reward = -np.inf
    ep_rewards, ep_losses, ep_epsilons = [], [], []

    print(f"\n[train] Starting  |  {n_episodes} episodes  |  ep_len={ep_len}  "
          f"|  train_bars={len(tr_prices)}  val_bars={len(va_prices)}\n")

    for ep in tqdm(range(1, n_episodes + 1), desc="Training"):
        obs, _ = train_env.reset()
        done, ep_r, losses = False, 0.0, []

        while not done:
            action         = agent.act(obs)
            obs2, r, done, _, _ = train_env.step(action)
            agent.push(obs, action, r, obs2, done)
            loss = agent.learn()
            if loss is not None:
                losses.append(loss)
            obs   = obs2
            ep_r += r

        ep_rewards.append(ep_r)
        ep_losses.append(float(np.mean(losses)) if losses else 0.0)
        ep_epsilons.append(agent.epsilon)

        if ep % eval_every == 0:
            if len(va_prices) >= 20 + ep_len + 1:
                eval_m = evaluate(va_prices, agent, n_eval_eps, ep_len)
                tqdm.write(
                    f"  Ep {ep:4d}  train_r={ep_r:+6.2f}  "
                    f"val_r={eval_m['mean_reward']:+6.2f}±{eval_m['std_reward']:.2f}  "
                    f"portfolio={eval_m['mean_portfolio']:.3f}  "
                    f"win={eval_m['win_rate']:.0%}  ε={agent.epsilon:.3f}"
                )
                if eval_m["mean_reward"] > best_eval_reward:
                    best_eval_reward = eval_m["mean_reward"]
                    agent.save(save_path)
                    tqdm.write(f"    → New best ({best_eval_reward:+.2f}) saved to {save_path}")
            else:
                tqdm.write(f"  Ep {ep:4d}  train_r={ep_r:+6.2f}  ε={agent.epsilon:.3f}")

    # Final summary
    window = min(50, len(ep_rewards))
    print(f"\n{'─'*55}")
    print(f"  Training complete")
    print(f"  Episodes:         {n_episodes}")
    print(f"  Last {window}-ep avg reward: {np.mean(ep_rewards[-window:]):+.3f}")
    print(f"  Best eval reward: {best_eval_reward:+.3f}")
    print(f"  Checkpoint:       {save_path}")
    print(f"{'─'*55}\n")

    return {
        "ep_rewards":  ep_rewards,
        "ep_losses":   ep_losses,
        "ep_epsilons": ep_epsilons,
    }


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Train a DQN agent on market data",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--ticker",     default="BTC-USD",  help="Yahoo Finance symbol")
    parser.add_argument("--period",     default="730d",      help="Data lookback period")
    parser.add_argument("--interval",   default="1d",        help="Bar frequency")
    parser.add_argument("--episodes",   type=int, default=500)
    parser.add_argument("--ep-len",     type=int, default=100, dest="ep_len")
    parser.add_argument("--eval-every", type=int, default=50,  dest="eval_every")
    parser.add_argument("--lr",         type=float, default=3e-4)
    parser.add_argument("--gamma",      type=float, default=0.99)
    parser.add_argument("--tc",         type=float, default=0.001,
                        help="Transaction cost fraction")
    parser.add_argument("--dd-lambda",  type=float, default=0.5, dest="dd_lambda",
                        help="Drawdown penalty weight")
    args = parser.parse_args()

    train(
        ticker     = args.ticker,
        period     = args.period,
        interval   = args.interval,
        n_episodes = args.episodes,
        ep_len     = args.ep_len,
        eval_every = args.eval_every,
        lr         = args.lr,
        gamma      = args.gamma,
        tc         = args.tc,
        dd_lambda  = args.dd_lambda,
    )
