import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { createGameServer } from '../backend/src/server.mjs';

const game=await createGameServer({port:0,host:'127.0.0.1'});
const failures=[];
let browser;
try {
  const installedChrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  browser=await chromium.launch({headless:true,...(existsSync(installedChrome)?{executablePath:installedChrome}:{})});
  const a=await browser.newContext({viewport:{width:1440,height:1050}});
  const b=await browser.newContext({viewport:{width:1440,height:1050}});
  const page=await a.newPage(),friend=await b.newPage();
  for(const p of [page,friend]) {
    p.on('pageerror',error=>failures.push(error.message));
    p.on('response',response=>{if(response.status()>=400)failures.push(`${response.status()} ${response.url()}`);});
  }
  const url=`http://127.0.0.1:${game.port}/?room=BROWSER`;
  await page.goto(url);await page.waitForSelector('#game[data-assets-ready="true"]');
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/lobby.png',fullPage:true});
  await page.fill('#player-name','Moss');await page.click('#join-button');
  await page.waitForFunction(()=>document.getElementById('network-status').textContent==='Live');
  await friend.goto(url);await friend.fill('#player-name','Fern');await friend.click('#join-button');
  await page.waitForFunction(()=>document.getElementById('player-count').textContent==='2/8 explorers');
  await friend.waitForFunction(()=>document.getElementById('player-count').textContent==='2/8 explorers');
  const room=game.rooms.get('BROWSER');const player=[...room.players.values()].find(p=>p.name==='Moss');
  const start=player.x;
  await page.click('#game');await page.keyboard.down('ArrowRight');
  await page.waitForFunction(x=>Number(document.getElementById('game').dataset.playerX)>x+180,start);
  await page.keyboard.down('Space');
  await new Promise(resolve=>setTimeout(resolve,100));
  assert.ok(player.y<506,'Jump should lift the authoritative player above the ground');
  await page.keyboard.up('Space');
  await page.waitForFunction(()=>Number(document.getElementById('game').dataset.cameraX)>100);
  await page.keyboard.up('ArrowRight');
  assert.ok(player.x>start+250,'Keyboard must move the authoritative player');
  await friend.waitForFunction(()=>[...document.querySelectorAll('#roster span')].some(p=>p.textContent==='Moss'));
  await page.screenshot({path:'test-results/multiplayer.png',fullPage:true});
  // Losing focus releases input rather than allowing a stuck key to carry a player away.
  await page.keyboard.down('ArrowRight');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await new Promise(resolve=>setTimeout(resolve,300));
  assert.equal(player.vx,0);
  await page.keyboard.up('ArrowRight');
  for(const ws of game.wss.clients)if(ws.playerId===player.id)ws.close(1012,'Test reconnect');
  await page.waitForFunction(()=>document.getElementById('network-status').textContent==='Reconnecting');
  await page.waitForFunction(()=>document.getElementById('network-status').textContent==='Live');
  await friend.waitForFunction(()=>document.getElementById('player-count').textContent==='2/8 explorers');
  await page.click('#credits-open');assert.ok(await page.locator('#credits-dialog').isVisible());await page.click('#credits-close');
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const phone=await mobile.newPage();phone.on('pageerror',error=>failures.push(error.message));
  await phone.goto(url);await phone.fill('#player-name','Sprout');await phone.click('#join-button');
  await phone.waitForFunction(()=>document.getElementById('network-status').textContent==='Live');
  assert.ok(await phone.locator('#touch-controls').isVisible());
  const before=await phone.locator('#game').getAttribute('data-player-x');
  await phone.locator('[data-control="right"]').dispatchEvent('pointerdown',{pointerId:1});
  await phone.waitForFunction(x=>Number(document.getElementById('game').dataset.playerX)>Number(x)+35,before);
  await phone.locator('[data-control="right"]').dispatchEvent('pointerup',{pointerId:1});
  assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Mobile layout should not overflow horizontally');
  await phone.screenshot({path:'test-results/mobile.png',fullPage:true});
  await phone.click('#leave-button');assert.ok(await phone.locator('#join-form').isVisible());
  assert.deepEqual(failures,[],'Browser should load without errors or missing assets');
  console.log('PASS: asset loading, two browser players, walking, jumping, camera following, blur release, reconnection, credits, mobile controls/layout, and leaving.');
  console.log('Screenshots: test-results/lobby.png, multiplayer.png, mobile.png');
} finally { await browser?.close();await game.close(); }
