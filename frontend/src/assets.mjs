import {CHARACTERS,DEFAULT_CHARACTER,isCharacter} from '../../shared/characters.mjs';
import {SPRITE_FRAMES} from './sprite-frames.mjs';
import {getIdleMotion,prepareIdleMotion} from './idle-motion.mjs';
export {getIdleMotion} from './idle-motion.mjs';
const ROOT='/game-assets/';
const ART=ROOT+'generated/sanctuary/';
export const CHARACTER={bodyHeight:52};
export const CAMERA_ZOOM=1.4;
export const ANIMATION_FPS=8;
// Idle holds one drawing with local cape motion and breathing.
export const IDLE_FPS=0;
export const ANIMATIONS=SPRITE_FRAMES;
export const RUNTIME_ART={
  cavern:ART+'backgrounds/cavern.png',
  ...Object.fromEntries(CHARACTERS.flatMap(({id})=>['ground','air','special','movement'].map(group=>[id+'-'+group,ART+'characters/'+id+'/'+group+'.png']))),
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
  if(clip===SPRITE_FRAMES[skin].idle)return {frame:clip.frames[0],index:0,fps:IDLE_FPS,nextFrame:clip.frames[0],mix:0};
  const fps=ANIMATION_FPS;
  const clock=Math.max(0,elapsed)*fps,position=Math.floor(clock);
  const sequence=clip.sequence;
  const at=n=>sequence ? sequence[n<sequence.length?n:(clip.loopFrom??0)+(n-sequence.length)%(sequence.length-(clip.loopFrom??0))]
    :clip.loop?n%clip.frames.length:Math.min(n,clip.frames.length-1);
  const index=at(position),next=at(position+1);
  // Movement eases continuously between complete drawings.
  const fraction=clock-position;
  const mix=next===index?0:ease(fraction);
  return {frame:clip.frames[index],index,fps,nextFrame:clip.frames[next],mix};
}
const ease=t=>{const x=Math.max(0,Math.min(1,t));return x*x*(3-2*x);};
// Cape bounds are independent of body scale. All frames already normalize the
// shell to 20 world units; use the approved idle body's vertical anchor always.
const bodyAnchors=Object.fromEntries(Object.entries(SPRITE_FRAMES).map(([skin,clips])=>
  [skin,(clips.idle.frames[0].pivotY-clips.idle.frames[0].shellCenterY)*clips.idle.frames[0].scale]));
// Equal shell span did not equal body stature: the ant's approved idle body
// measured 36.6 units versus ~42 for beetle/guardian. Keep its correction fixed
// across every action so larger capes cannot change the explorer's size.
export function getDisplayMagnification(sprite){return sprite==='ant'?1.16:1;}
export function getCharacterFacing(p,state){
  return state==='cling'&&p.wallSide?-p.wallSide:(p.facing<0?-1:1);
}
function mergeLayers(layers){
  const merged=[];
  for(const layer of layers){
    if(layer.weight<=0)continue;
    const existing=merged.find(l=>l.frame===layer.frame&&l.facing===layer.facing&&l.idleTime===layer.idleTime);
    if(existing)existing.weight+=layer.weight;else merged.push({...layer});
  }
  const total=merged.reduce((sum,l)=>sum+l.weight,0);
  return merged.map(l=>({...l,weight:l.weight/total}));
}
// Blend complete drawings with a stable body anchor. Each outgoing layer keeps
// its orientation, including looking away from a wall during a wall jump.
export class CharacterAnimation {
  sample(sprite,state,time,player={facing:1,wallSide:1}){
    if(this.sprite!==sprite){this.sprite=sprite;this.state=state;this.since=time;this.from=null;}
    else if(this.state!==state){this.from=this.last;this.state=state;this.since=time;}
    const frame=getAnimationFrame(sprite,state,time-this.since);
    const facing=getCharacterFacing(player,state)*(state==='cling'?-1:1);
    const idleTime=state==='idle'?Math.max(0,time-this.since):undefined;
    const layers=mergeLayers([{frame:frame.frame,weight:1-frame.mix,facing,idleTime},{frame:frame.nextFrame,weight:frame.mix,facing,idleTime}]);
    let mixed=layers;
    if(this.from){
      const amount=ease((time-this.since)/.12);
      mixed=mergeLayers([...this.from.layers.map(l=>({...l,weight:l.weight*(1-amount)})),...layers.map(l=>({...l,weight:l.weight*amount}))]);
      if(amount===1)this.from=null;
    }
    const magnification=getDisplayMagnification(sprite);
    const headHeight=bodyAnchors[isCharacter(sprite)?sprite:DEFAULT_CHARACTER]*magnification;
    const headX=mixed.reduce((sum,l)=>sum+(Number.isFinite(l.frame.wallAttachX)
      ?l.facing*((player.w??26)/2-(l.frame.wallAttachX-l.frame.pivotX)*l.frame.scale*magnification):0)*l.weight,0);
    return this.last={state,...frame,layers:mixed,magnification,headHeight,headX,idleBreath:mixed.reduce((sum,l)=>sum+(l.idleTime===undefined?0:getIdleMotion(l.idleTime).breath)*l.weight,0)};
  }
}
// Prepare a complete pose once. Connected-alpha extraction excludes neighboring
// swords/capes in overlapping atlas rectangles, retaining antialiased edges.
// It retains a single complete pose for subsequent whole-texture animation.
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
  sprites.idleMotion=new Map(Object.values(SPRITE_FRAMES).map(clips=>{
    const f=clips.idle.frames[0];return [f,prepareIdleMotion(sprites.frames.get(f),f)];
  }));
  return sprites;
}
export class Sounds {
  enabled=false;
  constructor(){this.tracks=Object.fromEntries(['jump','magic'].map(name=>{const audio=new Audio(ROOT+'kenney-new-platformer/audio/sfx_'+name+'.ogg');audio.volume=.18;audio.preload='none';return [name,audio];}));}
  play(name){if(!this.enabled)return;const track=this.tracks[name];if(!track)return;track.currentTime=0;track.play().catch(()=>{});}
}
