"""
agent.py — DQN agent with experience replay and Double DQN target.

Architecture:
    QNetwork: Linear(obs_dim→256) → ReLU → Linear(256→128) → ReLU → Linear(128→n_actions)

Training tricks:
    - Experience replay (deque buffer, random mini-batch sampling)
    - Double DQN: online network selects action, target network evaluates it
    - Soft target update: θ⁻ ← τ·θ + (1−τ)·θ⁻  (avoids hard copy instability)
    - Gradient clipping: max norm 1.0

Usage:
    agent = DQNAgent(obs_dim=10, n_actions=3)
    agent.push(obs, action, reward, next_obs, done)
    loss = agent.learn()
    action = agent.act(obs)
    agent.save('checkpoint.pt')
    agent.load('checkpoint.pt')
"""

import random
import warnings
from collections import deque
from pathlib import Path
from typing import Optional

import numpy as np
import torch
import torch.nn as nn

warnings.filterwarnings("ignore")

# ── Network ───────────────────────────────────────────────────────────────────

class QNetwork(nn.Module):
    """
    Two-hidden-layer MLP approximating Q(s,a) for all actions simultaneously.

    Parameters
    ----------
    obs_dim   : dimension of the observation vector
    n_actions : number of discrete actions
    hidden    : width of the two hidden layers
    """

    def __init__(self, obs_dim: int = 10, n_actions: int = 3, hidden: int = 256):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(obs_dim, hidden),
            nn.ReLU(),
            nn.Linear(hidden, hidden // 2),
            nn.ReLU(),
            nn.Linear(hidden // 2, n_actions),
        )
        self._init_weights()

    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.orthogonal_(m.weight, gain=np.sqrt(2))
                nn.init.zeros_(m.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


# ── Replay buffer ─────────────────────────────────────────────────────────────

class ReplayBuffer:
    """
    Fixed-capacity circular replay buffer. Stores (s, a, r, s', done) tuples
    and returns uniformly sampled mini-batches as tensors.
    """

    def __init__(self, capacity: int = 50_000):
        self._buf = deque(maxlen=capacity)

    def push(self, s, a: int, r: float, s2, done: bool):
        self._buf.append((
            np.asarray(s,  dtype=np.float32),
            int(a),
            float(r),
            np.asarray(s2, dtype=np.float32),
            float(done),
        ))

    def sample(self, batch_size: int):
        batch = random.sample(self._buf, batch_size)
        s, a, r, s2, d = zip(*batch)
        return (
            torch.FloatTensor(np.stack(s)),
            torch.LongTensor(a),
            torch.FloatTensor(r),
            torch.FloatTensor(np.stack(s2)),
            torch.FloatTensor(d),
        )

    def __len__(self) -> int:
        return len(self._buf)


# ── Agent ─────────────────────────────────────────────────────────────────────

class DQNAgent:
    """
    DQN agent using Double DQN and soft target-network updates.

    Parameters
    ----------
    obs_dim       : observation dimension
    n_actions     : number of discrete actions
    lr            : Adam learning rate
    gamma         : discount factor
    eps_start     : initial ε (exploration probability)
    eps_end       : final ε
    eps_decay     : number of steps to decay from eps_start to eps_end
    batch_size    : mini-batch size for each gradient step
    tau           : soft update coefficient (target ← τ·online + (1−τ)·target)
    buffer_size   : replay buffer capacity
    """

    def __init__(
        self,
        obs_dim:    int   = 10,
        n_actions:  int   = 3,
        lr:         float = 3e-4,
        gamma:      float = 0.99,
        eps_start:  float = 1.0,
        eps_end:    float = 0.05,
        eps_decay:  int   = 3_000,
        batch_size: int   = 64,
        tau:        float = 0.005,
        buffer_size:int   = 50_000,
    ):
        self.n_actions  = n_actions
        self.gamma      = gamma
        self.batch_size = batch_size
        self.tau        = tau
        self.eps_start  = eps_start
        self.eps_end    = eps_end
        self.eps_decay  = eps_decay
        self.steps_done = 0

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        self.q_net = QNetwork(obs_dim, n_actions).to(self.device)
        self.q_tgt = QNetwork(obs_dim, n_actions).to(self.device)
        self.q_tgt.load_state_dict(self.q_net.state_dict())
        self.q_tgt.eval()

        self.optimizer = torch.optim.Adam(self.q_net.parameters(), lr=lr)
        self.buffer    = ReplayBuffer(buffer_size)

        print(f"[agent] DQN on {self.device} | "
              f"obs_dim={obs_dim}  n_actions={n_actions}  "
              f"params={sum(p.numel() for p in self.q_net.parameters()):,}")

    # ── Properties ────────────────────────────────────────────────────────────

    @property
    def epsilon(self) -> float:
        return self.eps_end + (self.eps_start - self.eps_end) * np.exp(
            -self.steps_done / self.eps_decay
        )

    # ── Core API ──────────────────────────────────────────────────────────────

    def act(self, obs, greedy: bool = False) -> int:
        """ε-greedy action selection. If greedy=True, always exploit."""
        eps = 0.0 if greedy else self.epsilon
        if random.random() < eps:
            return random.randrange(self.n_actions)
        obs_t = torch.FloatTensor(obs).unsqueeze(0).to(self.device)
        with torch.no_grad():
            return self.q_net(obs_t).argmax(dim=1).item()

    def push(self, s, a: int, r: float, s2, done: bool):
        """Store a single transition in the replay buffer."""
        self.buffer.push(s, a, r, s2, done)

    def learn(self) -> Optional[float]:
        """
        Sample a mini-batch, compute Double-DQN loss, gradient step.
        Returns loss value or None if buffer is too small.
        """
        if len(self.buffer) < self.batch_size:
            return None

        s, a, r, s2, d = [x.to(self.device) for x in self.buffer.sample(self.batch_size)]

        with torch.no_grad():
            # Double DQN: online selects action, target evaluates
            next_actions = self.q_net(s2).argmax(dim=1, keepdim=True)
            q_next = self.q_tgt(s2).gather(1, next_actions).squeeze(1)
            q_target = r + self.gamma * q_next * (1.0 - d)

        q_pred = self.q_net(s).gather(1, a.unsqueeze(1)).squeeze(1)
        loss   = nn.HuberLoss()(q_pred, q_target)

        self.optimizer.zero_grad()
        loss.backward()
        nn.utils.clip_grad_norm_(self.q_net.parameters(), max_norm=1.0)
        self.optimizer.step()

        # Soft target update
        for p_online, p_target in zip(self.q_net.parameters(), self.q_tgt.parameters()):
            p_target.data.copy_(self.tau * p_online.data + (1.0 - self.tau) * p_target.data)

        self.steps_done += 1
        return loss.item()

    # ── Persistence ───────────────────────────────────────────────────────────

    def save(self, path: str):
        torch.save({
            "q_net":      self.q_net.state_dict(),
            "q_tgt":      self.q_tgt.state_dict(),
            "optimizer":  self.optimizer.state_dict(),
            "steps_done": self.steps_done,
        }, path)
        print(f"[agent] Saved → {path}")

    def load(self, path: str):
        ckpt = torch.load(path, map_location=self.device)
        self.q_net.load_state_dict(ckpt["q_net"])
        self.q_tgt.load_state_dict(ckpt["q_tgt"])
        self.optimizer.load_state_dict(ckpt["optimizer"])
        self.steps_done = ckpt.get("steps_done", 0)
        print(f"[agent] Loaded ← {path}  (step {self.steps_done:,})")


# ── CLI test ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Testing DQNAgent …")
    agent = DQNAgent()
    obs = np.zeros(10, dtype=np.float32)
    for i in range(200):
        a  = agent.act(obs)
        r  = float(np.random.randn())
        o2 = np.random.randn(10).astype(np.float32)
        agent.push(obs, a, r, o2, False)
        loss = agent.learn()
        obs  = o2
    print(f"Test complete  |  ε={agent.epsilon:.3f}  |  last_loss={loss:.4f}")
