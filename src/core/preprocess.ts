// MNIST 互換前処理(F-04)。Canvas のグレースケールをモデル入力の 28×28 に変換する。
// 手順: インクの外接矩形 → 長辺 20px へ縦横比保存で縮小(面積平均)→
//       28×28 に質量中心が中央 (14, 14) へ来るよう整数オフセットで配置。
// 空入力は null(未検出・N-05)。すべて純関数。

const OUT = 28;
const BOX = 20;
const INK_EPS = 1e-6;

export interface Com {
  x: number;
  y: number;
}

/** 質量中心(T-020)。インクなしは null */
export function centerOfMass(
  src: number[],
  w: number,
  h: number,
): Com | null {
  let sum = 0;
  let sx = 0;
  let sy = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = src[y * w + x];
      sum += v;
      sx += v * x;
      sy += v * y;
    }
  }
  if (sum <= INK_EPS) return null;
  return { x: sx / sum, y: sy / sum };
}

/**
 * 面積平均リサンプリング(T-021)。src(w×h)を tw×th へ縮小/拡大する。
 * 出力画素 = 対応する矩形領域の平均(重なり幅で加重)
 */
export function resample(
  src: number[],
  w: number,
  h: number,
  tw: number,
  th: number,
): number[] {
  const out = new Array<number>(tw * th).fill(0);
  const sx = w / tw;
  const sy = h / th;
  for (let ty = 0; ty < th; ty++) {
    const y0 = ty * sy;
    const y1 = (ty + 1) * sy;
    for (let tx = 0; tx < tw; tx++) {
      const x0 = tx * sx;
      const x1 = (tx + 1) * sx;
      let acc = 0;
      for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
        const wy = Math.min(y + 1, y1) - Math.max(y, y0);
        if (wy <= 0) continue;
        for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
          const wx = Math.min(x + 1, x1) - Math.max(x, x0);
          if (wx <= 0) continue;
          acc += src[y * w + x] * wx * wy;
        }
      }
      out[ty * tw + tx] = acc / (sx * sy);
    }
  }
  return out;
}

/**
 * 前処理本体(T-022 / T-023)。280×280 等のグレースケール([0,1])→ 784 要素。
 * インクなしは null
 */
export function preprocess(
  src: number[],
  w: number,
  h: number,
): number[] | null {
  // 外接矩形
  let minX = w;
  let maxX = -1;
  let minY = h;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (src[y * w + x] > INK_EPS) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;

  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const crop = new Array<number>(cw * ch);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      crop[y * cw + x] = src[(minY + y) * w + (minX + x)];
    }
  }

  // 長辺を BOX px へ(縦横比保存・最低 1px)
  const scale = BOX / Math.max(cw, ch);
  const tw = Math.max(1, Math.round(cw * scale));
  const th = Math.max(1, Math.round(ch * scale));
  const small = resample(crop, cw, ch, tw, th);

  // 質量中心を (14, 14) へ(整数オフセット・はみ出しはクランプ)
  const com = centerOfMass(small, tw, th)!;
  let ox = Math.round(OUT / 2 - com.x - 0.5);
  let oy = Math.round(OUT / 2 - com.y - 0.5);
  ox = Math.min(Math.max(ox, 0), OUT - tw);
  oy = Math.min(Math.max(oy, 0), OUT - th);

  const out = new Array<number>(OUT * OUT).fill(0);
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      out[(oy + y) * OUT + (ox + x)] = Math.min(1, Math.max(0, small[y * tw + x]));
    }
  }
  return out;
}
