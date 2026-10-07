import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { WebSocket } from 'ws';

test('combined development command starts frontend/backend, serves assets, and proxies a room join', async () => {
  const freePort=()=>new Promise(resolve=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});});
  const backendPort=await freePort(),frontendPort=await freePort();
  const base=`http://127.0.0.1:${frontendPort}`;
  const child=spawn(process.execPath,['scripts/dev.mjs'],{env:{...process.env,PORT:String(backendPort),FRONTEND_PORT:String(frontendPort)},stdio:['ignore','pipe','pipe']});
  let output='';child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.on('data',chunk=>{output+=chunk;});
  try {
    const deadline=Date.now()+10000;
    let ready=false;
    while(Date.now()<deadline) {
      if(child.exitCode!==null)throw new Error(`Development launcher exited: ${output}`);
      try {
        const response=await fetch(base+'/health');
        if(response.ok && (await response.json()).status==='ok'){ready=true;break;}
      } catch {}
      await new Promise(resolve=>setTimeout(resolve,50));
    }
    assert.ok(ready,output);
    const page=await fetch(base+'/');assert.match(await page.text(),/Mosslight/);
    const asset=await fetch(base+'/game-assets/generated/sanctuary/characters/beetle/ground.png');
    assert.equal(asset.status,200);assert.match(asset.headers.get('content-type'),/image\/png/);
    await new Promise((resolve,reject)=>{
      const ws=new WebSocket(`ws://127.0.0.1:${frontendPort}/ws`,{origin:base});
      const timeout=setTimeout(()=>{ws.terminate();reject(new Error('Development proxy join timed out'));},3000);
      ws.on('error',reject);
      ws.on('open',()=>ws.send(JSON.stringify({type:'join',room:'DEVTEST',name:'Explorer'})));
      ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='welcome'){clearTimeout(timeout);ws.close();resolve();}});
    });
  } finally {
    if(child.exitCode===null){child.kill('SIGTERM');await new Promise(resolve=>child.once('exit',resolve));}
  }
});
