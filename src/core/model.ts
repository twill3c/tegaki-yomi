// TS 推論(F-03)。Python(training/train_mnist.py)が生成した丸め済み重みを読む。
// 数式は Python 側 forward と同一: h = ReLU(W1·x + b1)、logits = W2·h + b2。

import weightsJson from "./model/weights.json";
import fixturesJson from "./model/fixtures.json";

export interface ModelMeta {
  arch: number[];
  seed: number;
  epochs: number;
  testAccuracy10000: number;
  roundDecimals: number;
}

export interface Model {
  meta: ModelMeta;
  w1: number[][];
  b1: number[];
  w2: number[][];
  b2: number[];
}

export interface FixtureSample {
  pixels: string;
  label: number;
  logits: number[];
}

export interface Fixtures {
  samples: FixtureSample[];
  testSubset: {
    images: string;
    labels: number[];
    correctCount: number;
  };
}

export const MODEL: Model = weightsJson as Model;
export const FIXTURES: Fixtures = fixturesJson as Fixtures;

/** softmax(最大値シフトで大入力でも有限) */
export function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / sum);
}

export interface ForwardResult {
  logits: number[];
  probs: number[];
  pred: number;
  /** 隠れ層の活性(可視化 F-07 用) */
  hidden: number[];
}

/** 順伝播(純関数・決定論)。input は 784 要素・[0,1] */
export function forward(model: Model, input: number[]): ForwardResult {
  const hidden: number[] = new Array(model.b1.length);
  for (let j = 0; j < model.w1.length; j++) {
    let z = model.b1[j];
    const row = model.w1[j];
    for (let i = 0; i < row.length; i++) z += row[i] * input[i];
    hidden[j] = z > 0 ? z : 0;
  }
  const logits: number[] = new Array(model.b2.length);
  for (let k = 0; k < model.w2.length; k++) {
    let z = model.b2[k];
    const row = model.w2[k];
    for (let j = 0; j < row.length; j++) z += row[j] * hidden[j];
    logits[k] = z;
  }
  const probs = softmax(logits);
  let pred = 0;
  for (let k = 1; k < probs.length; k++) {
    if (probs[k] > probs[pred]) pred = k;
  }
  return { logits, probs, pred, hidden };
}
