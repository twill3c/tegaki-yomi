import { describe, expect, it } from "vitest";
import {
  centerOfMass,
  preprocess,
  resample,
} from "@/core/preprocess";

// T-020 / T-021 / T-022 / T-023(F-04 / G-04 / N-05)

describe("preprocess", () => {
  // T-020: 質量中心の手計算
  it("centerOfMass が手計算と一致する", () => {
    // 4×6 画像: (x=2,y=3) に強度 1、(x=1,y=5) に強度 3
    // com_x = (2·1 + 1·3) / 4 = 1.25、com_y = (3·1 + 5·3) / 4 = 4.5
    const src = new Array(4 * 6).fill(0);
    src[3 * 4 + 2] = 1;
    src[5 * 4 + 1] = 3;
    const com = centerOfMass(src, 4, 6)!;
    expect(com.x).toBeCloseTo(1.25, 12);
    expect(com.y).toBeCloseTo(4.5, 12);
    expect(centerOfMass(new Array(24).fill(0), 4, 6)).toBeNull();
  });

  // T-021: 面積平均の縮小の手計算
  it("resample(面積平均)が手計算と一致する", () => {
    // 2×2 [[0,1],[2,3]] → 1×1 は全平均 1.5
    expect(resample([0, 1, 2, 3], 2, 2, 1, 1)[0]).toBeCloseTo(1.5, 12);
    // 4×1 [0,1,2,3] → 2×1 は [0.5, 2.5]
    const r = resample([0, 1, 2, 3], 4, 1, 2, 1);
    expect(r[0]).toBeCloseTo(0.5, 12);
    expect(r[1]).toBeCloseTo(2.5, 12);
    // 恒等(同サイズ)は不変
    expect(resample([5, 7], 2, 1, 2, 1)).toEqual([5, 7]);
  });

  // T-022: 縁の仕様(空・1 点)
  it("空入力は null・1 点入力は有効な 28×28 に配置される", () => {
    expect(preprocess(new Array(100 * 100).fill(0), 100, 100)).toBeNull();
    const dot = new Array(100 * 100).fill(0);
    dot[50 * 100 + 50] = 1;
    const out = preprocess(dot, 100, 100)!;
    expect(out.length).toBe(784);
    const sum = out.reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThan(0);
    for (const v of out) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  // T-021 続き: 縦横比保存(縦長ストローク)
  it("縦長ストロークは縦 20px に縮み、横は細いまま(縦横比保存)", () => {
    // 200×200 キャンバスに 4 wide × 160 tall の縦棒
    const w = 200;
    const src = new Array(w * 200).fill(0);
    for (let y = 20; y < 180; y++) {
      for (let x = 98; x < 102; x++) src[y * w + x] = 1;
    }
    const out = preprocess(src, w, 200)!;
    // 28×28 中でインクのある行数 = 20(長辺)、列数は 1〜3 程度(4·20/160 = 0.5 → 最低 1)
    const rows = new Set<number>();
    const cols = new Set<number>();
    for (let i = 0; i < 784; i++) {
      if (out[i] > 0.01) {
        rows.add(Math.floor(i / 28));
        cols.add(i % 28);
      }
    }
    expect(rows.size).toBe(20);
    expect(cols.size).toBeLessThanOrEqual(3);
  });

  // T-023: 実寸入力の値域
  it("280×280 の塗り入力で出力が 784 要素・[0,1]・インクあり", () => {
    const w = 280;
    const src = new Array(w * w).fill(0);
    for (let y = 60; y < 220; y++) {
      for (let x = 120; x < 160; x++) src[y * w + x] = 0.8;
    }
    const out = preprocess(src, w, w)!;
    expect(out.length).toBe(784);
    expect(out.some((v) => v > 0.1)).toBe(true);
    for (const v of out) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
