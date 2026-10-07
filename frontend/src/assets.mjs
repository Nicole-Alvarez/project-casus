import {CHARACTERS,DEFAULT_CHARACTER,isCharacter} from '../../shared/characters.mjs';
import {SPRITE_FRAMES} from './sprite-frames.mjs';
const ROOT='/game-assets/';
const ART=ROOT+'generated/sanctuary/';
export const CHARACTER={bodyHeight:52};
export const CAMERA_ZOOM=1.4;
export const ANIMATION_FPS=8;
export const IDLE_FPS=3;
export const ANIMATIONS=SPRITE_FRAMES;
export const RUNTIME_ART={
  cavern:ART+'backgrounds/cavern.png',
  ...Object.fromEntries(CHARACTERS.flatMap(({id})=>['ground','air','special'].map(group=>[id+'-'+group,ART+'characters/'+id+'/'+group+'.png']))),
};
export const PARALLAX=[{id:'cavern',x:.10,y:.045},{id:'arches',x:.28,y:.12},{id:'roots',x:.52,y:.20}];
export function getAnimationState(p){
  if(p.invulnerable)return p.dashVertical?'wallDash':'dash';
  if(p.grappleId)return 'grapple';
  if(p.wallSide)return 'cling';
  if(p.floatActive)return 'float';
  if(p.grounded)return Math.abs(p.vx)>15?'run':'idle';
  return p.vy<0?(p.airJumpAvailable?'jump':'doubleJump'):'fall';
}
export function getAnimationFrame(sprite,state,elapsed){
  const skin=isCharacter(sprite)?sprite:DEFAULT_CHARACTER;
  const clip=SPRITE_FRAMES[skin][state]??SPRITE_FRAMES[skin].idle;
  const fps=clip===SPRITE_FRAMES[skin].idle?IDLE_FPS:ANIMATION_FPS;
  const clock=Math.max(0,elapsed)*fps,position=Math.floor(clock);
  const index=clip.loop?position%clip.frames.length:Math.min(position,clip.frames.length-1);
  const next=clip.loop?(index+1)%clip.frames.length:Math.min(index+1,clip.frames.length-1);
  // Hold the drawing, then ease into the next complete pose over 70 ms.
  const mix=next===index?0:ease((clock-position-1+.07*fps)/(.07*fps));
  return {frame:clip.frames[index],index,fps,nextFrame:clip.frames[next],mix};
}
const ease=t=>{const x=Math.max(0,Math.min(1,t));return x*x*(3-2*x);};
const meanHeight=clip=>clip.frames.reduce((sum,f)=>sum+f.sh*f.scale,0)/clip.frames.length;
const magnifications=Object.fromEntries(Object.entries(SPRITE_FRAMES).map(([skin,clips])=>{
  const reference=meanHeight(clips.idle);
  return [skin,{float:Math.max(1,Math.min(1.35,reference/meanHeight(clips.float))),
    dash:Math.max(1,Math.min(1.35,reference*.9/meanHeight(clips.dash)))}];
}));
export function getDisplayMagnification(sprite,state){
  return magnifications[isCharacter(sprite)?sprite:DEFAULT_CHARACTER][state]??1;
}
function mergeLayers(layers){
  const weights=new Map();
  for(const {frame,weight} of layers)if(weight>0)weights.set(frame,(weights.get(frame)??0)+weight);
  const total=[...weights.values()].reduce((sum,w)=>sum+w,0);
  return [...weights].map(([frame,weight])=>({frame,weight:weight/total}));
}
// Each sample contains complete drawings. Source images and body parts never change.
export class CharacterAnimation {
  sample(sprite,state,time){
    if(this.sprite!==sprite){this.sprite=sprite;this.state=state;this.since=time;this.from=null;}
    else if(this.state!==state){this.from=this.last;this.state=state;this.since=time;}
    const frame=getAnimationFrame(sprite,state,time-this.since);
    const layers=mergeLayers([{frame:frame.frame,weight:1-frame.mix},{frame:frame.nextFrame,weight:frame.mix}]);
    let magnification=getDisplayMagnification(sprite,state),mixed=layers;
    if(this.from){
      const amount=ease((time-this.since)/.12);
      magnification=this.from.magnification+(magnification-this.from.magnification)*amount;
      mixed=mergeLayers([...this.from.layers.map(l=>({...l,weight:l.weight*(1-amount)})),...layers.map(l=>({...l,weight:l.weight*amount}))]);
      if(amount===1)this.from=null;
    }
    const headHeight=mixed.reduce((sum,l)=>sum+(l.frame.pivotY-l.frame.shellCenterY)*l.frame.scale*l.weight,0)*magnification;
    return this.last={state,...frame,layers:mixed,magnification,headHeight};
  }
}
// Prepare a complete pose once. Connected-alpha extraction excludes neighboring
// swords/capes in overlapping atlas rectangles, retaining antialiased edges.
// It never assembles, bends or independently animates body parts.
function extractPose(image,f){
  const canvas=document.createElement('canvas');canvas.width=f.sw;canvas.height=f.sh;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(image,f.sx,f.sy,f.sw,f.sh,0,0,f.sw,f.sh);
  const pixels=ctx.getImageData(0,0,f.sw,f.sh),data=pixels.data,count=f.sw*f.sh;
  const mask=new Uint8Array(count),queue=new Int32Array(count);
  const seed=f.seedY*f.sw+f.seedX;
  if(data[seed*4+3]<160)throw new Error('Invalid pose anchor: '+f.sheet);
  let start=0,end=1;queue[0]=seed;mask[seed]=1;
  while(start<end){
    const i=queue[start++],x=i%f.sw,y=Math.floor(i/f.sw);
    for(const j of [x>0?i-1:-1,x+1<f.sw?i+1:-1,y>0?i-f.sw:-1,y+1<f.sh?i+f.sw:-1]){
      if(j>=0&&!mask[j]&&data[j*4+3]>=160){mask[j]=1;queue[end++]=j;}
    }
  }
  for(let pass=0;pass<2;pass++){
    const next=mask.slice();
    for(let i=0;i<count;i++){
      if(mask[i]||!data[i*4+3])continue;
      const x=i%f.sw,y=Math.floor(i/f.sw);
      if((x>0&&mask[i-1])||(x+1<f.sw&&mask[i+1])||(y>0&&mask[i-f.sw])||(y+1<f.sh&&mask[i+f.sw]))next[i]=1;
    }
    mask.set(next);
  }
  for(let i=0;i<count;i++)if(!mask[i])data[i*4+3]=0;
  ctx.putImageData(pixels,0,0);return canvas;
}
export async function loadSprites(){
  const sprites=Object.fromEntries(await Promise.all(Object.entries(RUNTIME_ART).map(([key,path])=>new Promise((resolve,reject)=>{
    const image=new Image();image.onload=()=>resolve([key,image]);image.onerror=()=>reject(new Error('Could not load '+path));image.src=path;
  }))));
  sprites.frames=new Map();
  for(const clips of Object.values(SPRITE_FRAMES))for(const clip of Object.values(clips))for(const frame of clip.frames)
    sprites.frames.set(frame,extractPose(sprites[frame.sheet],frame));
  return sprites;
}
export class Sounds {
  enabled=false;
  constructor(){this.tracks=Object.fromEntries(['jump','magic'].map(name=>{const audio=new Audio(ROOT+'kenney-new-platformer/audio/sfx_'+name+'.ogg');audio.volume=.18;audio.preload='none';return [name,audio];}));}
  play(name){if(!this.enabled)return;const track=this.tracks[name];if(!track)return;track.currentTime=0;track.play().catch(()=>{});}
}
