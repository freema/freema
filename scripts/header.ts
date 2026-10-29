// Generates assets/header-dark.svg and assets/header-light.svg.
// Run: node scripts/header.ts

import { writeFileSync, mkdirSync } from 'node:fs';
import { FONT_3X5, FONT_5X7, rect, text, textWidth, type Theme } from './sprites.ts';

const W = 800;
const H = 128;
const P = 8; // grid size
const TITLE = 'TOMAS GRASL';
const SUBTITLE = 'MCP SERVERS · INDIE GAMES';

// Loud late-night colours: purple sky, hot pink and yellow.
const COLORS = {
  dark: {
    sky: ['#1b0f2e', '#2a1245', '#3d1658', '#55196a'],
    star: '#ffe45e',
    title: '#ffe45e',
    titleShadow: '#ff3f8e',
    subtitle: '#7ee8e0',
  },
  light: {
    sky: ['#fff1f7', '#ffe3ef', '#ffd3e6', '#ffc2dc'],
    star: '#ff3f8e',
    title: '#3a1450',
    titleShadow: '#ff3f8e',
    subtitle: '#6a2c7a',
  },
};

// Star positions in grid cells, fixed so the header does not change between runs.
const STARS: [number, number][] = [
  [3, 2], [9, 12], [14, 1], [21, 13], [6, 7], [12, 10], [33, 14], [47, 1],
  [55, 14], [60, 1], [72, 13], [83, 1], [88, 9], [92, 3], [96, 12], [2, 13],
  [79, 6], [16, 5],
];

export function header(theme: Theme): string {
  const c = COLORS[theme];
  const parts: string[] = [];

  const band = H / c.sky.length;
  c.sky.forEach((color, i) => parts.push(rect(0, i * band, W, band, color)));

  // Stars twinkle with staggered delays; every third one is a small cross.
  STARS.forEach(([cx, cy], i) => {
    const x = cx * P;
    const y = cy * P;
    const delay = ((i * 0.37) % 3).toFixed(2);
    const shape =
      i % 3 === 0
        ? rect(x + P / 4, y - P / 4, P / 2, P * 1.5, c.star) + rect(x - P / 4, y + P / 4, P * 1.5, P / 2, c.star)
        : rect(x, y, P / 2, P / 2, c.star);
    parts.push(`<g class="tw" style="animation-delay:-${delay}s">${shape}</g>`);
  });

  // Title with a drop shadow, then the subtitle.
  const tx = Math.round((W - textWidth(TITLE, FONT_5X7, P)) / 2 / P) * P;
  parts.push(text(TITLE, FONT_5X7, tx + P / 2, 3 * P + P / 2, P, c.titleShadow));
  parts.push(text(TITLE, FONT_5X7, tx, 3 * P, P, c.title));
  const sx = Math.round((W - textWidth(SUBTITLE, FONT_3X5, 4)) / 2 / 4) * 4;
  parts.push(text(SUBTITLE, FONT_3X5, sx, 11 * P + P / 2, 4, c.subtitle));

  const style = `.tw{animation:tw 3s steps(1) infinite}@keyframes tw{0%,100%{opacity:1}50%{opacity:.25}}@media (prefers-reduced-motion:reduce){.tw{animation:none}}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" role="img" aria-label="Tomas Grasl: MCP servers, indie games."><style>${style}</style>${parts.join('')}</svg>\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync('assets', { recursive: true });
  for (const theme of ['dark', 'light'] as const) {
    const svg = header(theme);
    writeFileSync(`assets/header-${theme}.svg`, svg);
    console.log(`assets/header-${theme}.svg ${(svg.length / 1024).toFixed(1)} KB`);
  }
}
