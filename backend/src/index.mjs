import { createGameServer } from './server.mjs';

const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.');
const game = await createGameServer({ port, host:process.env.HOST ?? '0.0.0.0', allowedOrigins:(process.env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean) });
console.log(`Mosslight server listening on port ${game.port}`);
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => {
  if (stopping) return; stopping = true;
  await game.close(); process.exit(0);
});
