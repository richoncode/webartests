"""
environment.py — Gym-compatible single-asset trading environment.

The environment wraps a price series and simulates a trading agent
that can hold three positions: flat (0), long (+1), short (-1).

Observation space (10 features):
    [0] ret_1      — 1-bar percentage return
    [1] ret_5      — 5-bar mean return
    [2] ret_20     — 20-bar mean return (full window)
    [3] vol_10     — 10-bar rolling std of returns
    [4] rsi        — RSI(14) normalised to [-1, +1]
    [5] position   — current position (-1, 0, 1)
    [6] upnl       — unrealised P&L from entry price
    [7] time_left  — fraction of episode remaining [0, 1]
    [8] drawdown   — current drawdown from episode peak (negative)
    [9] since_trade — bars since last trade change (normalised [0,1])

Action space:
    0 = Hold   — keep current position
    1 = Buy    — go long (or close short)
    2 = Sell   — go short (or close long)

Reward:
    r(t) = pos × price_return − tc × |Δpos| − λ_dd × current_drawdown

Run with:
    python -c "
    from environment import TradingEnv, make_env
    import numpy as np
    env = make_env()
    obs, _ = env.reset()
    print('obs shape:', obs.shape)
    for _ in range(5):
        obs, r, done, _, info = env.step(env.action_space.sample())
        print(f'reward={r:.4f}  done={done}  pos={info[\"position\"]}')
    "
"""

import warnings
import numpy as np
import pandas as pd
import yfinance as yf

warnings.filterwarnings("ignore")

try:
    import gymnasium as gym
    from gymnasium import spaces
except ImportError:
    import gym
    from gym import spaces


# ── Constants ─────────────────────────────────────────────────────────────────
WINDOW   = 20       # lookback window for features
EP_LEN   = 252      # episode length in bars
TC       = 0.001    # transaction cost (0.1% per side)
DD_LAMBDA = 0.5     # drawdown penalty weight


