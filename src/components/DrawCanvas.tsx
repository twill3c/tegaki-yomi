"use client";

// 手書きキャンバス(F-05 / F-08)。ポインタで太筆描画し、ストローク終端で
// グレースケール配列を親へ渡す。Canvas API は effect / ハンドラ内のみ(HC-002 予防適用)。

import { useCallback, useEffect, useRef } from "react";

const SIZE = 280;
const BRUSH = 18;

export interface SampleRequest {
  seq: number;
  pixels: Uint8Array; // 28×28
}

export function DrawCanvas({
  sample,
  onInk,
}: {
  /** お手本読み込み要求(seq が変わるたびに適用) */
  sample: SampleRequest | null;
  /** ストローク終端・クリア・お手本適用時に呼ばれる(null = 空) */
  onInk: (gray: number[] | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  const emit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = ctx.getImageData(0, 0, SIZE, SIZE);
    const gray: number[] = new Array(SIZE * SIZE);
    let any = false;
    for (let i = 0; i < SIZE * SIZE; i++) {
      const v = img.data[i * 4] / 255; // 白筆の R 成分がそのままインク量
      gray[i] = v;
      if (v > 0.01) any = true;
    }
    onInk(any ? gray : null);
  }, [onInk]);

  const clear = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, SIZE, SIZE);
  }, []);

  // 初期化(黒地)
  useEffect(() => {
    clear();
  }, [clear]);

  // お手本の適用: 28×28 を拡大描画してから通常経路で emit
  useEffect(() => {
    if (!sample) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    clear();
    const off = document.createElement("canvas");
    off.width = 28;
    off.height = 28;
    const offCtx = off.getContext("2d")!;
    const img = offCtx.createImageData(28, 28);
    for (let i = 0; i < 784; i++) {
      const v = sample.pixels[i];
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = v;
      img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    offCtx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, 20, 20, SIZE - 40, SIZE - 40);
    emit();
  }, [sample, clear, emit]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * SIZE,
      y: ((e.clientY - rect.top) / rect.height) * SIZE,
    };
  };

  const strokeTo = (p: { x: number; y: number }): void => {
    const ctx = canvasRef.current?.getContext("2d");
    const last = lastRef.current;
    if (!ctx || !last) return;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = BRUSH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
  };

  return (
    <div className="drawpad">
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        role="img"
        aria-label="手書き入力キャンバス。ここに数字を 1 文字描く"
        style={{ touchAction: "none", width: "100%", height: "auto", display: "block", borderRadius: 6 }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawingRef.current = true;
          lastRef.current = pos(e);
          strokeTo(pos(e));
        }}
        onPointerMove={(e) => {
          if (drawingRef.current) strokeTo(pos(e));
        }}
        onPointerUp={() => {
          drawingRef.current = false;
          lastRef.current = null;
          emit();
        }}
        onPointerCancel={() => {
          drawingRef.current = false;
          lastRef.current = null;
        }}
      />
      <button
        type="button"
        onClick={() => {
          clear();
          onInk(null);
        }}
      >
        クリア
      </button>
    </div>
  );
}
