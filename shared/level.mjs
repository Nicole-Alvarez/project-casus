export const TILE = 36;
export const DT = 1 / 60;
export const MAX_PLAYERS = 8;
export const COLORS = ['#7be3aa', '#9bbcff', '#f6a6ce', '#ffd580', '#bda5ff', '#78d9df', '#ff9b83', '#e1edbc'];

const groundY = 15;
const ground = [[0, 26], [30, 26], [60, 33], [97, 30], [131, 29], [164, 28]];
const ledges = [[9, 12, 4], [18, 10, 4], [25, 12, 5], [39, 12, 4], [49, 10, 4], [55, 12, 5], [71, 12, 5], [81, 10, 4], [92, 12, 5], [106, 12, 5], [118, 10, 4], [126, 12, 5], [140, 12, 5], [151, 10, 4], [159, 12, 5], [174, 12, 4], [182, 10, 4]];
const platforms = [
  ...ground.map(([x, w]) => ({ x: x * TILE, y: groundY * TILE, w: w * TILE, h: 180, ground: true })),
  ...ledges.map(([x, y, w]) => ({ x: x * TILE, y: y * TILE, w: w * TILE, h: TILE, ground: false })),
];
const coins = ledges.flatMap(([x, y, w], i) => [1, w - 2].map((offset, j) => ({ id: `coin-${i}-${j}`, x: (x + offset) * TILE + 6, y: y * TILE - 40 })));
export const LEVEL = Object.freeze({
  name: 'The Moonlit Grove', width: 192 * TILE, height: 720, groundY,
  platforms, coins,
  checkpoints: [{ x: 108, y: groundY * TILE - 34 }, { x: 101 * TILE, y: groundY * TILE - 34 }],
  finish: { x: 188 * TILE, y: groundY * TILE - 108, w: 50, h: 108 },
});
