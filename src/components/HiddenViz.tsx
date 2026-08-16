"use client";

// 中身の可視化(F-07)。活性の大きい隠れユニット上位 8 個について、
// 第 1 層の重み行(784)を 28×28 の発散ヒートマップ(青=正/橙=負)で描く。
// 「このユニットはこういうストロークに反応する部品」が見える。

import { useEffect, useRef } from "react";
import type { ForwardResult, Model } from "@/core/model";

const TOP = 8;

function drawTemplate(
  canvas: HTMLCanvasElement,
  row: number[],
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  let maxAbs = 1e-9;
  for (const v of row) maxAbs = Math.max(maxAbs, Math.abs(v));
  const img = ctx.createImageData(28, 28);
  for (let i = 0; i < 784; i++) {
    const t = row[i] / maxAbs; // [-1, 1]
    // 負 = 橙 (217,89,38)、正 = 青 (90,168,232)、0 = 暗地 (16,20,28)
    const r = t > 0 ? 16 + (90 - 16) * t : 16 + (217 - 16) * -t;
    const g = t > 0 ? 20 + (168 - 20) * t : 20 + (89 - 20) * -t;
    const b = t > 0 ? 28 + (232 - 28) * t : 28 + (38 - 28) * -t;
    img.data[i * 4] = r;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = b;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

function TemplateCell({
  model,
  unit,
  act,
}: {
  model: Model;
  unit: number;
  act: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) drawTemplate(ref.current, model.w1[unit]);
  }, [model, unit]);
  return (
    <div className="tmpl">
      <canvas
        ref={ref}
        width={28}
        height={28}
        role="img"
        aria-label={`隠れユニット ${unit} の重みテンプレート`}
        style={{ width: 56, height: 56, imageRendering: "pixelated", borderRadius: 4 }}
      />
      <span className="tmpl-meta">
        #{unit} <strong>{act.toFixed(1)}</strong>
      </span>
    </div>
  );
}

export function HiddenViz({
  model,
  result,
}: {
  model: Model;
  result: ForwardResult | null;
}) {
  if (!result) {
    return (
      <div className="hidden-viz">
        <p className="hint">
          数字を描くと、強く反応した隠れユニット 8 個の「見ているもの」がここに出る
        </p>
      </div>
    );
  }
  const top = result.hidden
    .map((a, i) => ({ a, i }))
    .sort((x, y) => y.a - x.a)
    .slice(0, TOP);
  return (
    <div className="hidden-viz">
      <p className="hint">
        強く反応した隠れユニット(青 = ここにインクが欲しい / 橙 = ここには要らない)
      </p>
      <div className="tmpl-grid">
        {top.map(({ a, i }) => (
          <TemplateCell key={i} model={model} unit={i} act={a} />
        ))}
      </div>
    </div>
  );
}
