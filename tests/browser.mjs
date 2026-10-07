import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { createGameServer } from '../backend/src/server.mjs';
const game=await createGameServer({port:0,host:'127.0.0.1'}),failures=[];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn,label,ms=5000){const end=Date.now()+ms;while(Date.now()<end){if(await fn())return;await sleep(15);}throw new Error('Timed out: '+label);}
let browser;
try{
  const installedChrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  browser=await chromium.launch({headless:true,...(existsSync(installedChrome)?{executablePath:installedChrome}:{})});
  const a=await browser.newContext({viewport:{width:1440,height:900}}),b=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await a.newPage(),friend=await b.newPage();
  function observe(p){p.on('pageerror',error=>failures.push(error.message));p.on('response',r=>{if(r.status()>=400)failures.push(`${r.status()} ${r.url()}`);});}
  observe(page);observe(friend);
  const url=`http://127.0.0.1:${game.port}/?room=BROWSER`;
  async function layout(p){assert.equal(await p.locator('#coin-count,#completion,#level-progress').count(),0);
    assert.equal(await p.evaluate(()=>{const r=document.getElementById('game').getBoundingClientRect();return Math.abs(r.width-innerWidth)<1&&Math.abs(r.height-innerHeight)<1&&document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth;}),true,'Full viewport without page scrolling');}
  await page.goto(url);await page.waitForSelector('#game[data-assets-ready="true"]');await layout(page);
  assert.equal(await page.locator('#game').getAttribute('data-map-name'),'Hollowroot Sanctuary','Render the approved sanctuary');
  assert.equal(await page.locator('#character-select option').count(),4,'All four concepts are selectable');
  await page.selectOption('#character-select','moth');
  await page.waitForFunction(()=>document.getElementById('game').dataset.sprite==='moth');
  const scale=await page.evaluate(()=>{const d=document.getElementById('game').dataset;return Number(d.spriteHeight)/Number(d.viewHeight);});
  assert.ok(Math.abs(scale-(52/400)*1.4)<.001,'Camera zoom is exactly 40% closer');
  await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/exploration-lobby.png'});
  async function join(p,name){await p.fill('#player-name',name);await p.click('#join-button');await p.waitForFunction(()=>document.getElementById('network-status').textContent==='Live');}
  await join(page,'Moss');await friend.goto(url);await join(friend,'Fern');
  // Record actual rendered peer states so polling cannot miss a 0.09-second dash.
  await friend.evaluate(()=>{
    window.renderedPeerStates=new Set();const canvas=document.getElementById('game');
    new MutationObserver(()=>{for(const p of JSON.parse(canvas.dataset.remoteAnimations||'[]'))window.renderedPeerStates.add(p.state);})
      .observe(canvas,{attributes:true,attributeFilter:['data-remote-animations']});
  });
  await page.waitForFunction(()=>document.getElementById('player-count').textContent==='2/8 explorers');
  await friend.waitForFunction(()=>JSON.parse(document.getElementById('game').dataset.remoteSprites).some(p=>p.sprite==='moth'));
  await page.click('#settings-open');
  for(const sprite of ['ant','beetle','moth','pillbug']){
    await page.selectOption('#character-setting',sprite);
    await page.waitForFunction(sprite=>document.getElementById('game').dataset.sprite===sprite,sprite);
    await friend.waitForFunction(sprite=>JSON.parse(document.getElementById('game').dataset.remoteSprites).some(p=>p.sprite===sprite),sprite);
  }
  await page.click('#settings-close');
  await page.click('#settings-open');await page.click('#invite-button');
  await page.waitForFunction(()=>!document.getElementById('toast').hidden);
  assert.equal(await page.locator('#settings-dialog #toast').count(),1,'Invite feedback must be readable inside the open settings menu');
  await page.click('#settings-close');
  const room=game.rooms.get('BROWSER');let player=[...room.players.values()].find(p=>p.name==='Moss');
  await page.click('#game');const start=player.x;
  assert.match(await page.locator('#dash-state').textContent(),/Q/,'HUD advertises Q for dash');
  await page.keyboard.down('KeyX');await until(()=>!player.invulnerable,'X is no longer the dash binding');await sleep(100);assert.equal(player.dashTime,0);await page.keyboard.up('KeyX');
  const layersBefore=await page.evaluate(()=>JSON.parse(document.getElementById('game').dataset.parallaxX));
  await page.keyboard.down('ArrowRight');await until(()=>player.x>start+150,'keyboard walk');
  await page.waitForFunction(()=>document.getElementById('game').dataset.animation==='run');await page.keyboard.up('ArrowRight');
  const layersAfter=await page.evaluate(()=>JSON.parse(document.getElementById('game').dataset.parallaxX));
  const drift=layersAfter.map((x,i)=>Math.abs(x-layersBefore[i]));
  assert.ok(drift[2]>drift[1]&&drift[1]>drift[0]&&drift[0]>0,'Three parallax depths move independently while walking');
  await page.keyboard.down('Space');await until(()=>player.vy<0,'ground jump');await page.keyboard.up('Space');
  await page.waitForFunction(()=>document.getElementById('game').dataset.animation==='jump');
  await until(()=>player.vy>=-60,'ground jump apex');
  await page.keyboard.down('Space');await until(()=>!player.airJumpAvailable,'double jump');await page.keyboard.up('Space');
  await page.waitForFunction(()=>document.getElementById('game').dataset.animation==='doubleJump');
  await friend.waitForFunction(()=>window.renderedPeerStates.has('doubleJump'));
  await page.keyboard.down('ShiftLeft');await until(()=>player.floatActive,'float descent');assert.ok(player.vy<=110);
  await page.waitForFunction(()=>document.getElementById('game').dataset.float==='true');
  assert.equal(await page.locator('#game').getAttribute('data-animation'),'float');
  await page.waitForFunction(()=>Number(document.getElementById('game').dataset.frameIndex)>=2);
  assert.equal(await page.locator('#game').getAttribute('data-sprite-mode'),'whole','Every frame is a complete drawing');
  assert.equal(Number(await page.locator('#game').getAttribute('data-sprite-magnification')),1,'Canopy does not change guardian body scale');
  assert.ok(Math.abs(Number(await page.locator('#game').getAttribute('data-shell-size'))-20)<.001,'Float keeps the normal shell size');
  await page.waitForFunction(()=>Number(document.getElementById('game').dataset.blendLayers)>1);
  await page.screenshot({path:'test-results/exploration-balloon-float.png'});
  await page.keyboard.down('ArrowLeft');await page.keyboard.down('KeyQ');await until(()=>player.invulnerable,'dash i-frames');assert.ok(player.dashTime>0);
  await friend.waitForFunction(()=>window.renderedPeerStates.has('dash'));
  await page.keyboard.up('KeyQ');await until(()=>!player.invulnerable,'dash expiry');await page.keyboard.up('ArrowLeft');
  assert.equal(player.airJumpAvailable,true,'Air dash restores the spent double jump');
  assert.equal(player.grounded,false,'Float keeps the dash-to-jump test airborne: '+JSON.stringify({x:player.x,y:player.y,feet:player.y+player.h}));
  await page.keyboard.down('Space');
  try{await until(()=>!player.airJumpAvailable&&player.vy<0,'double jump after air dash');}
  catch(error){throw new Error(error.message+' '+JSON.stringify({x:player.x,y:player.y,vy:player.vy,grounded:player.grounded,jumpHeld:player.jumpHeld,airJumpAvailable:player.airJumpAvailable,input:room.inputs.get(player.id)}));}
  await page.keyboard.up('Space');
  await page.keyboard.up('ShiftLeft');
  await until(()=>player.grounded,'landing');await sleep(500);
  async function framed(p){await p.waitForFunction(()=>{const d=document.getElementById('game').dataset;return Math.abs(Number(d.visualCenterX)-Number(d.cameraX)-Number(d.viewWidth)/2)<2&&Math.abs(Number(d.visualCenterY)-Number(d.cameraY)-Number(d.viewHeight)*.6)<2;});}
  await framed(page);
  await page.waitForFunction(()=>document.getElementById('game').dataset.animation==='idle');
  await page.evaluate(()=>{
    const canvas=document.getElementById('game'),d=canvas.dataset;
    window.idleAudit={frames:new Set([d.frameIndex]),rates:new Set([d.animationFps]),min:Number(d.idleBreath),max:Number(d.idleBreath)};
    window.idleObserver=new MutationObserver(()=>{
      if(d.animation!=='idle')return;
      const a=window.idleAudit,angle=Number(d.idleBreath);
      a.frames.add(d.frameIndex);a.rates.add(d.animationFps);a.min=Math.min(a.min,angle);a.max=Math.max(a.max,angle);
    });
    window.idleObserver.observe(canvas,{attributes:true,attributeFilter:['data-frame-index','data-animation-fps','data-idle-breath']});
  });
  await page.waitForFunction(()=>window.idleAudit.max-window.idleAudit.min>.2);
  const idleAudit=await page.evaluate(()=>{window.idleObserver.disconnect();const a=window.idleAudit;return {...a,frames:[...a.frames],rates:[...a.rates]};});
  assert.deepEqual(idleAudit.frames,['0'],'Idle holds the same source pose while breathing');
  assert.deepEqual(idleAudit.rates,['0'],'Idle never cycles inconsistent drawings');
  assert.ok(idleAudit.min>=-1&&idleAudit.max<=1,'Idle breathing stays bounded');
  // Traverse the real canopy with keyboard controls, then render actual grapple/cling states.
  async function walkTo(x){const dir=player.x<x?'ArrowRight':'ArrowLeft';await page.keyboard.down(dir);await until(()=>Math.abs(player.x-x)<40||((dir==='ArrowRight')?player.x>x:player.x<x),'walk to '+x,12000);await page.keyboard.up(dir);await until(()=>Math.abs(player.vx)<1,'brake');}
  async function press(key){
    const held={Space:'jumpHeld',KeyR:'respawnHeld'}[key];
    await page.keyboard.down(key);await until(()=>player[held],key+' press received');
    await page.keyboard.up(key);await until(()=>!player[held],key+' release received');
  }
  await press('KeyR');await until(()=>player.grounded,'respawn landing');
  for(const [x,y] of [[650,1520],[940,1340],[1230,1160]]){
    await walkTo(x-160);
    assert.equal(player.grounded,true,'Jump approach must stay on its supporting ledge: '+JSON.stringify({target:x,x:player.x,y:player.y,vy:player.vy}));
    await page.keyboard.down('ArrowRight');await press('Space');
    await until(()=>player.vy>=-60,'first jump apex');await press('Space');
    await until(()=>player.x>x+40,'cross step');await page.keyboard.up('ArrowRight');
    let highest=player.y;
    try{await until(()=>{highest=Math.min(highest,player.y);return player.grounded&&Math.abs(player.y+player.h-y)<1;},'land on gallery step '+x);}
    catch(error){await page.screenshot({path:'test-results/failed-gallery.png'});throw new Error(error.message+' '+JSON.stringify({x:player.x,y:player.y,vx:player.vx,vy:player.vy,highest,checkpoint:player.checkpoint,input:room.inputs.get(player.id)}));}
  }
  assert.equal(player.checkpoint,1);await framed(page);
  await page.keyboard.down('KeyE');await until(()=>Boolean(player.grappleId),'grapple attach');
  await page.waitForFunction(()=>Boolean(document.getElementById('game').dataset.grapple));
  assert.equal(await page.locator('#game').getAttribute('data-animation'),'grapple');
  await friend.waitForFunction(()=>JSON.parse(document.getElementById('game').dataset.remoteAbilities).some(p=>p.grapple));
  await page.screenshot({path:'test-results/exploration-grapple.png'});await page.keyboard.up('KeyE');await until(()=>!player.grappleId,'grapple release');
  await press('KeyR');await until(()=>player.grounded,'canopy rest respawn');await walkTo(1440);
  await page.keyboard.down('ArrowRight');await page.keyboard.down('ShiftLeft');await until(()=>player.x>1830,'windfall float crossing',7000);
  await page.keyboard.up('ArrowRight');await page.keyboard.up('ShiftLeft');await until(()=>player.grounded,'windfall shelf landing');
  await page.keyboard.down('ArrowRight');await press('Space');await until(()=>player.wallSide===1,'root wall cling');
  await page.waitForFunction(()=>document.getElementById('game').dataset.cling==='1');
  assert.equal(await page.locator('#game').getAttribute('data-animation'),'cling');
  const wallX=player.x,wallY=player.y;
  await page.keyboard.down('KeyQ');await until(()=>player.invulnerable&&player.dashVertical,'upward dash while clinging');
  await friend.waitForFunction(()=>window.renderedPeerStates.has('wallDash'));
  await page.keyboard.up('KeyQ');await until(()=>player.y<wallY-60,'wall dash climbs');assert.equal(player.x,wallX);
  await press('Space');assert.equal(player.airJumpAvailable,false,'Air jump interrupts a wall dash');assert.equal(player.invulnerable,false);
  await until(()=>player.wallSide===1&&player.dashCooldown===0,'return to wall after spending air dash');
  assert.equal(player.airDashAvailable,false,'Cling alone does not refresh an air dash');
  await page.waitForFunction(()=>document.getElementById('dash-state').dataset.ready==='true');
  const repeatY=player.y;
  await page.keyboard.down('KeyQ');
  try{await until(()=>player.invulnerable&&player.dashVertical,'repeat wall dash without landing or jumping away');}
  catch(error){throw new Error(error.message+' '+JSON.stringify({x:player.x,y:player.y,wallSide:player.wallSide,dashHeld:player.dashHeld,dashCooldown:player.dashCooldown,grounded:player.grounded,airDashAvailable:player.airDashAvailable,input:room.inputs.get(player.id),focused:await page.evaluate(()=>document.activeElement?.id)}));}
  await page.keyboard.up('KeyQ');await until(()=>player.y<repeatY-60,'repeated wall dash climbs');
  await press('Space');assert.equal(player.invulnerable,false);
  await until(()=>player.wallSide===1&&player.dashCooldown===0,'cling after repeated wall dash');
  await press('Space');assert.ok(player.x<wallX&&player.vx<0,'Wall jump launches away even while holding toward it');
  assert.equal(player.airJumpAvailable,true);assert.equal(player.airDashAvailable,true,'Wall jump restores the spent air dash');
  await press('Space');assert.equal(player.airJumpAvailable,false,'Double jump remains available after wall jump');
  await page.keyboard.up('ArrowRight');await page.keyboard.down('ArrowLeft');
  await page.keyboard.down('KeyQ');await until(()=>player.invulnerable&&!player.dashVertical,'air dash after wall jump and double jump');
  await page.keyboard.up('KeyQ');await page.keyboard.up('ArrowLeft');
  await page.keyboard.up('ArrowRight');
  await sleep(300);await page.screenshot({path:'test-results/exploration-multiplayer.png'});
  // Menus and focus loss release all held inputs; closing a menu cannot resurrect them.
  await page.keyboard.down('ArrowRight');await page.click('#help-open');assert.ok(await page.locator('#help-dialog').isVisible());
  await sleep(350);assert.equal(player.vx,0);assert.equal(player.grappleId,null);assert.equal(player.invulnerable,false);
  await page.click('#help-close');await page.keyboard.down('ArrowRight');await sleep(350);assert.equal(player.vx,0,'A held-key repeat cannot resume movement after a menu');await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowRight');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await sleep(350);assert.equal(player.vx,0);await page.keyboard.up('ArrowRight');
  for(const ws of game.wss.clients)if(ws.playerId===player.id)ws.close(1012,'Test reconnect');
  await page.waitForFunction(()=>document.getElementById('network-status').textContent==='Reconnecting');
  await page.waitForFunction(()=>document.getElementById('network-status').textContent==='Live');
  await friend.waitForFunction(()=>document.getElementById('player-count').textContent==='2/8 explorers');
  player=[...room.players.values()].find(p=>p.name==='Moss');await until(()=>player.grounded,'reconnected grounded');await framed(page);
  assert.equal(player.sprite,'pillbug','Reconnect keeps the selected character');
  assert.equal(await page.evaluate(()=>localStorage.getItem('mosslight-character')),'pillbug');
  await walkTo(70);await framed(page);
  await page.click('#fullscreen-button');await page.waitForFunction(()=>Boolean(document.fullscreenElement));await layout(page);await page.click('#fullscreen-button');await page.waitForFunction(()=>!document.fullscreenElement);
  await page.click('#settings-open');assert.ok(await page.locator('#settings-dialog').isVisible());
  await page.click('#credits-open');assert.ok(await page.locator('#credits-dialog').isVisible());await page.click('#credits-close');
  await page.setViewportSize({width:1000,height:650});await layout(page);await framed(page);
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const phone=await mobile.newPage();observe(phone);await phone.goto(url);await join(phone,'Sprout');await layout(phone);
  assert.ok(await phone.locator('#touch-controls').isVisible());
  for(const ability of ['left','right','jump','float','grapple','dash'])assert.ok(await phone.locator(`[data-control="${ability}"]`).isVisible());
  const sprout=[...room.players.values()].find(p=>p.name==='Sprout'),before=sprout.x;
  async function hold(control){const box=await phone.locator(`[data-control="${control}"]`).boundingBox();await phone.mouse.move(box.x+box.width/2,box.y+box.height/2);await phone.mouse.down();}
  await hold('right');await until(()=>sprout.x>before+35,'touch walk');await phone.mouse.up();
  await hold('jump');await until(()=>sprout.vy<0,'touch jump');await phone.mouse.up();await sleep(100);
  await hold('dash');await until(()=>sprout.invulnerable,'touch dash');await phone.mouse.up();await until(()=>!sprout.invulnerable,'touch dash expiry');
  await hold('float');await until(()=>sprout.floatActive,'touch float');await phone.mouse.up();
  await until(()=>sprout.grounded,'mobile landing');await framed(phone);await phone.screenshot({path:'test-results/exploration-mobile.png'});
  await phone.setViewportSize({width:844,height:390});await layout(phone);await framed(phone);
  await phone.click('#settings-open');await phone.click('#leave-button');assert.ok(await phone.locator('#join-form').isVisible());
  assert.deepEqual(failures,[],'No browser errors or missing assets');
  console.log('PASS: four selectable whole-character sprites, stable idle/8-fps movement with smooth blends, live peer appearance/reconnect/storage, Q dash (X unbound), cape double jump/float, repeated wall dashes, wall traversal, aerial refresh, parallax, fullscreen/camera framing, multiplayer routes, menus and touch controls.');
  console.log('Screenshots: test-results/exploration-lobby.png, exploration-grapple.png, exploration-multiplayer.png, exploration-mobile.png');
}finally{await browser?.close();await game.close();}
