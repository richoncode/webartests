"""PatchTST-style Transformer for financial time series forecasting.

Architecture:
    1. Split input lookback window into overlapping patches.
    2. Linear-project each patch to d_model dimensions.
    3. Add learnable positional encodings.
    4. Pass through TransformerEncoder stack.
    5. Flatten and project to forecast horizon.

Usage:
    from transformer_model import TSTransformer, make_sequences, evaluate_model
"""

import math
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset


class PatchEmbedding(nn.Module):
    """Split a 1D series into overlapping patches and linearly embed each one.

    Args:
        patch_len: Number of time steps per patch.
        stride: Step between patches (overlap = patch_len - stride).
        d_model: Output embedding dimension.
    """

    def __init__(self, patch_len: int, stride: int, d_model: int):
        super().__init__()
        self.patch_len = patch_len
        self.stride = stride
        self.proj = nn.Linear(patch_len, d_model)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (batch, seq_len)
        patches = x.unfold(1, self.patch_len, self.stride)  # (B, n_patches, patch_len)
        return self.proj(patches)  # (B, n_patches, d_model)


class TSTransformer(nn.Module):
    """PatchTST-style Transformer for univariate time series forecasting.

    Args:
        lookback: Input sequence length in bars.
        forecast_horizon: Number of steps ahead to predict.
        patch_len: Patch size in bars.
        stride: Stride between patches.
        d_model: Transformer embedding dimension.
        n_heads: Number of attention heads (must divide d_model).
        n_layers: Number of TransformerEncoder layers.
        dropout: Dropout probability.
    """

    def __init__(
        self,
        lookback: int = 96,
        forecast_horizon: int = 1,
        patch_len: int = 16,
        stride: int = 8,
        d_model: int = 128,
        n_heads: int = 4,
        n_layers: int = 3,
        dropout: float = 0.1,
    ):
        super().__init__()
        self.patch_emb = PatchEmbedding(patch_len, stride, d_model)
        n_patches = (lookback - patch_len) // stride + 2
        # Learnable positional encoding (small random init)
        self.pos_enc = nn.Parameter(torch.randn(1, n_patches, d_model) * 0.02)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=n_heads,
            dim_feedforward=d_model * 4,
            dropout=dropout,
            batch_first=True,
            norm_first=True,  # pre-norm for stability
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=n_layers)
        self.norm = nn.LayerNorm(d_model)
        self.head = nn.Sequential(
            nn.Flatten(),
            nn.Dropout(dropout),
            nn.Linear(n_patches * d_model, forecast_horizon),
        )
        self._init_weights()

    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.orthogonal_(m.weight)
                if m.bias is not None:
                    nn.init.zeros_(m.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (batch, lookback)
        z = self.patch_emb(x) + self.pos_enc
        z = self.encoder(z)
        z = self.norm(z)
        return self.head(z)  # (batch, forecast_horizon)


def make_sequences(
    returns: np.ndarray,
    lookback: int,
    horizon: int,
    step: int = 1,
) -> tuple:
    """Slide a window over a return series to produce (X, y) arrays.

    Args:
        returns: 1D array of log-returns.
        lookback: Input window length.
        horizon: Forecast horizon.
        step: Stride between consecutive windows (1 = maximum overlap).

    Returns:
        Tuple (X, y) of float32 numpy arrays with shapes
        (n_samples, lookback) and (n_samples, horizon).
    """
    X, y = [], []
    for i in range(0, len(returns) - lookback - horizon + 1, step):
        X.append(returns[i:i + lookback])
        y.append(returns[i + lookback:i + lookback + horizon])
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)


def normalise_sequences(
    X_train: np.ndarray,
    X_val: np.ndarray | None = None,
) -> tuple:
    """Z-score normalise using training statistics.

    Args:
        X_train: Training input array (n_train, lookback).
        X_val: Optional validation input array.

    Returns:
        (X_train_norm, X_val_norm, mean, std) — val is None if not provided.
    """
    mean = X_train.mean()
    std = X_train.std() + 1e-8
    X_train_norm = (X_train - mean) / std
    X_val_norm = (X_val - mean) / std if X_val is not None else None
    return X_train_norm, X_val_norm, mean, std


def evaluate_model(
    model: nn.Module,
    X: np.ndarray,
    y: np.ndarray,
) -> dict:
    """Compute MAE, RMSE, and directional accuracy on a dataset.

    Args:
        model: Trained TSTransformer.
        X: Input array (n_samples, lookback).
        y: Target array (n_samples, horizon).

    Returns:
        Dict with keys mae, rmse, dir_acc.
    """
    model.eval()
    with torch.no_grad():
        pred = model(torch.tensor(X)).numpy()
    mae = float(np.mean(np.abs(y - pred)))
    rmse = float(np.sqrt(np.mean((y - pred) ** 2)))
    dir_acc = float(np.mean(np.sign(y) == np.sign(pred)))
    return {'mae': mae, 'rmse': rmse, 'dir_acc': dir_acc}
