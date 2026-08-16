import { describe, expect, it } from "vitest";
import { FIXTURES, MODEL, forward } from "@/core/model";
import { b64ToBytes } from "@/core/b64";

// T-100 / T-101 / T-102(G-01 / G-02 / G-03): 二実装照合オラクル
// Python(training/train_mnist.py)が丸め済み重みで再計算した値と TS 推論を照合する

function relErr(a: number, b: number): number {
  return Math.abs(a - b) / Math.max(1e-12, Math.abs(a) + Math.abs(b));
}

describe("二実装照合", () => {
  // T-100 / G-01: ロジット照合
  it("G-01: フィクスチャ 20 件のロジットが Python 再計算値と相対誤差 < 1e-9", () => {
    expect(FIXTURES.samples.length).toBe(20);
    for (const s of FIXTURES.samples) {
      const bytes = b64ToBytes(s.pixels);
      expect(bytes.length).toBe(784);
      const input = Array.from(bytes, (v) => v / 255);
      const { logits } = forward(MODEL, input);
      for (let i = 0; i < 10; i++) {
        expect(relErr(logits[i], s.logits[i])).toBeLessThan(1e-9);
      }
    }
  });

  // T-101 / G-02: 精度照合(500 件)
  it("G-02: 同梱テスト 500 件の正解数が Python 記録値と一致し、精度 ≥ 96%", () => {
    const images = b64ToBytes(FIXTURES.testSubset.images);
    const labels = FIXTURES.testSubset.labels;
    expect(labels.length).toBe(500);
    expect(images.length).toBe(500 * 784);
    let correct = 0;
    for (let i = 0; i < 500; i++) {
      const input = new Array<number>(784);
      for (let j = 0; j < 784; j++) input[j] = images[i * 784 + j] / 255;
      if (forward(MODEL, input).pred === labels[i]) correct++;
    }
    expect(correct).toBe(FIXTURES.testSubset.correctCount);
    expect(correct / 500).toBeGreaterThanOrEqual(0.96);
  });

  // T-102 / G-03: 全 10,000 件精度のメタ記録
  it("G-03: Python 側の全テスト精度 ≥ 97% が記録されている", () => {
    expect(MODEL.meta.testAccuracy10000).toBeGreaterThanOrEqual(0.97);
    expect(MODEL.meta.arch).toEqual([784, 128, 10]);
  });
});
