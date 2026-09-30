/**
 * Paints a pixel-art sprite: each string is a row, each "1" a filled pixel.
 * `flip` mirrors it horizontally.
 */
export const drawSprite = (
  ctx: CanvasRenderingContext2D,
  sprite: string[],
  x: number,
  y: number,
  pixelSize: number,
  color: string,
  flip = false,
) => {
  ctx.fillStyle = color;
  for (let r = 0; r < sprite.length; r++) {
    const row = sprite[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c] !== "1") continue;
      const drawCol = flip ? row.length - 1 - c : c;
      ctx.fillRect(x + drawCol * pixelSize, y + r * pixelSize, pixelSize, pixelSize);
    }
  }
};

/** Axis-aligned rectangle overlap test. */
export const intersects = (
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
