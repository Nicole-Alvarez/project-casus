import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const backend = spawn(process.execPath, ['--watch', 'backend/src/index.mjs'], { cwd:root, stdio:'inherit' });
const frontend = spawn(process.execPath, [root+'node_modules/vite/bin/vite.js', '--host', '0.0.0.0'], { cwd:root+'frontend', stdio:'inherit' });
let stopping = false;
function stop(code = 0) {
  if (stopping) return; stopping = true;
  backend.kill('SIGTERM'); frontend.kill('SIGTERM');
  process.exitCode = code;
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop());
for (const child of [backend, frontend]) {
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => { if (!stopping) stop(code ?? 1); });
}
