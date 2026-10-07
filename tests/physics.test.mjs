import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, stepPlayer, createRoom, stepRoom, cameraTarget } from '../shared/physics.mjs';
import { LEVEL, TILE, DT } from '../shared/level.mjs';
import { parseMessage } from '../shared/protocol.mjs';

const still = { left: false, right: false, jump: false, respawn: false };
const advance = (player, input, n = 60) => { for (let i = 0; i < n; i++) stepPlayer(player, input, DT); };

test('walking advances right, stops when released, and collides with ground', () => {
  const p = createPlayer('a', 'Explorer', 0);
  advance(p, still, 60);
  assert.equal(p.grounded, true);
  const start = p.x;
  advance(p, { ...still, right: true }, 20);
  assert.ok(p.x > start + 50);
  advance(p, still, 30);
  const stopped = p.x;
  advance(p, still, 10);
  assert.equal(p.x, stopped);
  assert.ok(p.y + p.h <= LEVEL.groundY * TILE + 0.01);
});

test('jumping uses a rising edge and does not auto-jump on landing', () => {
  const p = createPlayer('a', 'Explorer', 0);
  advance(p, still);
  const ground = p.y;
  stepPlayer(p, { ...still, jump: true }, DT);
  assert.ok(p.y < ground);
  advance(p, { ...still, jump: true }, 150);
  assert.equal(p.grounded, true);
  assert.equal(p.y, ground);
});

test('world boundaries clamp and falling respawns at checkpoint', () => {
  const p = createPlayer('a', 'Explorer', 0);
  advance(p, { ...still, left: true }, 200);
  assert.ok(p.x >= 0);
  p.checkpoint = 1;
  p.y = LEVEL.height + 100;
  stepPlayer(p, still, DT);
  assert.equal(p.x, LEVEL.checkpoints[1].x);
  assert.ok(Number.isFinite(p.y));
});

test('shared collectibles are counted once and rooms keep separate state', () => {
  const a = createRoom('GROVE'); const b = createRoom('OTHER');
  const p = createPlayer('a', 'Explorer', 0);
  a.players.set(p.id, p);
  Object.assign(p, { x: LEVEL.coins[0].x, y: LEVEL.coins[0].y });
  stepRoom(a, DT);
  assert.equal(a.collected.size, 1);
  stepRoom(a, DT);
  assert.equal(a.collected.size, 1);
  assert.equal(b.collected.size, 0);
});

test('camera tracks player and clamps to world including large viewports', () => {
  assert.equal(cameraTarget(100, 960, LEVEL.width), 0);
  assert.ok(cameraTarget(1800, 960, LEVEL.width) > 1000);
  assert.equal(cameraTarget(LEVEL.width, 960, LEVEL.width), LEVEL.width - 960);
  assert.equal(cameraTarget(500, LEVEL.width + 10, LEVEL.width), 0);
});

test('the complete level is traversable through physics, including checkpoint and finish', () => {
  const p=createPlayer('path','Explorer',0);
  let respawns=0;
  for(let tick=0;tick<60*180&&!p.finished;tick++) {
    const upcoming=LEVEL.platforms.find(q=>!q.ground && q.x>p.x+p.w && q.x-p.x-p.w<100 && q.y<p.y+p.h && q.y>=p.y+p.h-125);
    const surface=LEVEL.platforms.find(q=>p.grounded && Math.abs(q.y-p.y-p.h)<1 && p.x+p.w>q.x && p.x<q.x+q.w);
    const jump=p.grounded&&!p.jumpHeld&&(Boolean(upcoming)||Boolean(surface&&surface.x+surface.w-p.x-p.w<60));
    const x=p.x;
    stepPlayer(p,{...still,right:true,jump},DT);
    if(p.x<x-100)respawns++;
  }
  assert.equal(p.finished,true);
  assert.equal(p.checkpoint,1);
  assert.equal(respawns,0);
});

test('protocol accepts only validated joins and boolean input, never positions', () => {
  assert.deepEqual(parseMessage('{"type":"join","room":"grove","name":"  Moss  "}'), { type: 'join', room: 'GROVE', name: 'Moss' });
  assert.equal(parseMessage('bad json'), null);
  assert.equal(parseMessage('{"type":"join","room":"../../x","name":"Moss"}'), null);
  assert.equal(parseMessage('{"type":"input","right":"yes"}'), null);
  assert.equal(parseMessage('{"type":"input","x":9000}'), null);
  assert.deepEqual(parseMessage('{"type":"input","left":false,"right":true,"jump":false,"respawn":false}'), { type:'input', ...still, right: true });
});
