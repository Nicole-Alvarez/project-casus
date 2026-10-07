import { LEVEL, COLORS, DT } from './level.mjs';

export const NEUTRAL = Object.freeze({ left: false, right: false, jump: false, respawn: false });
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export function createPlayer(id, name, slot) {
  return { id, name, slot, color: COLORS[slot % COLORS.length], x: 108 + (slot % 4) * 40, y: LEVEL.checkpoints[0].y, w: 24, h: 34, vx: 0, vy: 0, grounded: false, facing: 1, checkpoint: 0, jumpHeld: false, respawnHeld: false, finished: false };
}

export function respawn(player) {
  const spawn = LEVEL.checkpoints[player.checkpoint];
  Object.assign(player, { x: spawn.x, y: spawn.y, vx: 0, vy: 0, grounded: false, finished: false });
}

export function stepPlayer(p, input = NEUTRAL, dt = DT) {
  if (input.respawn && !p.respawnHeld) respawn(p);
  p.respawnHeld = input.respawn;
  const direction = Number(input.right) - Number(input.left);
  const target = direction * 260;
  const delta = (direction ? 1900 : 2400) * dt;
  p.vx += Math.sign(target - p.vx) * Math.min(Math.abs(target - p.vx), delta);
  if (direction) p.facing = direction;
  if (input.jump && !p.jumpHeld && p.grounded) { p.vy = -610; p.grounded = false; }
  p.jumpHeld = input.jump;
  p.vy = Math.min(900, p.vy + 1500 * dt);

  p.x += p.vx * dt;
  for (const platform of LEVEL.platforms) {
    if (!overlaps(p, platform)) continue;
    if (p.vx > 0) p.x = platform.x - p.w;
    else if (p.vx < 0) p.x = platform.x + platform.w;
    p.vx = 0;
  }
  p.x = Math.max(0, Math.min(LEVEL.width - p.w, p.x));
  p.y += p.vy * dt;
  p.grounded = false;
  for (const platform of LEVEL.platforms) {
    if (!overlaps(p, platform)) continue;
    if (p.vy >= 0) { p.y = platform.y - p.h; p.grounded = true; }
    else p.y = platform.y + platform.h;
    p.vy = 0;
  }
  if (p.x >= LEVEL.checkpoints[1].x) p.checkpoint = 1;
  if (overlaps(p, LEVEL.finish)) p.finished = true;
  if (p.y > LEVEL.height + 60) respawn(p);
}

export function createRoom(code) {
  return { code, players: new Map(), inputs: new Map(), collected: new Set(), completed: false, tick: 0 };
}

export function stepRoom(room, dt = DT) {
  room.tick++;
  for (const p of room.players.values()) {
    stepPlayer(p, room.inputs.get(p.id) ?? NEUTRAL, dt);
    for (const coin of LEVEL.coins) {
      if (!room.collected.has(coin.id) && overlaps(p, { ...coin, w: 24, h: 24 })) room.collected.add(coin.id);
    }
    if (p.finished) room.completed = true;
  }
}

export function cameraTarget(x, viewportWidth, worldWidth = LEVEL.width) {
  return Math.max(0, Math.min(Math.max(0, worldWidth - viewportWidth), x - viewportWidth * 0.4));
}

export function roomSnapshot(room) {
  return { type: 'snapshot', tick: room.tick, players: [...room.players.values()], collected: [...room.collected], completed: room.completed };
}
