const ROOT = '/game-assets/';
const PIXEL = ROOT + 'kenney-pixel-platformer/';
export const SPRITES = {
  grassLeft:'terrain/grass-left_0000.png', grass:'terrain/grass-middle_0001.png', grassRight:'terrain/grass-right_0003.png', soil:'terrain/soil_0004.png', platform:'terrain/grass-platform_0021.png',
  coin:'items/coin_0151.png', coinEdge:'items/coin-edge_0152.png', flag:'props/flag-right_0112.png', sign:'props/sign-right_0088.png',
  plant:'props/plant-small_0124.png', bigPlant:'props/plant-large_0125.png', pine:'props/tree-pine_0126.png', tree:'props/tree-round_0127.png', mushroom:'props/mushroom-small_0128.png',
};
export const characterPath = (slot, walking = false) => {
  const i = slot % 4;
  return PIXEL + `characters/${['green','blue','pink','yellow'][i]}-${walking ? 'walk' : 'idle'}_${String(i * 2 + Number(walking)).padStart(4,'0')}.png`;
};
export async function loadSprites() {
  const entries = Object.entries(SPRITES).map(([key,path]) => [key, PIXEL+path]);
  for (let i = 0; i < 4; i++) for (const walk of [false,true]) entries.push([`character${i}${walk ? 'Walk' : 'Idle'}`,characterPath(i,walk)]);
  return Object.fromEntries(await Promise.all(entries.map(([key,path]) => new Promise((resolve,reject) => {
    const image = new Image(); image.onload = () => resolve([key,image]); image.onerror = () => reject(new Error(`Could not load ${path}`)); image.src = path;
  }))));
}

export class Sounds {
  enabled = false;
  constructor() {
    this.tracks = Object.fromEntries(['jump','coin','magic'].map(name => {
      const audio = new Audio(ROOT + `kenney-new-platformer/audio/sfx_${name}.ogg`); audio.volume = 0.2; audio.preload = 'none';
      return [name,audio];
    }));
  }
  play(name) { if (!this.enabled) return; const track = this.tracks[name]; track.currentTime = 0; track.play().catch(() => {}); }
}
