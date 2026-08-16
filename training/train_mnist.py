# train_mnist.py — MNIST MLP(784→128→10)の学習とモデル資産の生成(F-01 / F-02)
#
# 二実装照合の契約(TEST_SPEC 実行規約):
#   フィクスチャのロジット・精度・メタの全数精度は、丸め済み重みを「読み戻して」計算する。
#   丸め前の重みで計算すると TS 側(丸め済み JSON を読む)と照合できない。
#
# 使い方:
#   python training/train_mnist.py --data training/data --out src/core/model
#
# 依存: numpy のみ。シード固定・全 float64。

import argparse
import base64
import gzip
import json
import struct
from pathlib import Path

import numpy as np

SEED = 1
HIDDEN = 128
EPOCHS = 12
MOMENTUM = 0.9
BATCH = 128
LR = 0.1
ROUND_DECIMALS = 7
N_FIXTURES = 20
N_SUBSET = 500


def load_idx_images(path: Path) -> np.ndarray:
    with gzip.open(path, "rb") as f:
        magic, n, rows, cols = struct.unpack(">IIII", f.read(16))
        assert magic == 2051, f"images magic mismatch: {magic}"
        data = np.frombuffer(f.read(), dtype=np.uint8)
    return data.reshape(n, rows * cols)


def load_idx_labels(path: Path) -> np.ndarray:
    with gzip.open(path, "rb") as f:
        magic, n = struct.unpack(">II", f.read(8))
        assert magic == 2049, f"labels magic mismatch: {magic}"
        return np.frombuffer(f.read(), dtype=np.uint8)


def forward(w1, b1, w2, b2, x):
    """x: (n, 784) float64 → logits (n, 10)。TS 実装と同じ数式(ReLU・線形)"""
    h = np.maximum(x @ w1.T + b1, 0.0)
    return h @ w2.T + b2


def accuracy(w1, b1, w2, b2, x, y):
    pred = forward(w1, b1, w2, b2, x).argmax(axis=1)
    return float((pred == y).mean()), pred


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="training/data")
    ap.add_argument("--out", default="src/core/model")
    args = ap.parse_args()
    data = Path(args.data)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    x_train = load_idx_images(data / "train-images.gz").astype(np.float64) / 255.0
    y_train = load_idx_labels(data / "train-labels.gz").astype(np.int64)
    x_test = load_idx_images(data / "t10k-images.gz").astype(np.float64) / 255.0
    y_test = load_idx_labels(data / "t10k-labels.gz").astype(np.int64)
    n = x_train.shape[0]
    print(f"train {n} / test {x_test.shape[0]}")

    rng = np.random.default_rng(SEED)
    w1 = rng.normal(0, np.sqrt(2.0 / 784), size=(HIDDEN, 784))
    b1 = np.zeros(HIDDEN)
    w2 = rng.normal(0, np.sqrt(2.0 / HIDDEN), size=(10, HIDDEN))
    b2 = np.zeros(10)
    vw1 = np.zeros_like(w1)
    vb1 = np.zeros_like(b1)
    vw2 = np.zeros_like(w2)
    vb2 = np.zeros_like(b2)

    onehot = np.eye(10)[y_train]
    for epoch in range(EPOCHS):
        perm = rng.permutation(n)
        for i in range(0, n, BATCH):
            idx = perm[i : i + BATCH]
            x = x_train[idx]
            t = onehot[idx]
            m = len(idx)
            # forward
            z1 = x @ w1.T + b1
            h = np.maximum(z1, 0.0)
            logits = h @ w2.T + b2
            logits -= logits.max(axis=1, keepdims=True)
            e = np.exp(logits)
            p = e / e.sum(axis=1, keepdims=True)
            # backward(交差エントロピー + softmax)
            d2 = (p - t) / m
            gw2 = d2.T @ h
            gb2 = d2.sum(axis=0)
            dh = d2 @ w2
            dz1 = dh * (z1 > 0)
            gw1 = dz1.T @ x
            gb1 = dz1.sum(axis=0)
            vw2 = MOMENTUM * vw2 - LR * gw2
            vb2 = MOMENTUM * vb2 - LR * gb2
            vw1 = MOMENTUM * vw1 - LR * gw1
            vb1 = MOMENTUM * vb1 - LR * gb1
            w2 += vw2
            b2 += vb2
            w1 += vw1
            b1 += vb1
        acc, _ = accuracy(w1, b1, w2, b2, x_test, y_test)
        print(f"epoch {epoch + 1}/{EPOCHS}: test acc {acc:.4f}")

    # ---- 丸め → 読み戻し(照合の正はここから先の値のみ)----
    w1r = np.round(w1, ROUND_DECIMALS)
    b1r = np.round(b1, ROUND_DECIMALS)
    w2r = np.round(w2, ROUND_DECIMALS)
    b2r = np.round(b2, ROUND_DECIMALS)

    acc_r, _ = accuracy(w1r, b1r, w2r, b2r, x_test, y_test)
    print(f"rounded weights: test acc {acc_r:.4f}")

    # フィクスチャ 20 件(各クラス 2 件ずつ)
    fixture_idx: list[int] = []
    for digit in range(10):
        fixture_idx.extend(np.where(y_test == digit)[0][:2].tolist())
    samples = []
    for i in fixture_idx[:N_FIXTURES]:
        raw = (x_test[i] * 255.0).round().astype(np.uint8)
        logits = forward(w1r, b1r, w2r, b2r, (raw.astype(np.float64) / 255.0)[None, :])[0]
        samples.append(
            {
                "pixels": base64.b64encode(raw.tobytes()).decode(),
                "label": int(y_test[i]),
                "logits": [float(v) for v in logits],
            }
        )

    # テスト部分集合 500 件(先頭 500)
    sub_raw = (x_test[:N_SUBSET] * 255.0).round().astype(np.uint8)
    sub_x = sub_raw.astype(np.float64) / 255.0
    sub_pred = forward(w1r, b1r, w2r, b2r, sub_x).argmax(axis=1)
    correct = int((sub_pred == y_test[:N_SUBSET]).sum())
    print(f"subset 500: correct {correct}")

    weights = {
        "meta": {
            "arch": [784, HIDDEN, 10],
            "seed": SEED,
            "epochs": EPOCHS,
            "testAccuracy10000": acc_r,
            "roundDecimals": ROUND_DECIMALS,
        },
        "w1": w1r.tolist(),
        "b1": b1r.tolist(),
        "w2": w2r.tolist(),
        "b2": b2r.tolist(),
    }
    fixtures = {
        "samples": samples,
        "testSubset": {
            "images": base64.b64encode(sub_raw.tobytes()).decode(),
            "labels": y_test[:N_SUBSET].tolist(),
            "correctCount": correct,
        },
    }
    (out / "weights.json").write_text(json.dumps(weights), encoding="utf-8")
    (out / "fixtures.json").write_text(json.dumps(fixtures), encoding="utf-8")
    print(f"wrote {out}/weights.json ({(out / 'weights.json').stat().st_size // 1024} KB)")
    print(f"wrote {out}/fixtures.json ({(out / 'fixtures.json').stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
