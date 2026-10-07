import './style.css';
import { DT,LEVEL } from '../../shared/level.mjs';
import { createPlayer,stepPlayer,selectGrappleAnchor,NEUTRAL } from '../../shared/physics.mjs';
import { loadSprites,Sounds } from './assets.mjs';
import { Input } from './input.mjs';
import { Connection } from './network.mjs';
import { Renderer } from './renderer.mjs';
import {CHARACTERS,DEFAULT_CHARACTER,isCharacter} from '../../shared/characters.mjs';
const $=id=>document.getElementById(id),canvas=$('game'),form=$('join-form'),input=new Input(canvas),sounds=new Sounds();
const preview=createPlayer('preview','You',0);
let selectedCharacter=DEFAULT_CHARACTER;
try{const saved=localStorage.getItem('mosslight-character');if(isCharacter(saved))selectedCharacter=saved;}catch{/* Optional storage. */}
preview.sprite=selectedCharacter;
for(const id of ['character-select','character-setting']){
  const select=$(id);select.replaceChildren(...CHARACTERS.map(character=>{
    const option=document.createElement('option');option.value=character.id;option.textContent=character.letter+' · '+character.name;return option;
  }));select.value=selectedCharacter;
  select.addEventListener('change',()=>{
    if(!isCharacter(select.value))return;
    selectedCharacter=select.value;preview.sprite=selectedCharacter;
    for(const other of ['character-select','character-setting'])$(other).value=selectedCharacter;
    try{localStorage.setItem('mosslight-character',selectedCharacter);}catch{/* Optional storage. */}
    connection.appearance(selectedCharacter);
    if(connection.ready)state.local.sprite=selectedCharacter;
  });
}
stepPlayer(preview);
const state={preview:true,local:preview,players:[preview],offsetX:0,offsetY:0};
const remote=new Map();
let renderer,rosterKey='',lastInputKey='',toastTimer;
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomRoom=()=>Array.from(crypto.getRandomValues(new Uint8Array(5)),n=>alphabet[n%alphabet.length]).join('');
const initialRoom=new URL(location.href).searchParams.get('room');
$('room-code').value=/^[a-z0-9]{3,12}$/i.test(initialRoom??'')?initialRoom.toUpperCase():randomRoom();
try{$('player-name').value=localStorage.getItem('mosslight-name')?.slice(0,18)||'Explorer';}catch{/* Optional storage. */}
$('new-room').addEventListener('click',()=>{$('room-code').value=randomRoom();});
function toast(text){clearTimeout(toastTimer);const el=$('toast');(document.querySelector('dialog[open]')??document.querySelector('.world')).append(el);el.textContent=text;el.hidden=false;toastTimer=setTimeout(()=>{el.hidden=true;},3500);}
function showGame(playing){form.hidden=playing;$('preview-caption').hidden=playing;for(const id of ['game-hud','stage-bottom'])$(id).hidden=!playing;for(const id of ['invite-button','leave-button'])$(id).disabled=!playing;const touch=matchMedia('(any-pointer: coarse)').matches||navigator.maxTouchPoints>0;document.querySelector('.world').classList.toggle('touch-enabled',touch);$('touch-controls').hidden=!playing||!touch;}
function resetPreview(){input.release();input.active=false;state.preview=true;state.local=preview;state.players=[preview];state.offsetX=0;state.offsetY=0;remote.clear();showGame(false);$('join-button').disabled=false;$('join-button').innerHTML='Enter the sanctuary <span>→</span>';}
function updateRoster(players){
  const key=players.map(p=>p.id+p.name).join('|');if(key===rosterKey)return;rosterKey=key;
  $('roster').replaceChildren(...players.map(p=>{const chip=document.createElement('div');chip.className='player-chip';chip.dataset.playerId=p.id;
    const color=document.createElement('span');color.className='player-color';color.style.background=p.color;
    const label=document.createElement('span');label.textContent=p.name+(p.id===state.local.id?' (you)':'');chip.append(color,label);return chip;}));
}
function updateAbilities(){
  const p=state.local,a=selectGrappleAnchor(p);
  for(const [id,glyph,label,description,ready,active] of [
    ['jump-state','↑','Jump',p.grounded?'Space · Two jumps ready':p.airJumpAvailable?'Space · Air jump ready':'Land or cling to refresh jumps',p.grounded||p.airJumpAvailable,false],
    ['float-state','⇣','Float','Hold Shift while falling',!p.grounded,p.floatActive],
    ['cling-state','⋮','Cling','Hold toward a wall; Space to jump away',Boolean(p.wallSide),Boolean(p.wallSide)],
    ['grapple-state','E','Silk',p.grappleId?'Release E to detach':a?'Hold E to grapple':'Find a highlighted silk anchor',Boolean(a)||Boolean(p.grappleId),Boolean(p.grappleId)],
    ['dash-state','Q','Dash',p.invulnerable?'Dashing':p.dashCooldown>0?`Dash ready in ${p.dashCooldown.toFixed(1)}s`:p.wallSide?'Q · Wall dash ready':p.airDashAvailable?'Q · Dash ready':'Land, wall jump or hold against a wall to dash',p.dashCooldown===0&&Boolean(p.grounded||p.wallSide||p.airDashAvailable),p.invulnerable],
  ]){const el=$(id);if(el.textContent!==glyph)el.textContent=glyph;el.dataset.label=label;el.title=description;el.setAttribute('aria-label',description);el.dataset.ready=String(ready);el.dataset.active=String(active);}
  $('rest-name').textContent=LEVEL.checkpoints[p.checkpoint].name;
}
const connection=new Connection({
  onStatus(status){$('network-status').textContent=status;$('network-dot').style.background=status==='Live'?'#b4e7bb':'#f0c57d';if(status!=='Live'){input.release();input.active=false;}},
  onError(message){resetPreview();$('join-error').textContent=message;$('join-error').hidden=false;},
  onMessage(message){
    const player=message.players.find(p=>p.id===(message.type==='welcome'?message.id:state.local.id));if(!player)return;
    if(message.type==='welcome'){
      state.local={...player};state.preview=false;state.offsetX=0;state.offsetY=0;remote.clear();showGame(true);input.active=!document.querySelector('dialog[open]');$('join-button').disabled=false;canvas.focus({preventScroll:true});
      renderer?.resetCamera();const url=new URL(location.href);url.searchParams.set('room',message.room);history.replaceState(null,'',url);
    }else{
      const dx=state.local.x-player.x,dy=state.local.y-player.y;
      state.offsetX=Math.abs(dx)<120?state.offsetX+dx:0;state.offsetY=Math.abs(dy)<120?state.offsetY+dy:0;Object.assign(state.local,player);
    }
    for(const p of message.players)if(p.id!==state.local.id){
      const existing=remote.get(p.id);if(existing)existing.target={...p};else remote.set(p.id,{...p,target:{...p}});
    }
    for(const id of remote.keys())if(!message.players.some(p=>p.id===id))remote.delete(id);
    state.players=[state.local,...remote.values()];$('player-count').textContent=`${state.players.length}/8 explorers`;updateRoster(state.players);
  },
});
const loading=loadSprites().then(sprites=>{renderer=new Renderer(canvas,sprites);canvas.dataset.assetsReady='true';return true;}).catch(error=>{$('join-error').textContent=error.message;$('join-error').hidden=false;return false;});
showGame(false);
form.addEventListener('submit',async event=>{
  event.preventDefault();$('join-error').hidden=true;const name=$('player-name').value.trim(),room=$('room-code').value.trim().toUpperCase();
  if(!name||!/^[a-z0-9]{3,12}$/i.test(room)){$('join-error').textContent='Enter a name and a 3–12 letter or number expedition code.';$('join-error').hidden=false;return;}
  if(!await loading)return;try{localStorage.setItem('mosslight-name',name);}catch{/* Optional storage. */}
  $('join-button').disabled=true;$('join-button').textContent='Joining expedition…';connection.join(room,name,selectedCharacter);
});
$('invite-button').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);toast('Expedition link copied. Share it with a friend.');}catch{toast(`Share this link: ${location.href}`);}canvas.focus({preventScroll:true});});
$('leave-button').addEventListener('click',()=>{connection.input(NEUTRAL);connection.disconnect();for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();resetPreview();renderer?.resetCamera();});
$('sound-button').addEventListener('click',()=>{sounds.enabled=!sounds.enabled;$('sound-button').textContent=sounds.enabled?'Sound on':'Sound off';$('sound-button').setAttribute('aria-pressed',String(sounds.enabled));if(sounds.enabled)sounds.play('magic');canvas.focus({preventScroll:true});});
for(const kind of ['help','credits','settings']){
  $(kind+'-open').addEventListener('click',()=>{input.release();input.active=false;connection.input(NEUTRAL);for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();$(kind+'-dialog').showModal();});
  $(kind+'-close').addEventListener('click',()=>{$(kind+'-dialog').close();});
  $(kind+'-dialog').addEventListener('close',()=>{input.release();input.active=connection.ready&&!document.querySelector('dialog[open]');if(input.active)canvas.focus({preventScroll:true});});
}
$('fullscreen-button').addEventListener('click',async()=>{input.release();connection.input(NEUTRAL);try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Browser fullscreen is unavailable. The game still fills your viewport.');}canvas.focus({preventScroll:true});});
window.addEventListener('blur',()=>connection.input(NEUTRAL));
document.addEventListener('visibilitychange',()=>{if(document.hidden)connection.input(NEUTRAL);});
window.addEventListener('pagehide',()=>connection.disconnect());
setInterval(()=>connection.input(input.read()),50);
let previous=performance.now(),accumulator=0;
function frame(now){
  const elapsed=Math.min((now-previous)/1000,.1);previous=now;accumulator+=elapsed;
  if(connection.ready){
    const controls=input.read(),key=JSON.stringify(controls);if(key!==lastInputKey){lastInputKey=key;connection.input(controls);}
    while(accumulator>=DT){const jumped=controls.jump&&!state.local.jumpHeld;stepPlayer(state.local,controls,DT);if(jumped)sounds.play('jump');accumulator-=DT;}
    state.offsetX*=Math.exp(-15*elapsed);state.offsetY*=Math.exp(-15*elapsed);
    for(const p of remote.values()){const t=p.target,x=p.x+(t.x-p.x)*(1-Math.exp(-18*elapsed)),y=p.y+(t.y-p.y)*(1-Math.exp(-18*elapsed));Object.assign(p,t,{x,y});}
    updateAbilities();
  }else accumulator=0;
  if(renderer)renderer.draw(state,now/1000,elapsed);requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
