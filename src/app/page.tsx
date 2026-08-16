"use client";

import { useCallback, useState } from "react";
import { DrawCanvas, type SampleRequest } from "@/components/DrawCanvas";
import { HiddenViz } from "@/components/HiddenViz";
import { ResultPanel } from "@/components/ResultPanel";
import { b64ToBytes } from "@/core/b64";
import { FIXTURES, MODEL, forward, type ForwardResult } from "@/core/model";
import { preprocess } from "@/core/preprocess";

const CANVAS = 280;

export default function Home() {
  const [processed, setProcessed] = useState<number[] | null>(null);
  const [result, setResult] = useState<ForwardResult | null>(null);
  const [sample, setSample] = useState<SampleRequest | null>(null);
  const [truth, setTruth] = useState<number | null>(null);
  const [sampleIdx, setSampleIdx] = useState(0);

  const recognize = useCallback((gray: number[] | null) => {
    if (gray === null) {
      setProcessed(null);
      setResult(null);
      return;
    }
    const input = preprocess(gray, CANVAS, CANVAS);
    if (input === null) {
      setProcessed(null);
      setResult(null);
      return;
    }
    setProcessed(input);
    setResult(forward(MODEL, input));
  }, []);

  const loadSample = useCallback(() => {
    const images = b64ToBytes(FIXTURES.testSubset.images);
    const idx = sampleIdx % FIXTURES.testSubset.labels.length;
    setSampleIdx((i) => i + 1);
    setTruth(FIXTURES.testSubset.labels[idx]);
    setSample({
      seq: sampleIdx + 1,
      pixels: images.slice(idx * 784, (idx + 1) * 784),
    });
  }, [sampleIdx]);

  return (
    <main className="app">
      <header className="header">
        <h1>tegaki-yomi</h1>
        <p className="subtitle">
          描いた数字を、MNIST で鍛えたニューラルネットがその場で読む(精度{" "}
          {(MODEL.meta.testAccuracy10000 * 100).toFixed(1)}%)
        </p>
      </header>

      <div className="layout">
        <section className="board">
          <DrawCanvas
            sample={sample}
            onInk={(gray) => {
              if (sample === null) setTruth(null);
              setSample(null);
              recognize(gray);
            }}
          />
          <div className="control-row">
            <button type="button" onClick={loadSample}>
              お手本を読み込む(MNIST テスト画像)
            </button>
          </div>
        </section>

        <aside className="panel">
          <ResultPanel processed={processed} result={result} truth={truth} />
        </aside>
      </div>

      <section className="panel">
        <HiddenViz model={MODEL} result={result} />
      </section>
    </main>
  );
}
