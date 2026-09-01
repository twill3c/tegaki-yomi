"use client";

import { useCallback, useState } from "react";
import { DrawCanvas, type SampleRequest } from "@/components/DrawCanvas";
import { HiddenViz } from "@/components/HiddenViz";
import { ResultPanel } from "@/components/ResultPanel";
import { b64ToBytes } from "@/core/b64";
import { FIXTURES, MODEL, forward, type ForwardResult } from "@/core/model";
import { preprocess } from "@/core/preprocess";
import { FOOTER_LINKS } from "@/lib/links";

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

      <p className="attr">
        お手本と学習データは MNIST database of handwritten digits(Yann LeCun,
        Corinna Cortes, Christopher J.C. Burges)。同梱している 520 枚の画像は
        CC BY-SA 3.0 を前提に扱う(配布元により表示が割れているため厳しい方に寄せた —{" "}
        <a
          href="https://github.com/twill3c/tegaki-yomi/blob/main/NOTICE"
          target="_blank"
          rel="noreferrer"
        >
          NOTICE
        </a>
        )。前処理・推論・可視化のコードは MIT。
      </p>

      <footer className="footer">
        {FOOTER_LINKS.map((l, i) => (
          <span key={l.href}>
            {i > 0 && " ・ "}
            <a href={l.href} target="_blank" rel="noreferrer">
              {l.label}
            </a>
            {l.label === "MIT License" && " © 2026 坂田哲朗"}
          </span>
        ))}
      </footer>
    </main>
  );
}
