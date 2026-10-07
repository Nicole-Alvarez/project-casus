import './style.css';
import { DT, LEVEL } from '../../shared/level.mjs';
import { createPlayer, stepPlayer } from '../../shared/physics.mjs';
import { loadSprites, Sounds, characterPath } from './assets.mjs';
import { Input } from './input.mjs';
import { Connection } from './network.mjs';
import { Renderer } from './renderer.mjs';

const $ = id => document.getElementById(id);
const canvas=$('game'), form=$('join-form'), input=new Input(canvas), sounds=new Sounds();
const preview=createPlayer('preview','You',0);preview.x=780;preview.grounded=true;
const state={ preview:true, local:preview, players:[preview], collected:[], offsetX:0, offsetY:0 };
const remote=new Map();
let renderer, rosterKey='', completedDismissed=false, lastInputKey='', toastTimer;
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomRoom=() => Array.from(crypto.getRandomValues(new Uint8Array(5)),n=>alphabet[n%alphabet.length]).join('');
const initialRoom=new URL(location.href).searchParams.get('room');
$('room-code').value=/^[a-z0-9]{3,12}$/i.test(initialRoom ?? '') ? initialRoom.toUpperCase() : randomRoom();
try { $('player-name').value=localStorage.getItem('mosslight-name')?.slice(0,18) || 'Explorer'; } catch { /* Storage is optional. */ }
$('coin-total').textContent=`/ ${LEVEL.coins.length}`;
$('new-room').addEventListener('click',() => { $('room-code').value=randomRoom(); });

function toast(text) { clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>{$('toast').hidden=true;},3500); }
function showGame(playing) {
  form.hidden=playing;$('preview-caption').hidden=playing;
  for(const id of ['game-hud','stage-bottom'])$(id).hidden=!playing;
  $('touch-controls').hidden=!playing || !matchMedia('(pointer: coarse)').matches;
}
function updateRoster(players) {
  const key=players.map(p=>p.id+p.name).join('|');
  if(key===rosterKey)return;rosterKey=key;
  $('roster').replaceChildren(...players.map(p=>{
    const chip=document.createElement('div');chip.className='player-chip';
    const img=document.createElement('img');img.src=characterPath(p.slot);img.alt='';
    const label=document.createElement('span');label.textContent=p.name+(p.id===state.local?.id?' (you)':'');
    chip.append(img,label);return chip;
  }));
}
const connection=new Connection({
  onStatus(status) {
    $('network-status').textContent=status;$('network-dot').style.background=status==='Live'?'#b4e7bb':'#f0c57d';
    if(status!=='Live'){input.release();input.active=false;}
  },
  onError(message) {
    input.active=false;input.release();state.preview=true;state.local=preview;state.players=[preview];state.collected=[];
    showGame(false);$('join-error').textContent=message;$('join-error').hidden=false;
    $('join-button').disabled=false;$('join-button').firstChild.textContent='Start exploring ';$('completion').hidden=true;
  },
  onMessage(message) {
    const player=message.players.find(p=>p.id===(message.type==='welcome'?message.id:state.local?.id));
    if(!player)return;
    if(message.type==='welcome') {
      state.local={...player};state.preview=false;state.offsetX=0;state.offsetY=0;remote.clear();
      showGame(true);input.active=true;$('join-button').disabled=false;canvas.focus({preventScroll:true});
      const url=new URL(location.href);url.searchParams.set('room',message.room);history.replaceState(null,'',url);
    } else {
      const dx=state.local.x-player.x,dy=state.local.y-player.y;
      state.offsetX=Math.abs(dx)<120?state.offsetX+dx:0;state.offsetY=Math.abs(dy)<120?state.offsetY+dy:0;
      Object.assign(state.local,player);
    }
    if(message.collected.length>state.collected.length)sounds.play('coin');
    state.collected=message.collected;
    for(const p of message.players)if(p.id!==state.local.id) {
      const existing=remote.get(p.id);
      if(existing){existing.target={...p};Object.assign(existing,{name:p.name,color:p.color,slot:p.slot});}
      else remote.set(p.id,{...p,target:{...p}});
    }
    for(const id of remote.keys())if(!message.players.some(p=>p.id===id))remote.delete(id);
    state.players=[state.local,...remote.values()];
    $('player-count').textContent=`${state.players.length}/8 explorers`;
    $('coin-count').textContent=state.collected.length;
    updateRoster(state.players);
    if(message.completed&&!completedDismissed) {
      if($('completion').hidden)sounds.play('magic');
      $('completion').hidden=false;$('completion-score').textContent=`Your expedition gathered ${state.collected.length} of ${LEVEL.coins.length} coins.`;
    }
  },
});

