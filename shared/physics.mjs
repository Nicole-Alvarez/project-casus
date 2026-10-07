import { LEVEL,COLORS,DT } from './level.mjs';
import {DEFAULT_CHARACTER,isCharacter} from './characters.mjs';
import { overlaps,moveAxis,segmentIntersectsRect } from './geometry.mjs';
export const NEUTRAL=Object.freeze({left:false,right:false,jump:false,respawn:false,float:false,grapple:false,dash:false});
const center=p=>({x:p.x+p.w/2,y:p.y+p.h/2});
export const cameraTarget=(center,viewportSize,anchor=.5)=>center-viewportSize*anchor;
export const canTakeDamage=p=>!(p.dashTime>0 && p.invulnerable);
export function createPlayer(id,name,slot,sprite=DEFAULT_CHARACTER) {
  const p={id,name,slot,sprite:isCharacter(sprite)?sprite:DEFAULT_CHARACTER,color:COLORS[slot%COLORS.length],w:26,h:44,facing:1,checkpoint:0};
  respawn(p);p.x+=(slot%4)*38;return p;
}
export function respawn(p) {
  const rest=LEVEL.checkpoints[p.checkpoint];
  Object.assign(p,{x:rest.x,y:rest.y,vx:0,vy:0,grounded:false,airJumpAvailable:true,wallSide:0,wallLock:0,floatActive:false,grappleId:null,dashTime:0,dashDirection:0,dashVertical:false,dashCooldown:0,airDashAvailable:true,invulnerable:false,jumpHeld:false,grappleHeld:false,dashHeld:false,respawnHeld:false});
}
export function selectGrappleAnchor(p) {
  const c=center(p);
  return LEVEL.anchors.map(a=>({a,d:Math.hypot(a.x-c.x,a.y-c.y)}))
    .filter(({a,d})=>d>32 && d<=420 && a.y<c.y+60 && !LEVEL.platforms.some(r=>segmentIntersectsRect(c,a,r)))
    .sort((a,b)=>a.d-b.d || a.a.id.localeCompare(b.a.id))[0]?.a ?? null;
}
const stopDash=p=>{p.dashTime=0;p.dashVertical=false;p.invulnerable=false;};
export function stepPlayer(p,input=NEUTRAL,dt=DT) {
  if(input.respawn&&!p.respawnHeld){respawn(p);p.respawnHeld=true;return;}
  p.respawnHeld=input.respawn;
  p.dashTime=Math.max(0,p.dashTime-dt);p.dashCooldown=Math.max(0,p.dashCooldown-dt);p.wallLock=Math.max(0,p.wallLock-dt);
  if(p.dashTime===0)p.dashVertical=false;
  const direction=Number(input.right)-Number(input.left),jump=input.jump&&!p.jumpHeld;
  // Contact during ascent also permits a wall dash, without requiring descent.
  const wallContact=!p.grounded&&direction&&LEVEL.platforms.some(r=>overlaps({...p,x:p.x+direction*.5},r));
  if(direction && p.wallLock===0)p.facing=direction;
  // A fresh jump cancels a tether/dash; wall launch precedes the ordinary jump budget.
  if(jump) {
    if(p.wallSide){p.vx=-p.wallSide*420;p.facing=-p.wallSide;p.vy=-620;p.wallLock=.16;p.airJumpAvailable=true;p.airDashAvailable=true;p.grounded=false;}
    else if(p.grounded){p.vy=-620;p.grounded=false;}
    else if(p.airJumpAvailable){p.vy=-570;p.airJumpAvailable=false;}
    p.grappleId=null;stopDash(p);
  }
  if(input.dash&&!p.dashHeld && p.dashCooldown===0 && (p.grounded||wallContact||p.airDashAvailable)) {
    p.dashTime=.09;p.dashCooldown=.8;p.airDashAvailable=false;p.airJumpAvailable=true;p.dashVertical=Boolean(wallContact);p.dashDirection=p.wallLock>0?(Math.sign(p.vx)||p.facing):(direction||p.facing);p.grappleId=null;p.wallSide=0;
  }
  if(!input.grapple||jump||p.dashTime>0)p.grappleId=null;
  else if(!p.grappleHeld){p.grappleId=selectGrappleAnchor(p)?.id??null;}
  p.jumpHeld=input.jump;p.dashHeld=input.dash;p.grappleHeld=input.grapple;p.floatActive=false;
  let grappling=false;
  if(p.dashTime>0){p.vx=p.dashVertical?0:p.dashDirection*900;p.vy=p.dashVertical?-900:0;p.wallSide=0;}
  else {
    if(p.wallLock===0){const target=direction*300,delta=(direction?2200:2600)*dt;p.vx+=Math.sign(target-p.vx)*Math.min(Math.abs(target-p.vx),delta);}
    const a=LEVEL.anchors.find(a=>a.id===p.grappleId),c=center(p);
    if(a){const d=Math.hypot(a.x-c.x,a.y-c.y);if(d<=22||LEVEL.platforms.some(r=>segmentIntersectsRect(c,a,r)))p.grappleId=null;
      else {grappling=true;p.vx=(a.x-c.x)/d*750;p.vy=(a.y-c.y)/d*750;}}
    if(!grappling){p.vy=Math.min(900,p.vy+1550*dt);if(input.float&&p.vy>0){p.vy=Math.min(110,p.vy);p.floatActive=true;}}
  }
  // Sweeps stop at the earliest solid even when one tick travels beyond a thin wall.
  const hitX=moveAxis(p,p.vx*dt,'x',LEVEL.platforms);
  if(hitX){p.vx=0;stopDash(p);p.grappleId=null;}
  const bounded=Math.max(0,Math.min(LEVEL.width-p.w,p.x));if(bounded!==p.x){p.x=bounded;p.vx=0;stopDash(p);p.grappleId=null;}
  const descending=p.vy>=0,hitY=moveAxis(p,p.vy*dt,'y',LEVEL.platforms);
  // A horizontal dash has zero vertical motion but can still be supported by the floor.
  p.grounded=(hitY&&descending)||(p.vy===0&&LEVEL.platforms.some(r=>Math.abs(p.y+p.h-r.y)<1e-7&&p.x<r.x+r.w&&p.x+p.w>r.x));
  if(hitY){p.vy=0;stopDash(p);p.grappleId=null;p.floatActive=false;}
  p.wallSide=0;
  // Cling never lifts a player: contact refreshes the air jump only on descent.
  if(!p.grounded && !grappling && p.dashTime===0 && p.wallLock===0 && p.vy>=0 && direction) {
    const probe={...p,x:p.x+direction*.5};
    if(LEVEL.platforms.some(r=>overlaps(probe,r))){p.wallSide=direction;p.vy=0;p.floatActive=false;p.airJumpAvailable=true;}
  }
  if(p.grounded){p.airJumpAvailable=true;p.airDashAvailable=true;p.wallLock=0;}
  p.invulnerable=p.dashTime>0;
  // Proximity in both axes prevents the lower trail from activating upper rests.
  for(let i=0;i<LEVEL.checkpoints.length;i++){const r=LEVEL.checkpoints[i];if(Math.hypot(p.x-r.x,p.y-r.y)<65)p.checkpoint=i;}
  if(p.y>LEVEL.height+60)respawn(p);
}
export const createRoom=code=>({code,players:new Map(),inputs:new Map(),tick:0});
export function stepRoom(room,dt=DT){room.tick++;for(const p of room.players.values())stepPlayer(p,room.inputs.get(p.id)??NEUTRAL,dt);}
export const roomSnapshot=room=>({type:'snapshot',tick:room.tick,players:[...room.players.values()]});
