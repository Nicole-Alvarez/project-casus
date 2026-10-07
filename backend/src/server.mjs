import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, sep, extname } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { DT, MAX_PLAYERS } from '../../shared/level.mjs';
import { createPlayer, createRoom, stepRoom, roomSnapshot, NEUTRAL } from '../../shared/physics.mjs';
import { parseMessage } from '../../shared/protocol.mjs';

const DIST = fileURLToPath(new URL('../../frontend/dist/', import.meta.url));
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.png':'image/png', '.svg':'image/svg+xml', '.ogg':'audio/ogg', '.json':'application/json', '.ico':'image/x-icon', '.txt':'text/plain; charset=utf-8' };
const send = (ws, value) => {
  if (ws.readyState !== WebSocket.OPEN) return;
  if (ws.bufferedAmount > 128 * 1024) { ws.close(1013, 'Connection too slow'); return; }
  ws.send(JSON.stringify(value));
};

export async function createGameServer({ port = 3001, host = '0.0.0.0', allowedOrigins = [], dist = DIST } = {}) {
  const rooms = new Map();
  const root = resolve(dist);
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type':'application/json', 'Cache-Control':'no-store' });
        res.end(JSON.stringify({ status:'ok', rooms:rooms.size })); return;
      }
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end('Method not allowed'); return; }
      const pathname = decodeURIComponent(url.pathname);
      if (pathname.includes('\0') || pathname.includes('\\') || pathname.split('/').some(p => p.startsWith('.'))) {
        res.writeHead(403); res.end('Forbidden'); return;
      }
      const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!path.startsWith(root + sep)) { res.writeHead(403); res.end('Forbidden'); return; }
      const info = await stat(path);
      if (!info.isFile()) { res.writeHead(404); res.end('Not found'); return; }
      const body = await readFile(path);
      res.writeHead(200, { 'Content-Type':TYPES[extname(path)] ?? 'application/octet-stream', 'Cache-Control':extname(path) === '.html' ? 'no-cache' : 'public, max-age=3600', 'Content-Length':body.length });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) {
      res.writeHead(error instanceof URIError ? 400 : 404, { 'Content-Type':'text/plain; charset=utf-8' });
      res.end('Not found. For development run npm run dev; for production run npm run build first.');
    }
  });
  const wss = new WebSocketServer({ noServer:true, maxPayload:1024, perMessageDeflate:false });
  server.on('upgrade', (req, socket, head) => {
    let originAllowed = !req.headers.origin;
    try {
      const origin = new URL(req.headers.origin);
      originAllowed = (['http:', 'https:'].includes(origin.protocol) && origin.host === req.headers.host) || allowedOrigins.includes(origin.origin);
    } catch { /* Non-browser clients may omit Origin; invalid supplied origins are rejected. */ }
    const status = req.url !== '/ws' ? 404 : !originAllowed ? 403 : wss.clients.size >= 128 ? 503 : 0;
    if (status) { socket.end(`HTTP/1.1 ${status} Rejected\r\nConnection: close\r\n\r\n`); return; }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
  });
  wss.on('connection', ws => {
    ws.on('error', () => {}); // Socket transport errors are handled by close/heartbeat cleanup.
    const id = randomUUID();
    let room; let lastInput = 0; let count = 0; let windowStart = Date.now(); let strikes = 0;
    ws.alive = true;
    ws.on('pong', () => { ws.alive = true; });
    const timeout = setTimeout(() => ws.close(1008, 'Join required'), 5000);
    const fail = message => { send(ws, { type:'error', message }); if (++strikes >= 3) ws.close(1008, 'Invalid messages'); };
    ws.on('message', (raw, binary) => {
      if (Date.now() - windowStart >= 1000) { count = 0; windowStart = Date.now(); }
      if (++count > 100) { ws.close(1008, 'Too many messages'); return; }
      const message = binary ? null : parseMessage(raw.toString());
      if (!message) { fail('Invalid message.'); return; }
      if (message.type === 'join') {
        if (room) { fail('Already joined.'); return; }
        if (!rooms.has(message.room) && rooms.size >= 32) { fail('Server is busy. Try again shortly.'); ws.close(1013); return; }
        const target = rooms.get(message.room) ?? createRoom(message.room);
        if (target.players.size >= MAX_PLAYERS) { fail('This room is full (8 players).'); ws.close(1008); return; }
        const slots = new Set([...target.players.values()].map(p => p.slot));
        let slot = 0; while (slots.has(slot)) slot++;
        room = target;
        rooms.set(room.code, room);
        room.players.set(id, createPlayer(id, message.name, slot));
        room.inputs.set(id, NEUTRAL);
        ws.room = room; ws.playerId = id;
        clearTimeout(timeout);
        send(ws, { ...roomSnapshot(room), type:'welcome', id, room:room.code });
      } else if (room) {
        room.inputs.set(id, message); lastInput = Date.now();
      } else fail('Join a room first.');
    });
    ws.releaseStaleInput = now => { if (room && now - lastInput > 500) room.inputs.set(id, NEUTRAL); };
    ws.on('close', () => {
      clearTimeout(timeout);
      if (!room) return;
      room.players.delete(id); room.inputs.delete(id);
      if (!room.players.size) rooms.delete(room.code);
    });
  });
  let previous = performance.now(); let accumulator = 0;
  const timer = setInterval(() => {
    const now = performance.now();
    accumulator += Math.min((now - previous) / 1000, 0.25); previous = now;
    for (const ws of wss.clients) ws.releaseStaleInput(Date.now());
    while (accumulator >= DT) {
      for (const room of rooms.values()) {
        stepRoom(room, DT);
        if (room.tick % 3 === 0) {
          const snapshot = roomSnapshot(room);
          for (const ws of wss.clients) if (ws.room === room) send(ws, snapshot);
        }
      }
      accumulator -= DT;
    }
  }, 1000 / 60);
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.alive) { ws.terminate(); continue; }
      ws.alive = false; ws.ping();
    }
  }, 15000);
  try {
    await new Promise((ok, fail) => { server.once('error', fail); server.listen(port, host, ok); });
  } catch (error) { clearInterval(timer); clearInterval(heartbeat); wss.close(); throw error; }
  return { server, wss, rooms, port:server.address().port, async close() {
    clearInterval(timer); clearInterval(heartbeat);
    for (const ws of wss.clients) ws.terminate();
    await new Promise(resolve => wss.close(resolve));
    await new Promise(resolve => server.close(resolve));
  } };
}