const loading=loadSprites().then(sprites=>{renderer=new Renderer(canvas,sprites);canvas.dataset.assetsReady='true';}).catch(error=>{$('join-error').textContent=error.message;$('join-error').hidden=false;throw error;});
form.addEventListener('submit',async event=>{
  event.preventDefault();$('join-error').hidden=true;
  const name=$('player-name').value.trim();const room=$('room-code').value.trim().toUpperCase();
  if(!name || !/^[a-z0-9]{3,12}$/i.test(room)){ $('join-error').textContent='Enter a name and a 3–12 letter or number expedition code.';$('join-error').hidden=false;return; }
  try { await loading; } catch { return; }
  try { localStorage.setItem('mosslight-name',name); } catch { /* Storage is optional. */ }
  completedDismissed=false;$('completion').hidden=true;
  $('join-button').disabled=true;$('join-button').firstChild.textContent='Joining expedition… ';
  connection.join(room,name);
});
$('invite-button').addEventListener('click',async()=>{
  try { await navigator.clipboard.writeText(location.href);toast('Expedition link copied. Send it to a friend!'); }
  catch { toast(`Share this link: ${location.href}`); }
});
$('leave-button').addEventListener('click',()=>{
  connection.disconnect();input.release();input.active=false;
  state.preview=true;state.local=preview;state.players=[preview];state.collected=[];state.offsetX=0;state.offsetY=0;remote.clear();
  showGame(false);$('completion').hidden=true;$('join-button').disabled=false;$('join-button').firstChild.textContent='Start exploring ';
  $('level-progress').style.width='0%';$('progress-caption').textContent='THE ADVENTURE STARTS HERE';
});
$('continue-button').addEventListener('click',()=>{completedDismissed=true;$('completion').hidden=true;canvas.focus({preventScroll:true});});
const soundButton=document.createElement('button');soundButton.className='hud-button muted';soundButton.id='sound-button';soundButton.textContent='Sound off';soundButton.setAttribute('aria-pressed','false');
$('leave-button').before(soundButton);
soundButton.addEventListener('click',()=>{sounds.enabled=!sounds.enabled;soundButton.textContent=sounds.enabled?'Sound on':'Sound off';soundButton.setAttribute('aria-pressed',String(sounds.enabled));if(sounds.enabled)sounds.play('coin');canvas.focus({preventScroll:true});});
$('credits-open').addEventListener('click',()=>{input.release();connection.input(input.read());$('credits-dialog').showModal();});
$('credits-close').addEventListener('click',()=>{$('credits-dialog').close();});
$('credits-dialog').addEventListener('close',()=>{if(connection.ready)canvas.focus({preventScroll:true});});
window.addEventListener('blur',()=>connection.input(input.read()));
document.addEventListener('visibilitychange',()=>{if(document.hidden)connection.input(input.read());});
window.addEventListener('pagehide',()=>connection.disconnect());
setInterval(()=>connection.input(input.read()),50);

let previous=performance.now(),accumulator=0;
function frame(now) {
  const elapsed=Math.min((now-previous)/1000,.1);previous=now;accumulator+=elapsed;
  if(connection.ready) {
    const controls=input.read();const key=JSON.stringify(controls);
    if(key!==lastInputKey){lastInputKey=key;connection.input(controls);}
    while(accumulator>=DT) {
      const jumped=controls.jump&&!state.local.jumpHeld&&state.local.grounded;
      stepPlayer(state.local,controls,DT);if(jumped)sounds.play('jump');accumulator-=DT;
    }
    state.offsetX*=Math.exp(-15*elapsed);state.offsetY*=Math.exp(-15*elapsed);
    for(const p of remote.values()) { const t=p.target; p.x+=(t.x-p.x)*(1-Math.exp(-18*elapsed));p.y+=(t.y-p.y)*(1-Math.exp(-18*elapsed));p.vx=t.vx;p.facing=t.facing;p.grounded=t.grounded; }
    const progress=Math.round(state.local.x/LEVEL.width*100);
    $('level-progress').style.width=`${progress}%`;$('progress-caption').textContent=`${progress}% OF THE TRAIL EXPLORED`;
  } else accumulator=0;
  if(renderer)renderer.draw(state,now/1000,elapsed);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
