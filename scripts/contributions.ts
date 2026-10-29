// Draws the last year of contributions as a grid, and a tiny ship below it that
// shoots down the busiest days. Writes assets/contributions-dark.svg and -light.svg.
// Run: GITHUB_TOKEN=... node scripts/contributions.ts [login]

import { writeFileSync, mkdirSync } from 'node:fs';
import { sprite } from './sprites.ts';

export interface Day {
  date: string;
  count: number;
  level: number; // 0-4, as GitHub buckets it
}

const LEVELS: Record<string, number> = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };

const COLORS = {
  dark: { bg: '#0d1117', cells: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'], ship: '#ff3f8e', cockpit: '#7ee8e0', bullet: '#ffe45e', boom: '#ffe45e', boomCore: '#ff3f8e' },
  light: { bg: '#ffffff', cells: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'], ship: '#d81b6a', cockpit: '#1b8a85', bullet: '#e0a800', boom: '#e0a800', boomCore: '#d81b6a' },
};

const CELL = 10;
const GAP = 3;
const PAD = 16;
const PER_MONTH = 2;
const SLOT = 0.7; // seconds per shot

const SHIP = ['....c....', '...cpc...', '...ccc...', '.c.ccc.c.', 'ccccccccc', 'cc.c.c.cc', 'c.......c'];
const BOOM = ['b...b', '.bcb.', '..c..', '.bcb.', 'b...b'];

// The busiest days of each month, shot in calendar order.
export function pickTargets(weeks: Day[][], perMonth = PER_MONTH): { week: number; day: number }[] {
  const byMonth = new Map<string, { week: number; day: number; d: Day }[]>();
  weeks.forEach((w, week) =>
    w.forEach((d) => {
      if (d.count === 0) return;
      const month = d.date.slice(0, 7);
      const list = byMonth.get(month) ?? [];
      list.push({ week, day: new Date(d.date + 'T00:00:00Z').getUTCDay(), d });
      byMonth.set(month, list);
    }),
  );
  return [...byMonth.values()]
    .flatMap((list) => list.sort((a, b) => b.d.count - a.d.count).slice(0, perMonth))
    .sort((a, b) => a.d.date.localeCompare(b.d.date))
    .map(({ week, day }) => ({ week, day }));
}

export async function fetchWeeks(login: string, token: string): Promise<Day[][]> {
  const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{weeks{contributionDays{date contributionCount contributionLevel}}}}}}`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { login } }),
  });
  if (!res.ok) throw new Error(`GitHub GraphQL: HTTP ${res.status}`);
  const json = (await res.json()) as any;
  if (json.errors) throw new Error(`GitHub GraphQL: ${JSON.stringify(json.errors)}`);
  return json.data.user.contributionsCollection.contributionCalendar.weeks.map((w: any) =>
    w.contributionDays.map((d: any) => ({ date: d.date, count: d.contributionCount, level: LEVELS[d.contributionLevel] ?? 0 })),
  );
}

export function render(weeks: Day[][], theme: 'dark' | 'light'): string {
  const c = COLORS[theme];
  const W = PAD * 2 + weeks.length * (CELL + GAP) - GAP;
  const gridH = 7 * (CELL + GAP) - GAP;
  const shipPx = 3;
  const shipW = SHIP[0].length * shipPx;
  const shipY = PAD + gridH + 22;
  const H = shipY + SHIP.length * shipPx + PAD;
  const cellX = (week: number) => PAD + week * (CELL + GAP);
  const cellY = (day: number) => PAD + day * (CELL + GAP);

  const targets = pickTargets(weeks);
  const n = targets.length;
  const loop = +(n * SLOT + 2).toFixed(2); // a short pause at the end before the grid comes back
  const pct = (t: number) => +((t / loop) * 100).toFixed(2);
  const shipX = (week: number) => cellX(week) + CELL / 2 - shipW / 2;

  const cells: string[] = [];
  weeks.forEach((w, week) =>
    w.forEach((d) => {
      const day = new Date(d.date + 'T00:00:00Z').getUTCDay();
      cells.push(`<rect x="${cellX(week)}" y="${cellY(day)}" width="${CELL}" height="${CELL}" rx="2" fill="${c.cells[d.level]}"/>`);
    }),
  );

  const css: string[] = [];
  const fx: string[] = [];
  const shipFrames: string[] = [`0%{transform:translateX(${shipX(targets[0]?.week ?? 0)}px)}`];
  const bulletLen = 6;

  targets.forEach((t, i) => {
    const start = i * SLOT;
    const fire = start + SLOT * 0.45;
    const hit = start + SLOT * 0.8;
    const x = cellX(t.week);
    const y = cellY(t.day);

    shipFrames.push(`${pct(start)}%{transform:translateX(${shipX(i ? targets[i - 1].week : t.week)}px)}`, `${pct(fire)}%{transform:translateX(${shipX(t.week)}px)}`);

    // The day goes dark when the bullet lands and stays dark until the loop restarts.
    fx.push(`<rect class="a e${i}" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${c.cells[0]}"/>`);
    css.push(`.e${i}{animation-name:e${i}}@keyframes e${i}{0%,${pct(hit)}%{opacity:0}${(pct(hit) + 0.01).toFixed(2)}%,99%{opacity:1}100%{opacity:0}}`);

    // Bullet flies from the nose of the ship to the cell.
    const from = shipY - bulletLen;
    const dist = from - (y + CELL - bulletLen);
    fx.push(`<rect class="a b${i}" x="${x + CELL / 2 - 1}" y="${from}" width="2" height="${bulletLen}" fill="${c.bullet}"/>`);
    css.push(
      `.b${i}{animation-name:b${i}}@keyframes b${i}{0%,${pct(fire)}%{opacity:0;transform:translateY(0)}${(pct(fire) + 0.01).toFixed(2)}%{opacity:1;transform:translateY(0)}${pct(hit)}%{opacity:1;transform:translateY(-${dist}px)}${(pct(hit) + 0.01).toFixed(2)}%,100%{opacity:0;transform:translateY(-${dist}px)}}`,
    );

    // A short explosion over the cell.
    const boomEnd = pct(Math.min(hit + 0.25, loop));
    fx.push(`<g class="a x${i}">${sprite(BOOM, { b: c.boom, c: c.boomCore }, x, y, 2)}</g>`);
    css.push(`.x${i}{animation-name:x${i}}@keyframes x${i}{0%,${pct(hit)}%{opacity:0}${(pct(hit) + 0.01).toFixed(2)}%,${boomEnd}%{opacity:1}${(boomEnd + 0.01).toFixed(2)}%,100%{opacity:0}}`);
  });
  shipFrames.push(`${pct(n * SLOT + 1)}%{transform:translateX(${shipX(targets.at(-1)?.week ?? 0)}px)}`, `100%{transform:translateX(${shipX(targets[0]?.week ?? 0)}px)}`);

  const style = [
    `.a{opacity:0;animation-duration:${loop}s;animation-iteration-count:infinite;animation-timing-function:linear}`,
    ...css,
    `.ship{animation:ship ${loop}s linear infinite}@keyframes ship{${shipFrames.join('')}}`,
    `@media (prefers-reduced-motion:reduce){.a,.ship{animation:none}.ship{transform:translateX(${(W - shipW) / 2}px)}}`,
  ].join('');

  const ship = sprite(SHIP, { c: c.ship, p: c.cockpit }, 0, shipY, shipPx);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" role="img" aria-label="Contribution graph for the last year. A tiny pixel ship shoots down the busiest days."><style>${style}</style><rect width="${W}" height="${H}" rx="6" fill="${c.bg}"/>${cells.join('')}${fx.join('')}<g class="ship">${ship}</g></svg>\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const login = process.argv[2] ?? 'freema';
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('Set GITHUB_TOKEN');
  const weeks = await fetchWeeks(login, token);
  mkdirSync('assets', { recursive: true });
  for (const theme of ['dark', 'light'] as const) {
    const svg = render(weeks, theme);
    writeFileSync(`assets/contributions-${theme}.svg`, svg);
    console.log(`assets/contributions-${theme}.svg ${(svg.length / 1024).toFixed(1)} KB`);
  }
}
