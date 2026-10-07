// Inspect real source PNGs through the production Canvas renderer, with an
// isolated Vite server. No existing game listener is touched.
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createServer} from 'vite';
import {existsSync} from 'node:fs';
import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const workspaceRoot=fileURLToPath(new URL('../',import.meta.url)).replace(/\/$/,'');
const server=await createServer({configFile:'frontend/vite.config.mjs',root:'frontend',server:{host:'127.0.0.1',port:0,strictPort:false}});
await server.listen();let browser;
try{
  const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  browser=await chromium.launch({headless:true,...(existsSync(chrome)?{executablePath:chrome}:{})});
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.httpServer.address().port);
  await page.waitForSelector('#game[data-assets-ready="true"]');
  const result=await page.evaluate(async(workspaceRoot)=>{
    const {loadSprites,CharacterAnimation,ANIMATIONS}=await import('/src/assets.mjs');
    const {Renderer}=await import('/src/renderer.mjs');
    const {createPlayer}=await import('/@fs'+workspaceRoot+'/shared/physics.mjs');
    const sprites=await loadSprites(),canvas=document.createElement('canvas'),renderer=new Renderer(canvas,sprites);
    const skins=['beetle','moth','ant','pillbug'],states=['idle','fall','doubleJump','float','cling','cling'];
    canvas.width=1800;canvas.height=1080;renderer.width=600;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#152b31';ctx.fillRect(0,0,1800,1080);
    ctx.fillStyle='#d9ddcb';ctx.font='20px sans-serif';
    ['idle','fall','wing jump','float','right wall','left wall'].forEach((s,c)=>ctx.fillText(s,c*300+30,25));
    const handChecks=[],faceChecks=[],idleChecks=[],pixelChecks=[];
    for(const [r,skin] of skins.entries()){
      ctx.fillText(skin,10,r*260+55);
      for(const [c,state] of states.entries()){
        const player=createPlayer('audit-'+skin,skin,0);player.sprite=skin;player.facing=c===5?-1:1;player.wallSide=c===5?-1:1;
        const track=new CharacterAnimation();track.sample(skin,state,0,player);const pose=track.sample(skin,state,.25,player);
        ctx.save();ctx.translate(c*300+145,r*260+225);ctx.scale(3,3);
        renderer.character(player,-player.w/2,-player.h,pose);
        if(state==='cling'){
          const side=player.wallSide;
          ctx.strokeStyle='#e9c88c';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(side*player.w/2,-70);ctx.lineTo(side*player.w/2,5);ctx.stroke();
        }
        ctx.restore();
      }
      for(const f of ANIMATIONS[skin].cling.frames){
        const source=sprites.frames.get(f),pixels=source.getContext('2d').getImageData(0,0,source.width,source.height).data;
        const x=Math.round(f.wallAttachX);
        let alpha=0;for(let y=0;y<source.height;y++)alpha=Math.max(alpha,pixels[(y*source.width+x)*4+3]);
        handChecks.push({skin,alpha});
      }
    }
    const sheet=canvas.toDataURL();
    // Validate deformation against actual source pixels, independently of the
    // runtime masks. Sword, helmet, palms and feet must stay fixed; cape and
    // chest must move. Inspect both peak directions and the neutral half-cycle.
    for(const skin of skins){
      const f=ANIMATIONS[skin].idle.frames[0],model=sprites.idleMotion.get(f),pad=model.padding;
      const base=model.frame(0).getContext('2d').getImageData(0,0,model.width,model.height).data;
      for(const phase of [8,16,24]){
        const image=model.frame(phase),pixels=image.getContext('2d').getImageData(0,0,model.width,model.height).data;
        let fixed=0,violations=0,cape=0,chest=0;
        for(let y=0;y<model.height;y++)for(let x=0;x<model.width;x++){
          const k=(y*model.width+x)*4;if(base[k+3]<250)continue;
          const wx=(x-pad-f.pivotX)*f.scale,wy=(y-pad-f.shellCenterY)*f.scale,belowFoot=(f.pivotY+pad-y)*f.scale;
          const delta=Math.max(...[0,1,2,3].map(c=>Math.abs(base[k+c]-pixels[k+c])));
          const protectedRegion=wy<=f.shellHeight*f.scale/2+.5||(wx>=4.5&&wy>=f.shellHeight*f.scale/2)||
            (Math.abs(wx)<10&&belowFoot<=8)||(base[k]>160&&base[k+1]>140&&base[k+2]>95&&base[k]>base[k+1]*1.06&&base[k]>base[k+2]*1.2);
          if(protectedRegion){fixed++;if(delta>0)violations++;}
          else if(delta>3){if(wx<-7)cape++;if(Math.abs(wx)<4&&belowFoot>12)chest++;}
        }
        pixelChecks.push({skin,phase,fixed,violations,cape,chest});
      }
    }
    const idleSheet=document.createElement('canvas');idleSheet.width=1600;idleSheet.height=1000;
    const audit=idleSheet.getContext('2d');audit.fillStyle='#152b31';audit.fillRect(0,0,1600,1000);
    skins.forEach((skin,r)=>[0,.8,1.6,2.4].forEach((time,c)=>{
      const player=createPlayer('loop',skin,0),track=new CharacterAnimation();track.sample(skin,'idle',0,player);
      const pose=track.sample(skin,'idle',time,player);
      const previous=renderer.ctx,previousWidth=renderer.width;renderer.width=canvas.width/4;renderer.ctx=audit;audit.save();audit.translate(c*400+210,r*250+215);audit.scale(4,4);
      renderer.character(player,-player.w/2,-player.h,pose);audit.restore();renderer.ctx=previous;renderer.width=previousWidth;
      audit.fillStyle='#d9ddcb';audit.font='18px sans-serif';audit.fillText(skin+' '+time+'s',c*400+35,r*250+30);
    }));
    const idleSheetUrl=idleSheet.toDataURL();
    canvas.width=600;canvas.height=600;renderer.width=200;
    const drawImage=ctx.drawImage;let draws=[];
    ctx.drawImage=function(image,...args){draws.push({image,args,matrix:this.getTransform()});return drawImage.call(this,image,...args);};
    for(const skin of skins)for(const facing of [-1,1]){
      const player=createPlayer('idle-audit',skin,0);player.facing=facing;
      const track=new CharacterAnimation(),reference=ANIMATIONS[skin].idle.frames[0];
      for(const time of [0,.30,.34,.67,.8,1,1.34,1.6,2.4,3.2,6.4]){
        const pose=track.sample(skin,'idle',time,player);draws=[];
        ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,600,600);ctx.scale(3,3);
        renderer.character(player,80,100,pose);
        const m=draws[0].matrix;
        idleChecks.push({skin,facing,time,sameSource:pose.layers.every(l=>l.frame===reference),
          scaleX:Math.hypot(m.a,m.b),scaleY:Math.hypot(m.c,m.d),dot:m.a*m.c+m.b*m.d,
          footX:m.e,footY:m.f,width:draws[0].args[2],height:draws[0].args[3],breath:pose.idleBreath});
      }
    }
    ctx.drawImage=drawImage;
    canvas.width=600;canvas.height=600;renderer.width=200;
    for(const skin of skins){
      const track=new CharacterAnimation();track.sample(skin,'idle',0);track.sample(skin,'run',.4);
      for(const t of [.42,.44,.46,.48,.50]){
        const pose=track.sample(skin,'run',t);ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,600,600);ctx.scale(3,3);
        const player=createPlayer('opacity',skin,0);renderer.character(player,80,100,pose);
        faceChecks.push(ctx.getImageData(279,Math.round((144-pose.headHeight)*3),1,1).data[3]);
      }
    }
    // Replay all revised action loops and transitions through the actual renderer.
    // Capture a short browser-native WebM; no sprite images are transformed on disk.
    canvas.width=1200;canvas.height=700;renderer.width=300;document.body.replaceChildren(canvas);
    canvas.style.width='1200px';canvas.style.height='700px';
    const tracks=skins.map(()=>new CharacterAnimation());
    const stream=canvas.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:'video/webm'}),chunks=[];
    recorder.ondataavailable=e=>chunks.push(e.data);const stopped=new Promise(resolve=>recorder.onstop=resolve);recorder.start();
    const begin=performance.now();
    await new Promise(resolve=>{
      function tick(now){
        const elapsed=(now-begin)/1000,slot=elapsed<3.2?0:Math.min(5,1+Math.floor((elapsed-3.2)/1.2));
        const state=['idle','fall','doubleJump','float','cling','jump'][slot];
        ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#152b31';ctx.fillRect(0,0,1200,700);
        ctx.fillStyle='#d9ddcb';ctx.font='24px sans-serif';ctx.fillText(state,35,40);
        skins.forEach((skin,i)=>{
          const player=createPlayer('preview',skin,0);player.sprite=skin;player.wallSide=i%2?-1:1;player.facing=state==='jump'?-player.wallSide:1;
          const pose=tracks[i].sample(skin,state,elapsed,player);
          ctx.save();ctx.translate(150+i*300,480);ctx.scale(4,4);renderer.character(player,-13,-44,pose);
          if(state==='cling'){ctx.strokeStyle='#e9c88c';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(player.wallSide*13,-75);ctx.lineTo(player.wallSide*13,8);ctx.stroke();}
          ctx.restore();ctx.fillStyle='#d9ddcb';ctx.fillText(skin,75+i*300,550);
        });
        if(elapsed<9.2)requestAnimationFrame(tick);else resolve();
      }requestAnimationFrame(tick);
    });
    recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());
    const bytes=new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer());
    let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return {sheet,idleSheetUrl,video:btoa(binary),faceChecks,handChecks,idleChecks,pixelChecks};
  },workspaceRoot);
  await mkdir('test-results',{recursive:true});
  await writeFile('test-results/idle-motion-audit.png',Buffer.from(result.idleSheetUrl.split(',')[1],'base64'));
  await writeFile('test-results/action-sprite-audit.png',Buffer.from(result.sheet.split(',')[1],'base64'));
  await writeFile('test-results/action-animation-preview.webm',Buffer.from(result.video,'base64'));
  assert.deepEqual(errors,[]);
  assert.ok(result.faceChecks.every(a=>a>=250),'Blended faces stay opaque: '+result.faceChecks);
  assert.ok(result.handChecks.every(c=>c.alpha>=160),'Wall attachment resolves to drawn pixels');
  for(const c of result.pixelChecks){
    assert.ok(c.fixed>1000&&c.violations===0,'Protected source pixels stay identical: '+JSON.stringify(c));
    assert.ok(c.cape>100,'Cape folds visibly move: '+JSON.stringify(c));
    if(c.phase!==16)assert.ok(c.chest>20,'Chest visibly breathes: '+JSON.stringify(c));
  }
  for(const c of result.idleChecks){
    assert.ok(c.sameSource,'Idle never swaps source geometry');
    const first=result.idleChecks.find(a=>a.skin===c.skin&&a.facing===c.facing);
    assert.equal(c.width,first.width,'Idle compositing dimensions stay constant between cached phases');
    assert.equal(c.height,first.height,'Idle compositing dimensions stay constant between cached phases');
    assert.ok(Math.abs(c.scaleX-3)<1e-9&&Math.abs(c.scaleY-3)<1e-9&&Math.abs(c.dot)<1e-9,'Idle has no global scale or shear');
    assert.equal(c.footX,279);assert.equal(c.footY,432);
  }
  assert.ok(result.idleChecks.some(c=>c.breath>.99),'Actual idle rendering includes the slow breath');
  console.log('PASS: revised poses, both walls, 20 opaque face samples, 16 attachment samples, '+result.idleChecks.length+' stable idle draws across all four characters/both facings, 12 real-image cape/breathing checks with identical protected pixels, and a 9.2-second real-renderer preview with a full idle cycle.');
}finally{await browser?.close();await server.close();}
