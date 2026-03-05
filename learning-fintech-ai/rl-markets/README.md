# RL Markets — Deep Reinforcement Learning for Trading

A self-contained tutorial series teaching you to build a Deep Q-Network (DQN) trading agent from scratch. By the end you will have a working agent that learns to go long, go short, or hold a single asset — trained directly on real market data downloaded from Yahoo Finance.

---

## Overview

Reinforcement learning treats trading as a sequential decision problem: at each bar the agent observes market state, picks an action (Buy / Sell / Hold), receives a reward based on P&L and drawdown, and updates its value estimates. No labelled examples are needed — the agent discovers profitable behaviour through trial and error.

**What you will build:**

- A Gym-compatible trading environment that wraps any price series
- A DQN agent with experience replay, Double DQN targets, and soft network updates
- A training loop with train / validation splitting and checkpoint saving
- An understanding of every design choice, from the Bellman equation to gradient clipping

---

## Curriculum

| # | Lesson | What you learn |
|---|--------|----------------|
| 1 | Markov Decision Processes | States, actions, transitions, rewards, episodes |
| 2 | Reward Design | Shaping rewards, drawdown penalty, transaction costs |
| 3 | Q-Learning | Tabular Q-tables, Bellman update, convergence |
| 4 | Deep Q-Networks | Function approximation with neural networks, instability problems |
| 5 | Exploration | ε-greedy schedule, optimism under uncertainty |
| 6 | The Trading Environment | Feature engineering, observation space, episode structure |
| 7 | Full System | Putting it all together: train, evaluate, interpret |

---

## Key Concepts

### Markov Decision Process (MDP)

A trading episode is modelled as an MDP `(S, A, P, R, γ)`:

- **S** — observation space (10 engineered market features)
- **A** — action space `{Hold, Buy, Sell}`
- **P** — transition dynamics (real price series, not modelled explicitly)
- **R** — reward signal (P&L minus drawdown penalty)
- **γ** — discount factor (how much future rewards are worth today)

### Bellman Equation

The optimal Q-function satisfies:

```
Q*(s, a) = E[ r + γ · max_{a'} Q*(s', a') ]
```

This recursive identity is the foundation of Q-learning: we bootstrap the current estimate from the next-state estimate.

### DQN Loss

The network is trained to minimise the mean squared Bellman error:

```
L(θ) = E[ ( r + γ · max_{a'} Q(s', a'; θ⁻) − Q(s, a; θ) )² ]
```

where `θ` are the online network parameters and `θ⁻` are the frozen target network parameters.

### Double DQN

Vanilla DQN overestimates Q-values because the same network both selects and evaluates the next action. Double DQN decouples these:

```
y = r + γ · Q(s', argmax_{a'} Q(s', a'; θ); θ⁻)
```

The online network (`θ`) selects the action; the target network (`θ⁻`) evaluates it.

### Experience Replay

Transitions `(s, a, r, s', done)` are stored in a circular buffer of capacity 50,000. Mini-batches are sampled uniformly at random, breaking the temporal correlation between consecutive samples that would otherwise destabilise training.

### Soft Target Update

Rather than copying weights every N steps (hard update), the target network is nudged toward the online network each step:

```
θ⁻ ← τ · θ + (1 − τ) · θ⁻       τ = 0.005
```

This provides a smoother, more stable learning signal.

### Reward Function

```
r(t) = pos × price_return − tc × |Δpos| − λ_dd × drawdown
```

| Term | Role |
|------|------|
| `pos × price_return` | Core P&L signal |
| `tc × |Δpos|` | Discourages overtrading (default tc = 0.1%) |
| `λ_dd × drawdown` | Penalises peak-to-trough loss (default λ = 0.5) |

---

## Quick Start

### 1. Install dependencies

```bash
pip install -r code/requirements.txt
```

Requires Python 3.9+. A CUDA-capable GPU is optional but will speed up training.

### 2. Run a quick sanity check

```bash
# Test the environment alone
python code/environment.py

# Test the agent alone (no market data needed)
python code/agent.py
```

### 3. Train the agent

```bash
# Default: BTC-USD, 730 days of daily bars, 500 episodes
python code/train.py

# Ethereum, more episodes, shorter episode length
python code/train.py --ticker ETH-USD --episodes 300 --ep-len 100

# US equities (SPY ETF), 5 years of data
python code/train.py --ticker SPY --period 1825d --episodes 500
```

### 4. Key CLI flags

```
--ticker      Yahoo Finance symbol          (default: BTC-USD)
--period      Data lookback e.g. 730d       (default: 730d)
--interval    Bar frequency: 1d, 1h         (default: 1d)
--episodes    Training episodes             (default: 500)
--ep-len      Bars per episode              (default: 100)
--eval-every  Evaluate every N episodes     (default: 50)
--lr          Adam learning rate            (default: 3e-4)
--gamma       Discount factor               (default: 0.99)
--tc          Transaction cost fraction     (default: 0.001)
--dd-lambda   Drawdown penalty weight       (default: 0.5)
```

---

## File Structure

