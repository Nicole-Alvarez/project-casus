import { defineConfig } from 'vite';
import { cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const assets = fileURLToPath(new URL('../assets/', import.meta.url));
export default defineConfig({
  publicDir: false,
  server: { port:5173, strictPort:true, fs:{ allow:[fileURLToPath(new URL('../', import.meta.url))] }, proxy:{ '/ws':{ target:'ws://127.0.0.1:3001', ws:true }, '/health':{ target:'http://127.0.0.1:3001' } } },
  plugins: [{
    name:'categorized-game-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/game-assets/')) req.url = '/@fs' + assets + req.url.slice('/game-assets/'.length);
        next();
      });
    },
    async closeBundle() {
      const destination = fileURLToPath(new URL('./dist/game-assets/', import.meta.url));
      await mkdir(destination, { recursive:true });
      for (const pack of ['kenney-pixel-platformer', 'kenney-new-platformer']) await cp(assets + pack, destination + pack, { recursive:true });
      await cp(assets + 'manifest.json', destination + 'manifest.json');
    },
  }],
});
