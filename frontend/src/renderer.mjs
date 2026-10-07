import {LEVEL} from '../../shared/level.mjs';
import {cameraTarget,selectGrappleAnchor} from '../../shared/physics.mjs';
import {CHARACTER,CAMERA_ZOOM,PARALLAX,CharacterAnimation,getAnimationState,getIdleMotion} from './assets.mjs';
const hash=n=>((Math.sin(n*127.1+311.7)*43758.5453)%1+1)%1;
export class Renderer {
  cameraX=0;cameraY=0;width=640;height=400/CAMERA_ZOOM;initialized=false;animations=new Map();
  constructor(canvas,sprites){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.sprites=sprites;new ResizeObserver(()=>this.resize()).observe(canvas);this.resize();}
  resetCamera(){this.initialized=false;this.animations.clear();}
  resize(){const r=this.canvas.getBoundingClientRect();if(!r.height)return;this.width=this.height*r.width/r.height;const ratio=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(r.width*ratio);this.canvas.height=Math.round(r.height*ratio);this.initialized=false;}
  backdrop(time){
    const ctx=this.ctx,w=this.width,h=this.height,im=this.sprites.cavern;
    ctx.fillStyle='#071b22';ctx.fillRect(0,0,w,h);
    const scale=Math.max(w/im.width,h/im.height)*1.5,iw=im.width*scale,ih=im.height*scale;
    const phase=((this.cameraX*PARALLAX[0].x)%(iw*2)+iw*2)%(iw*2);
    const y=Math.max(h-ih,Math.min(0,-(ih-h)/2-this.cameraY*PARALLAX[0].y));
    // Alternating mirrored tiles share the same edge pixels, avoiding repeat seams.
    for(let i=-1;i<3;i++){const x=i*iw-phase;ctx.save();ctx.translate(x+(i%2?iw:0),y);if(i%2)ctx.scale(-1,1);ctx.drawImage(im,0,0,iw+1,ih);ctx.restore();}
    ctx.fillStyle='#06181f55';ctx.fillRect(0,0,w,h);
    const base=h*.82+(LEVEL.groundY-this.cameraY-h/2)*PARALLAX[1].y;
    const shift=this.cameraX*PARALLAX[1].x;
    for(let i=Math.floor(shift/230)-1;i<(shift+w)/230+1;i++){
      const x=i*230-shift,top=base-240-hash(i+30)*170;
      ctx.fillStyle='#163c4270';ctx.beginPath();ctx.moveTo(x,base+200);ctx.lineTo(x,top+100);ctx.bezierCurveTo(x+20,top+30,x+55,top,x+73,top-20);ctx.bezierCurveTo(x+100,top+15,x+131,top+40,x+140,top+100);ctx.lineTo(x+140,base+200);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#45696640';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+25,base+150);ctx.lineTo(x+25,top+110);ctx.quadraticCurveTo(x+25,top+75,x+73,top+38);ctx.quadraticCurveTo(x+113,top+73,x+114,top+110);ctx.lineTo(x+114,base+150);ctx.stroke();
    }
    // Nearer root silhouettes have independent X/Y parallax.
    const near=this.cameraX*PARALLAX[2].x,rootY=-75-this.cameraY*PARALLAX[2].y%90;
    ctx.strokeStyle='#0a242bb0';ctx.lineWidth=5;
    for(let i=Math.floor(near/180)-1;i<(near+w)/180+1;i++){
      const x=i*180-near,len=70+hash(i+80)*65;ctx.beginPath();ctx.moveTo(x,rootY);ctx.bezierCurveTo(x+20,rootY+30,x-16,rootY+len*.7,x+7,rootY+len);ctx.stroke();
      ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+3,rootY+len*.6);ctx.quadraticCurveTo(x+38,rootY+len*.7,x+35,rootY+len+17);ctx.stroke();ctx.lineWidth=5;
    }
    for(let i=0;i<28;i++){
      const x=((hash(i)*w-this.cameraX*.04+Math.sin(time*.2+i)*8)%w+w)%w;
      const y=((hash(i+100)*h-time*2)%h+h)%h;
      ctx.fillStyle='rgba(174,214,179,'+(.12+hash(i+180)*.22)+')';ctx.beginPath();ctx.arc(x,y,.5+hash(i+90)*.5,0,Math.PI*2);ctx.fill();
    }
  }
  terrain(p){
    const ctx=this.ctx,x=p.x,y=p.y,w=p.w,h=p.h;
    const shade=ctx.createLinearGradient(0,y,0,y+Math.min(h,130));shade.addColorStop(0,'#293b3c');shade.addColorStop(.2,'#172a30');shade.addColorStop(1,'#0a1a24');
    ctx.fillStyle=shade;ctx.fillRect(x,y,w,h);ctx.strokeStyle='#07151d';ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,w-2,h-2);
    ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
    const start=Math.max(x,Math.floor(this.cameraX/44)*44),end=Math.min(x+w,this.cameraX+this.width+44);
    for(let sx=start;sx<end;sx+=44){
      const seed=sx+y,drop=12+hash(seed)*16;
      ctx.strokeStyle='#50706a35';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(sx+5,y+9);ctx.lineTo(sx+25,y+drop);ctx.lineTo(sx+43,y+drop-3);ctx.stroke();
      ctx.fillStyle='#3f6151';ctx.beginPath();ctx.moveTo(sx,y);ctx.lineTo(sx+44,y);ctx.lineTo(sx+40,y+4);ctx.quadraticCurveTo(sx+22,y+3,sx+17,y+7+hash(seed+2)*8);ctx.lineTo(sx+9,y+4);ctx.lineTo(sx,y+4);ctx.fill();
      ctx.strokeStyle='#75917b';ctx.beginPath();ctx.moveTo(sx+1,y+1);ctx.lineTo(sx+25,y+1);ctx.stroke();
    }
    if(p.wall){ctx.strokeStyle='#4a61504d';for(let sy=y+20;sy<y+h;sy+=58){ctx.beginPath();ctx.moveTo(x+7,sy);ctx.lineTo(x+w-8,sy+6);ctx.stroke();}}
    ctx.restore();
    if(!p.ground&&!p.ceiling&&!p.wall){
      for(let i=0;i<Math.floor(w/70);i++){const sx=x+22+i*70,len=9+hash(sx)*23;ctx.strokeStyle='#395348';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(sx,y+h);ctx.quadraticCurveTo(sx+7,y+h+len*.5,sx+3,y+h+len);ctx.stroke();}
    }
  }
  scenery(){
    const ctx=this.ctx,g=LEVEL.groundY;
    // Non-solid ruin relief sits behind the collision geometry.
    for(const [x,y,width,height] of [[350,g,165,210],[1270,1160,120,165],[2920,190,180,185]]){
      ctx.strokeStyle='#41605c65';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(x-width/2,y);ctx.lineTo(x-width/2,y-height*.55);ctx.quadraticCurveTo(x-width/2,y-height*.8,x,y-height);ctx.quadraticCurveTo(x+width/2,y-height*.8,x+width/2,y-height*.55);ctx.lineTo(x+width/2,y);ctx.stroke();
      ctx.strokeStyle='#63766a35';ctx.lineWidth=1;ctx.stroke();
    }
    for(const p of LEVEL.platforms.filter(p=>!p.wall&&!p.ceiling)){
      const start=Math.max(0,Math.floor((this.cameraX-p.x)/70));
      for(let i=start;i<p.w/70&&p.x+i*70<this.cameraX+this.width+70;i++){
        const x=p.x+18+i*70,s=hash(x+p.y);ctx.strokeStyle='#526f57';ctx.lineWidth=1.2;
        for(let j=0;j<3;j++){const height=4+hash(x+j)*9;ctx.beginPath();ctx.moveTo(x+j*3,p.y);ctx.quadraticCurveTo(x+j*3-3,p.y-height*.7,x+j*3+2,p.y-height);ctx.stroke();}
        if(s>.65){ctx.fillStyle='#79918a';ctx.beginPath();ctx.ellipse(x+18,p.y-6,7,3,0,Math.PI,Math.PI*2);ctx.fill();ctx.fillStyle='#435959';ctx.fillRect(x+17,p.y-5,2,5);}
      }
    }
  }
  rest(r,active,time){
    const ctx=this.ctx,x=r.x+13,y=r.y+44;
    ctx.strokeStyle='#756c53';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-19,y);ctx.lineTo(x-19,y-56);ctx.quadraticCurveTo(x-19,y-69,x,y-61);ctx.lineTo(x,y-48);ctx.stroke();
    const glow=ctx.createRadialGradient(x,y-36,0,x,y-36,43);glow.addColorStop(0,active?'#f5d39345':'#c6c49e20');glow.addColorStop(1,'#f5d39300');ctx.fillStyle=glow;ctx.fillRect(x-43,y-79,86,86);
    ctx.fillStyle='#675b45';ctx.fillRect(x-7,y-47,14,20);ctx.fillStyle=active?'#f7dca7':'#9cb5a0';ctx.fillRect(x-4,y-43,8,13);
    ctx.fillStyle='#aeb9a2';ctx.font='8px Georgia,serif';ctx.textAlign='center';ctx.fillText(r.name,x,y-80);
    if(active){ctx.fillStyle='#e9c88c';ctx.beginPath();ctx.arc(x,y-36+Math.sin(time*2),2,0,Math.PI*2);ctx.fill();}
  }
  pose(p,time){
    let track=this.animations.get(p.id);
    if(!track){track=new CharacterAnimation();this.animations.set(p.id,track);}
    return track.sample(p.sprite,getAnimationState(p),time,p);
  }
  character(p,x,y,pose,alpha=1){
    const ctx=this.ctx;ctx.save();ctx.globalAlpha=alpha;
    ctx.translate(x+p.w/2,y+p.h);
    const boxes=pose.layers.flatMap(({frame:f,weight,facing=1,idleTime})=>{
      const model=idleTime===undefined?null:this.sprites.idleMotion.get(f);
      const motion=model?getIdleMotion(idleTime):null;
      const images=model?[{image:model.frame(motion.index),weight:1-motion.mix},{image:model.frame(motion.nextIndex),weight:motion.mix}]
        :[{image:this.sprites.frames.get(f),weight:1}];
      const padding=model?.padding??0,scale=f.scale*pose.magnification,origin=pose.headX??0;
      const sourceX=-(f.pivotX+padding)*scale,w=(f.sw+padding*2)*scale;
      return images.filter(l=>l.weight>0).map(l=>({image:l.image,weight:weight*l.weight,origin,facing,sourceX,
        x:origin+(facing<0?-sourceX-w:sourceX),y:-(f.shellCenterY+padding)*scale-pose.headHeight,w,h:(f.sh+padding*2)*scale}));
    });
    const draw=(target,b)=>{target.save();target.translate(b.origin,0);target.scale(b.facing,1);
      target.drawImage(b.image,b.sourceX,b.y,b.w,b.h);target.restore();};
    // Keep idle on one compositing path even at exact cached phases, avoiding
    // a direct-draw/resampled-draw sharpness pulse every tenth of a second.
    if(boxes.length===1&&pose.layers.every(l=>l.idleTime===undefined)){const b=boxes[0];draw(ctx,b);}
    else {
      const left=Math.floor(Math.min(...boxes.map(b=>b.x)))-1,top=Math.floor(Math.min(...boxes.map(b=>b.y)))-1;
      const right=Math.ceil(Math.max(...boxes.map(b=>b.x+b.w)))+1,bottom=Math.ceil(Math.max(...boxes.map(b=>b.y+b.h)))+1;
      const ratio=this.canvas.width/this.width;
      const canvas=this.blendCanvas??=document.createElement('canvas');
      canvas.width=Math.ceil((right-left)*ratio);canvas.height=Math.ceil((bottom-top)*ratio);
      const blend=canvas.getContext('2d');blend.scale(ratio,ratio);blend.translate(-left,-top);
      // Premultiplied additive blending keeps overlapping opaque pixels opaque.
      // Composite the complete mix onto the world once, preventing dark ghosts.
      blend.globalCompositeOperation='lighter';blend.imageSmoothingEnabled=true;blend.imageSmoothingQuality='high';
      for(const b of boxes){blend.globalAlpha=b.weight;draw(blend,b);}
      ctx.drawImage(canvas,left,top,canvas.width/ratio,canvas.height/ratio);
    }
    ctx.restore();
  }
  player(p,isLocal,state,time,pose){
    const ctx=this.ctx,x=p.x+(isLocal?state.offsetX:0),y=p.y+(isLocal?state.offsetY:0);
    if(p.invulnerable)for(let i=3;i>0;i--)this.character(p,p.dashVertical?x:x-p.facing*i*13,p.dashVertical?y+i*13:y,pose,.1+(3-i)*.06);
    if(p.grounded){ctx.fillStyle='#06151c80';ctx.beginPath();ctx.ellipse(x+p.w/2,y+p.h+2,14,3,0,0,Math.PI*2);ctx.fill();}
    const a=LEVEL.anchors.find(a=>a.id===p.grappleId);
    if(a){ctx.strokeStyle=p.color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+p.w/2,y+8);ctx.lineTo(a.x,a.y);ctx.stroke();}
    if(p.wallSide){ctx.fillStyle='#c4cdae';for(let i=0;i<3;i++)ctx.fillRect(x+(p.wallSide>0?p.w:-2),y+8+i*10,1.5,2);}
    this.character(p,x,y,pose);
    // Party color and small name distinguish peers without recoloring the approved art.
    const top=y+p.h-Math.max(...pose.layers.map(l=>l.frame.shellCenterY*l.frame.scale*pose.magnification+pose.headHeight));
    ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(x+p.w/2,top-5,1.5,0,Math.PI*2);ctx.fill();
    if(!state.preview){ctx.font='7px "Avenir Next",sans-serif';ctx.textAlign='center';ctx.fillStyle='#d2dad3';ctx.fillText(p.name+(isLocal?' · you':''),x+p.w/2,top-11);}
  }
  draw(state,time,dt){
    const ctx=this.ctx,w=this.width,h=this.height,p=state.local,cx=p.x+p.w/2+state.offsetX,cy=p.y+p.h/2+state.offsetY;
    const tx=cameraTarget(cx,w),ty=cameraTarget(cy,h,.6);
    if(!this.initialized){this.cameraX=tx;this.cameraY=ty;this.initialized=true;}else{const a=1-Math.exp(-12*dt);this.cameraX+=(tx-this.cameraX)*a;this.cameraY+=(ty-this.cameraY)*a;}
    const poses=new Map(state.players.map(q=>[q.id,this.pose(q,time)])),local=poses.get(p.id);
    for(const id of this.animations.keys())if(!poses.has(id))this.animations.delete(id);
    ctx.setTransform(this.canvas.width/w,0,0,this.canvas.height/h,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    Object.assign(this.canvas.dataset,{mapName:LEVEL.name,spriteHeight:CHARACTER.bodyHeight,animation:local.state,frameIndex:local.index,spriteMode:'whole',sprite:p.sprite,animationFps:local.fps,idleBreath:local.idleBreath.toFixed(6),blendLayers:local.layers.length,spriteMagnification:local.magnification.toFixed(3),shellSize:(local.frame.shellSpan*local.frame.scale*local.magnification).toFixed(2),remoteSprites:JSON.stringify(state.players.filter(q=>q.id!==p.id).map(q=>({id:q.id,sprite:q.sprite}))),cameraX:this.cameraX.toFixed(2),cameraY:this.cameraY.toFixed(2),playerX:p.x.toFixed(2),playerY:p.y.toFixed(2),visualCenterX:cx.toFixed(2),visualCenterY:cy.toFixed(2),viewWidth:w.toFixed(2),viewHeight:String(h),dash:String(p.invulnerable),float:String(p.floatActive),cling:String(p.wallSide),grapple:p.grappleId??'',parallaxX:JSON.stringify(PARALLAX.map(layer=>this.cameraX*layer.x)),remoteAnimations:JSON.stringify(state.players.filter(q=>q.id!==p.id).map(q=>({id:q.id,state:poses.get(q.id).state,frame:poses.get(q.id).index}))),remoteAbilities:JSON.stringify(state.players.filter(q=>q.id!==p.id).map(q=>({id:q.id,dash:q.invulnerable,float:q.floatActive,cling:q.wallSide,grapple:q.grappleId})))});
    this.backdrop(time);ctx.save();ctx.translate(-this.cameraX,-this.cameraY);
    this.scenery();
    for(const platform of LEVEL.platforms)if(platform.x+platform.w>=this.cameraX&&platform.x<=this.cameraX+w&&platform.y+platform.h>=this.cameraY&&platform.y<=this.cameraY+h)this.terrain(platform);
    for(let i=0;i<LEVEL.checkpoints.length;i++)this.rest(LEVEL.checkpoints[i],p.checkpoint===i,time);
    const eligible=selectGrappleAnchor(p);
    for(const a of LEVEL.anchors){
      const active=a.id===eligible?.id||a.id===p.grappleId;ctx.strokeStyle=active?'#e8d9a3':'#769d8760';ctx.lineWidth=active?1.5:1;ctx.beginPath();ctx.arc(a.x,a.y,active?9:6,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle=active?'#efdeb0':'#769b83';ctx.beginPath();ctx.moveTo(a.x,a.y-3);ctx.lineTo(a.x+3,a.y);ctx.lineTo(a.x,a.y+3);ctx.lineTo(a.x-3,a.y);ctx.closePath();ctx.fill();
      if(active){ctx.font='7px sans-serif';ctx.textAlign='center';ctx.fillStyle='#e2dfc5';ctx.fillText('E',a.x,a.y-14);}
    }
    for(const q of state.players)this.player(q,q.id===p.id,state,time,poses.get(q.id));
    ctx.restore();
  }
}
