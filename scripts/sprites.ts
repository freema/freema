// Pixel fonts and helpers shared by the header and the contribution graph.

export type Theme = 'dark' | 'light';

// Glyphs are rows of '1' (pixel) and '0' (empty).
export const FONT_5X7: Record<string, string[]> = {
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

export const FONT_3X5: Record<string, string[]> = {
  T: ['111', '010', '010', '010', '010'],
  E: ['111', '100', '110', '100', '111'],
  A: ['010', '101', '111', '101', '101'],
  M: ['101', '111', '111', '101', '101'],
  L: ['100', '100', '100', '100', '111'],
  D: ['110', '101', '101', '101', '110'],
  C: ['011', '100', '100', '100', '011'],
  P: ['110', '101', '110', '100', '100'],
  S: ['011', '100', '010', '001', '110'],
  R: ['110', '101', '110', '101', '101'],
  V: ['101', '101', '101', '101', '010'],
  I: ['111', '010', '010', '010', '111'],
  N: ['110', '101', '101', '101', '101'],
  G: ['011', '100', '101', '101', '011'],
  '·': ['000', '000', '010', '000', '000'],
  ' ': ['000', '000', '000', '000', '000'],
};

export function rect(x: number, y: number, w: number, h: number, fill: string, extra = ''): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${extra ? ' ' + extra : ''}/>`;
}

// Draws a sprite given as rows of legend characters; '.' is transparent.
// Horizontal runs of one colour become a single rect to keep files small.
export function sprite(rows: string[], colors: Record<string, string>, x0: number, y0: number, px: number): string {
  const out: string[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      if (c === '.' || !(c in colors)) {
        x++;
        continue;
      }
      let end = x;
      while (end + 1 < row.length && row[end + 1] === c) end++;
      out.push(rect(x0 + x * px, y0 + y * px, (end - x + 1) * px, px, colors[c]));
      x = end + 1;
    }
  });
  return out.join('');
}

export function text(str: string, font: Record<string, string[]>, x0: number, y0: number, px: number, fill: string): string {
  const width = font[' '][0].length;
  return [...str]
    .map((ch, i) => {
      const glyph = font[ch] ?? font[' '];
      const rows = glyph.map((r) => r.replace(/1/g, 'x').replace(/0/g, '.'));
      return sprite(rows, { x: fill }, x0 + i * (width + 1) * px, y0, px);
    })
    .join('');
}

export function textWidth(str: string, font: Record<string, string[]>, px: number): number {
  const width = font[' '][0].length;
  return ([...str].length * (width + 1) - 1) * px;
}