```
rl-markets/
├── index.html              # Interactive tutorial (browser)
├── 01-mdp/                 # Lesson 1 assets
├── 02-rewards/             # Lesson 2 assets
├── 03-q-learning/          # Lesson 3 assets
├── 04-deep-q/              # Lesson 4 assets
├── 05-exploration/         # Lesson 5 assets
├── 06-environment/         # Lesson 6 assets
├── 07-full-system/         # Lesson 7 assets
└── code/
    ├── environment.py      # TradingEnv — Gym-compatible environment
    ├── agent.py            # DQNAgent — QNetwork, ReplayBuffer, training logic
    ├── train.py            # Training script with CLI interface
    └── requirements.txt    # Python dependencies
```

### `environment.py`

Implements `TradingEnv(gym.Env)` — the core simulation. Each `reset()` call picks a random starting bar from the price series. Each `step(action)` advances one bar, computes the 10-feature observation vector, and returns the shaped reward. The `make_env(ticker)` factory function downloads data and returns a ready environment.

**Observation features (10-dimensional):**

| Index | Name | Description |
|-------|------|-------------|
| 0 | `ret_1` | 1-bar percentage return |
| 1 | `ret_5` | 5-bar mean return |
| 2 | `ret_20` | 20-bar mean return |
| 3 | `vol_10` | 10-bar rolling volatility |
| 4 | `rsi` | RSI(14) normalised to [−1, +1] |
| 5 | `position` | Current position: −1, 0, or +1 |
| 6 | `upnl` | Unrealised P&L from entry price |
| 7 | `time_left` | Fraction of episode remaining |
| 8 | `drawdown` | Current drawdown from episode peak |
| 9 | `since_trade` | Bars since last position change (normalised) |

### `agent.py`

Implements `DQNAgent` — the learning algorithm. Contains:

- `QNetwork` — two-hidden-layer MLP with orthogonal weight initialisation
- `ReplayBuffer` — circular deque with uniform random sampling
- `DQNAgent` — ε-greedy action selection, Double DQN loss, soft target updates, Huber loss, gradient clipping, save/load

### `train.py`

Orchestrates data download, train/val split, the episode loop, periodic evaluation, and checkpoint saving. The best checkpoint (by mean validation reward) is saved to `best_dqn_<ticker>.pt`.

---

## Key Formulas

### Q-Learning Update (tabular)

```
Q(s, a) ← Q(s, a) + α · [ r + γ · max_{a'} Q(s', a') − Q(s, a) ]
```

### DQN Loss (implemented)

```
L = HuberLoss( Q(s,a; θ),  r + γ · Q(s', argmax Q(s',·; θ); θ⁻) )
```

Huber loss is used instead of MSE to reduce sensitivity to outlier rewards.

### Soft Target Update (implemented)

```
θ⁻ ← τ · θ + (1 − τ) · θ⁻
```

### ε-Greedy Decay (implemented)

```
ε(t) = ε_end + (ε_start − ε_end) · exp(−t / decay)
```

### Reward (implemented)

```
r(t) = pos · Δp/p  −  tc · |Δpos|  −  λ · drawdown(t)
```

---

## Typical Results

Training 500 episodes on BTC-USD daily data (approximately 730 bars) with default hyperparameters:

| Metric | Typical range |
|--------|---------------|
| Episodes to meaningful policy | 100–200 |
| Validation win rate (portfolio > 1.0) | 50–65% |
| Mean validation portfolio | 1.00–1.08 |
| Final ε | ~0.05 (fully decayed) |

Results vary significantly with market regime. The agent tends to learn a position-reverting strategy in ranging markets and a trend-following strategy in trending markets. Do not overinterpret short training runs — use the validation split to assess generalisation.

**Note:** Past performance of a trained agent does not predict future returns. Markets are non-stationary; a policy that worked in the training window may not generalise.

---

## References

1. **Mnih et al. (2015).** "Human-level control through deep reinforcement learning." *Nature* 518, 529–533. [https://doi.org/10.1038/nature14236](https://doi.org/10.1038/nature14236)
   — Original DQN paper. Introduces experience replay and the target network.

2. **van Hasselt, Guez & Silver (2016).** "Deep Reinforcement Learning with Double Q-Learning." *AAAI 2016.* [https://arxiv.org/abs/1509.06461](https://arxiv.org/abs/1509.06461)
   — Proposes Double DQN to address Q-value overestimation.

3. **Sutton & Barto (2018).** *Reinforcement Learning: An Introduction* (2nd ed.). MIT Press. [http://incompleteideas.net/book/the-book-2nd.html](http://incompleteideas.net/book/the-book-2nd.html)
   — Definitive textbook. Chapters 6–10 cover TD learning and function approximation.

4. **Gymnasium documentation.** [https://gymnasium.farama.org](https://gymnasium.farama.org)
   — API reference for the Env interface used by TradingEnv.

5. **yfinance.** [https://github.com/ranaroussi/yfinance](https://github.com/ranaroussi/yfinance)
   — Yahoo Finance data downloader used for price series.

---

## Disclaimer

This code is provided for **educational purposes only**. It is not financial advice. The agent trained here has no knowledge of fundamentals, news, order book dynamics, or market microstructure. Do not deploy it with real capital. Trading financial instruments involves substantial risk of loss.
