import { defineConfig } from 'vite';
import { cp, mkdir,readFile,writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const backendPort=process.env.PORT||'3001';
const frontendPort=Number(process.env.FRONTEND_PORT||5173);
const assets = fileURLToPath(new URL('../assets/', import.meta.url));
export default defineConfig({
  publicDir: false,
  server: { port:frontendPort, strictPort:true, fs:{ allow:[fileURLToPath(new URL('../', import.meta.url))] }, proxy:{ '/ws':{ target:`ws://127.0.0.1:${backendPort}`, ws:true }, '/health':{ target:`http://127.0.0.1:${backendPort}` } } },
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
      const manifest=JSON.parse(await readFile(assets+'manifest.json','utf8'));
      const included=manifest.files.filter(file=>file.runtime||file.category==='licenses');
      for(const file of included){
        const target=destination+file.path;
        await mkdir(target.slice(0,target.lastIndexOf('/')),{recursive:true});
        await cp(assets+file.path,target);
      }
      await writeFile(destination+'manifest.json',JSON.stringify({...manifest,files:included},null,2)+'\n');
    },
  }],
});
