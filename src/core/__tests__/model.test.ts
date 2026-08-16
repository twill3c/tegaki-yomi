import { describe, expect, it } from "vitest";
import { MODEL, forward, softmax } from "@/core/model";

// T-001 / T-010 / T-011(F-03 / G-05)

describe("model", () => {
  // T-001: 重み JSON の形状と有限性
  it("重みの形状が 784→128→10 で全て有限値", () => {
    expect(MODEL.w1.length).toBe(128);
    expect(MODEL.w1[0].length).toBe(784);
    expect(MODEL.b1.length).toBe(128);
    expect(MODEL.w2.length).toBe(10);
    expect(MODEL.w2[0].length).toBe(128);
    expect(MODEL.b2.length).toBe(10);
    for (const row of MODEL.w1) {
      for (const v of row) expect(Number.isFinite(v)).toBe(true);
    }
    for (const row of MODEL.w2) {
      for (const v of row) expect(Number.isFinite(v)).toBe(true);
    }
  });

  // T-010: softmax の性質
  it("softmax は総和 1・単調・大入力でも有限", () => {
    const p = softmax([1, 2, 3]);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(p[2]).toBeGreaterThan(p[1]);
    expect(p[1]).toBeGreaterThan(p[0]);
    const big = softmax([1000, 999, -1000]);
    for (const v of big) expect(Number.isFinite(v)).toBe(true);
    expect(big[0]).toBeGreaterThan(big[1]);
  });

  // T-011: forward の決定論
  it("forward は同一入力で深い等値・logits は 10 要素", () => {
    const input = new Array(784).fill(0).map((_, i) => (i % 7) / 7);
    const a = forward(MODEL, input);
    const b = forward(MODEL, input);
    expect(a).toEqual(b);
    expect(a.logits.length).toBe(10);
    expect(a.probs.length).toBe(10);
    expect(a.pred).toBeGreaterThanOrEqual(0);
    expect(a.pred).toBeLessThanOrEqual(9);
  });
});
