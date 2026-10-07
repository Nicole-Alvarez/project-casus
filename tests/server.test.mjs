import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { createGameServer } from '../backend/src/server.mjs';

function connect(port, room = 'GROVE', name = 'Explorer') {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const messages = [];
    ws.on('error', reject);
    ws.on('message', raw => {
      const message = JSON.parse(raw); messages.push(message);
      if (message.type === 'welcome' || message.type === 'error') resolve({ ws, messages, welcome: message });
    });
    ws.on('open', () => ws.send(JSON.stringify({ type:'join', room, name })));
  });
}
const waitFor = async (predicate) => {
  const end = Date.now() + 2500;
  while (Date.now() < end) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 20)); }
  throw new Error('Timed out waiting for server behavior');
};

test('real clients share movement, isolate rooms, reject position cheating, and clean up', async () => {
  const game = await createGameServer({ port: 0, host: '127.0.0.1' });
  try {
    const a = await connect(game.port, 'GROVE', 'Moss');
    const b = await connect(game.port, 'GROVE', 'Fern');
    const c = await connect(game.port, 'OTHER', 'Moon');
    await waitFor(() => b.messages.some(m => m.type === 'snapshot' && m.players.length === 2));
    const initial = b.messages.findLast(m => m.type === 'snapshot').players.find(p => p.id === a.welcome.id).x;
    a.ws.send(JSON.stringify({ type:'input', left:false, right:true, jump:false, respawn:false }));
    await waitFor(() => b.messages.some(m => m.type === 'snapshot' && m.players.find(p => p.id === a.welcome.id)?.x > initial + 25));
    assert.ok(c.messages.filter(m => m.type === 'snapshot').every(m => m.players.length === 1));
    a.ws.send(JSON.stringify({ type:'input', x:900000 }));
    await waitFor(() => a.messages.some(m => m.type === 'error'));
    assert.ok(game.rooms.get('GROVE').players.get(a.welcome.id).x < 900000);
    await waitFor(() => game.rooms.get('GROVE').players.get(a.welcome.id).vx === 0);
    a.ws.close(); b.ws.close(); c.ws.close();
    await waitFor(() => game.rooms.size === 0);
  } finally { await game.close(); }
});

test('eight-player capacity is enforced and new connections can fill a freed slot', async () => {
  const game = await createGameServer({ port:0, host:'127.0.0.1' });
  try {
    const clients = [];
    for (let i = 0; i < 8; i++) clients.push(await connect(game.port, 'FULL', `Player ${i}`));
    const ninth = await connect(game.port, 'FULL');
    assert.equal(ninth.welcome.type, 'error');
    assert.match(ninth.welcome.message, /full/i);
    clients[2].ws.close();
    await waitFor(() => game.rooms.get('FULL').players.size === 7);
    const replacement = await connect(game.port, 'FULL');
    assert.equal(replacement.welcome.type, 'welcome');
    assert.equal(new Set([...game.rooms.get('FULL').players.values()].map(p => p.slot)).size, 8);
  } finally { await game.close(); }
});

test('health works and cross-origin WebSocket upgrades are refused', async () => {
  const game = await createGameServer({ port:0, host:'127.0.0.1' });
  try {
    const response = await fetch(`http://127.0.0.1:${game.port}/health`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, 'ok');
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${game.port}/ws`, { origin:'https://untrusted.example' });
      ws.on('unexpected-response', (_, response) => { assert.equal(response.statusCode, 403); response.resume(); resolve(); });
      ws.on('open', () => { ws.close(); reject(new Error('Cross-origin socket unexpectedly accepted')); });
      ws.on('error', reject);
    });
    const forbidden = await fetch(`http://127.0.0.1:${game.port}/%2e%2e%2fpackage.json`);
    assert.notEqual(forbidden.status, 200);
  } finally { await game.close(); }
});

test('malformed and oversized messages close only the offending connection', async () => {
  const game=await createGameServer({port:0,host:'127.0.0.1'});
  try {
    const valid=await connect(game.port,'SAFE','Moss');
    const malformed=await connect(game.port,'SAFE','Fern');
    const malformedClosed=new Promise(resolve=>malformed.ws.once('close',code=>resolve(code)));
    for(let i=0;i<3;i++)malformed.ws.send('not json');
    assert.equal(await malformedClosed,1008);
    const oversized=await connect(game.port,'SAFE','Sprout');
    const oversizedClosed=new Promise(resolve=>oversized.ws.once('close',code=>resolve(code)));
    oversized.ws.send('x'.repeat(2048));
    assert.equal(await oversizedClosed,1009);
    await waitFor(()=>game.rooms.get('SAFE').players.size===1);
    assert.equal(valid.ws.readyState,WebSocket.OPEN);
    assert.equal((await fetch(`http://127.0.0.1:${game.port}/health`)).status,200);
  } finally { await game.close(); }
});
