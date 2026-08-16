"use client";

// 結果表示(F-06)。0〜9 の確率バー・大きな判定数字・モデルが見た 28×28。

import { useEffect, useRef } from "react";
import type { ForwardResult } from "@/core/model";

export function ResultPanel({
  processed,
  result,
  truth,
}: {
  processed: number[] | null;
  result: ForwardResult | null;
  /** お手本モードの正解ラベル(手書きは null) */
  truth: number | null;
}) {
  const previewRef = useRef<HTMLCanvasElement>(null);

  // モデルが見た 28×28 のプレビュー
  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(28, 28);
    for (let i = 0; i < 784; i++) {
      const v = processed ? Math.round(processed[i] * 255) : 0;
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = v;
      img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [processed]);

  return (
    <div className="result">
      <div className="verdict-row">
        <div className="verdict">
          <span className="verdict-label">よみ</span>
          <span className="verdict-digit">
            {result ? result.pred : "?"}
          </span>
          {result && (
            <span className="verdict-conf">
              {(result.probs[result.pred] * 100).toFixed(1)}%
            </span>
          )}
        </div>
        <div className="preview">
          <span className="preview-label">モデルが見た 28×28</span>
          <canvas
            ref={previewRef}
            width={28}
            height={28}
            role="img"
            aria-label="前処理後の 28×28 入力"
            style={{ width: 84, height: 84, imageRendering: "pixelated", borderRadius: 4 }}
          />
        </div>
        {truth !== null && result && (
          <div className="truth-badge">
            正解 {truth} —{" "}
            {truth === result.pred ? (
              <strong style={{ color: "var(--accent)" }}>的中</strong>
            ) : (
              <strong style={{ color: "var(--warn)" }}>外れ</strong>
            )}
          </div>
        )}
      </div>

      <div className="probs" role="group" aria-label="数字ごとの確率">
        {Array.from({ length: 10 }, (_, d) => {
          const p = result ? result.probs[d] : 0;
          const top = result !== null && result.pred === d;
          return (
            <div className="prob-row" key={d}>
              <span className={top ? "prob-digit top" : "prob-digit"}>{d}</span>
              <span className="prob-bar">
                <span
                  className="prob-fill"
                  style={{
                    width: `${p * 100}%`,
                    background: top ? "var(--accent)" : "var(--fg-muted)",
                  }}
                />
              </span>
              <span className="prob-val">{(p * 100).toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