class TradingEnv(gym.Env):
    """
    Single-asset trading environment compatible with OpenAI Gym / Gymnasium.

    Parameters
    ----------
    prices    : 1-D array of close prices (float)
    window    : lookback for feature calculation (bars)
    ep_len    : episode length (bars)
    tc        : one-way transaction cost as fraction of trade value
    dd_lambda : coefficient on the drawdown penalty in the reward

    Example
    -------
    >>> env = TradingEnv(prices)
    >>> obs, _ = env.reset()
    >>> obs, reward, done, truncated, info = env.step(1)  # Buy
    """

    metadata = {"render_modes": []}

    def __init__(
        self,
        prices: np.ndarray,
        window:    int   = WINDOW,
        ep_len:    int   = EP_LEN,
        tc:        float = TC,
        dd_lambda: float = DD_LAMBDA,
    ):
        super().__init__()
        self.prices    = np.asarray(prices, dtype=np.float64)
        self.window    = window
        self.ep_len    = ep_len
        self.tc        = tc
        self.dd_lambda = dd_lambda

        if len(self.prices) < window + ep_len + 1:
            raise ValueError(
                f"Need at least {window + ep_len + 1} bars, got {len(self.prices)}"
            )

        self.observation_space = spaces.Box(
            low=-np.inf, high=np.inf, shape=(10,), dtype=np.float32
        )
        self.action_space = spaces.Discrete(3)  # 0=Hold, 1=Buy, 2=Sell

        # Internal state (initialised in reset)
        self._idx        = 0
        self._end        = 0
        self._pos        = 0
        self._entry      = 0.0
        self._portfolio  = 1.0
        self._peak       = 1.0
        self._step_count = 0
        self._since      = 0
        self._cum_reward = 0.0

    # ── Public API ────────────────────────────────────────────────────────────

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        max_start = len(self.prices) - self.ep_len - self.window - 1
        start = self.window + (
            np.random.randint(0, max(1, max_start))
        )
        self._idx        = start
        self._end        = start + self.ep_len
        self._pos        = 0
        self._entry      = self.prices[start]
        self._portfolio  = 1.0
        self._peak       = 1.0
        self._step_count = 0
        self._since      = 0
        self._cum_reward = 0.0
        return self._obs(), {}

    def step(self, action: int):
        assert 0 <= action <= 2, f"Invalid action {action}"
        old_pos = self._pos

        # Resolve action to position
        if action == 1:    self._pos =  1   # go long
        elif action == 2:  self._pos = -1   # go short (or close long)
        # action == 0: hold

        # Transaction cost on position change
        tc_cost = abs(self._pos - old_pos) * self.tc / 2
        if self._pos != old_pos:
            self._entry = self.prices[self._idx]
            self._since  = 0
        else:
            self._since += 1

        # Advance price
        p0 = self.prices[self._idx]
        self._idx += 1
        p1 = self.prices[self._idx]
        price_ret = (p1 - p0) / p0

        # Portfolio update
        position_ret = self._pos * price_ret - tc_cost
        self._portfolio *= (1.0 + position_ret)
        self._peak       = max(self._peak, self._portfolio)
        drawdown         = (self._peak - self._portfolio) / self._peak

        # Reward
        reward = position_ret - self.dd_lambda * drawdown
        self._cum_reward += reward
        self._step_count += 1

        done = (
            self._idx >= self._end
            or self._portfolio < 0.5  # 50% loss terminates episode
        )

        info = {
            "position":   self._pos,
            "portfolio":  self._portfolio,
            "drawdown":   drawdown,
            "cum_reward": self._cum_reward,
            "price":      p1,
        }
        return self._obs(), float(reward), done, False, info

    def render(self):
        pass

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _obs(self) -> np.ndarray:
        """Compute the 10-feature observation vector at the current bar."""
        window_prices = self.prices[self._idx - self.window: self._idx + 1]
        rets = np.diff(window_prices) / window_prices[:-1]  # shape (window,)

        ret_1  = float(rets[-1])
        ret_5  = float(rets[-5:].mean()) if len(rets) >= 5 else ret_1
        ret_20 = float(rets.mean())
        vol_10 = float(rets[-10:].std()) if len(rets) >= 10 else 0.01
        rsi    = self._compute_rsi(rets)

        upnl   = (
            (self.prices[self._idx] - self._entry) / self._entry * self._pos
        )
        drawdown = (self._peak - self._portfolio) / self._peak
        time_left = 1.0 - self._step_count / self.ep_len

        return np.array(
            [
                np.clip(ret_1,   -0.2,  0.2),
                np.clip(ret_5,   -0.2,  0.2),
                np.clip(ret_20,  -0.2,  0.2),
                np.clip(vol_10,   0.0,  0.1),
                rsi,
                float(self._pos),
                np.clip(upnl,    -0.5,  0.5),
                float(time_left),
                float(-drawdown),
                min(self._since / 50.0, 1.0),
            ],
            dtype=np.float32,
        )

    @staticmethod
    def _compute_rsi(rets: np.ndarray, period: int = 14) -> float:
        """RSI normalised to [-1, +1]. Returns 0 if insufficient data."""
        if len(rets) < period:
            return 0.0
        r = rets[-period:]
        gain_mask = r > 0
        loss_mask = r < 0
        avg_gain  = r[gain_mask].mean() if gain_mask.any() else 1e-9
        avg_loss  = (-r[loss_mask]).mean() if loss_mask.any() else 1e-9
        rs  = avg_gain / avg_loss
        rsi_raw = 100 * rs / (1 + rs)          # [0, 100]
        return (rsi_raw / 50) - 1.0             # [-1, +1]


# ── Factory helpers ────────────────────────────────────────────────────────────

def make_env(ticker: str = "BTC-USD", period: str = "730d",
             interval: str = "1d", **kwargs) -> TradingEnv:
    """Download price data and return a ready-to-use TradingEnv."""
    print(f"[env] Downloading {ticker}  period={period}  interval={interval}")
    raw = yf.download(ticker, period=period, interval=interval, progress=False)
    if hasattr(raw.columns, "levels"):
        raw.columns = raw.columns.droplevel(1)
    prices = raw["Close"].dropna().values.astype(np.float64)
    if len(prices) < 300:
        raise ValueError(f"Too few bars: {len(prices)}")
    print(f"[env] {len(prices)} bars ready")
    return TradingEnv(prices, **kwargs)


if __name__ == "__main__":
    env = make_env(period="365d", interval="1d")
    obs, _ = env.reset()
    print("Observation shape:", obs.shape)
    print("Sample observation:", np.round(obs, 4))

    total_r = 0.0
    for step in range(20):
        action = env.action_space.sample()
        obs, r, done, _, info = env.step(action)
        total_r += r
        print(f"  step {step+1:2d}  action={action}  reward={r:+.4f}"
              f"  pos={info['position']:+d}  portfolio={info['portfolio']:.4f}")
        if done:
            break
    print(f"Episode cumulative reward: {total_r:+.4f}")
