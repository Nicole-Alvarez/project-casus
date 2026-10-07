import { LEVEL, TILE } from '../../shared/level.mjs';
import { cameraTarget } from '../../shared/physics.mjs';

const hash = n => ((Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1;
export class Renderer {
  camera = 0;
  width = 1280;
  height = 720;
  constructor(canvas, sprites) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.sprites = sprites;
    new ResizeObserver(() => this.resize()).observe(canvas); this.resize();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = this.height * rect.width / rect.height;
    const ratio = Math.min(devicePixelRatio || 1,2);
    this.canvas.width = Math.round(rect.width * ratio); this.canvas.height = Math.round(rect.height * ratio);
  }
  sprite(name,x,y,w=TILE,h=TILE,flip=false) {
    const ctx = this.ctx, image = this.sprites[name];
    if (!image) return;
    if (flip) { ctx.save(); ctx.translate(Math.round(x+w),Math.round(y)); ctx.scale(-1,1); ctx.drawImage(image,0,0,w,h); ctx.restore(); }
    else ctx.drawImage(image,Math.round(x),Math.round(y),w,h);
  }
  backdrop(time) {
    const ctx = this.ctx, w = this.width;
    const sky = ctx.createLinearGradient(0,0,0,720); sky.addColorStop(0,'#142c36'); sky.addColorStop(.6,'#28554f'); sky.addColorStop(1,'#416b57');
    ctx.fillStyle = sky; ctx.fillRect(0,0,w,720);
    for (let i = 0; i < 90; i++) {
      const x = ((hash(i+5)*2200-this.camera*.05)%w+w)%w, y = 35+hash(i+230)*285;
      ctx.fillStyle = `rgba(200,232,198,${.2+hash(i+100)*.45+Math.sin(time*.7+i)*.1})`;
      ctx.fillRect(Math.round(x),Math.round(y),i%13 === 0 ? 3 : 2,2);
    }
    const moonX = w*.74-this.camera*.025, moonY=126;
    const glow=ctx.createRadialGradient(moonX,moonY,20,moonX,moonY,150);glow.addColorStop(0,'#cce9ae18');glow.addColorStop(1,'#cce9ae00');ctx.fillStyle=glow;ctx.fillRect(moonX-150,moonY-150,300,300);
    ctx.fillStyle='#d7e7b7';ctx.fillRect(moonX-25,moonY-28,50,56);ctx.fillRect(moonX-31,moonY-19,62,38);ctx.fillStyle='#abc79e';ctx.fillRect(moonX+4,moonY-13,12,10);ctx.fillRect(moonX-15,moonY+8,8,5);
    for (const [layer,color,base,amplitude,speed] of [[0,'#254c49',340,100,.12],[1,'#28584f',440,90,.24],[2,'#1e4c43',510,100,.4]]) {
      ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-50,720);
      for (let x=-80;x<w+120;x+=24) {
        const world=x+this.camera*speed;
        const y=base+Math.sin(world*.006+layer*3)*amplitude+Math.sin(world*.013+layer)*amplitude*.25;
        ctx.lineTo(x,y);ctx.lineTo(x+24,y);
      }
      ctx.lineTo(w+120,720);ctx.closePath();ctx.fill();
    }
    for (let i=0;i<50;i++) {
      const world=i*170+hash(i)*80, x=world-this.camera*.55;
      if (x < -130 || x > w+130) continue;
      const height=90+hash(i+120)*160,y=510+Math.sin(world*.006)*45;
      ctx.fillStyle=i%3 ? '#173e38' : '#214c42';ctx.fillRect(x+31,y-height*.5,8,height*.5+30);
      for (let j=0;j<5;j++) { const a=12+j*9;ctx.fillRect(x+35-a,y-height+j*height*.14,a*2,Math.max(15,height*.21)); }
    }
    for (let i=0;i<23;i++) {
      const x=((hash(i+700)*w+Math.sin(time*.3+i)*15)%w+w)%w, y=330+hash(i+900)*220+Math.sin(time*.8+i)*10;
      ctx.fillStyle=`rgba(196,232,153,${.15+(Math.sin(time+i)*.5+.5)*.55})`;ctx.fillRect(x,y,3,3);
    }
  }
  draw(state,time,dt) {
    const ctx=this.ctx,w=this.width;
    ctx.setTransform(this.canvas.width/w,0,0,this.canvas.height/720,0,0);ctx.imageSmoothingEnabled=false;
    const local=state.local;
    const target=cameraTarget(local?.x ?? 180,w);
    if (state.preview) this.camera=0;
    else this.camera+=(target-this.camera)*(1-Math.exp(-8*dt));
    this.camera=Math.max(0,Math.min(LEVEL.width-w,this.camera));
    this.canvas.dataset.cameraX=this.camera.toFixed(1);
    this.canvas.dataset.playerX=(local?.x ?? 0).toFixed(1);
    this.backdrop(time);
    ctx.save();ctx.translate(-Math.round(this.camera),0);
    for (const p of LEVEL.platforms) {
      if(p.x+p.w<this.camera || p.x>this.camera+w)continue;
      ctx.fillStyle='#0d252e66';ctx.fillRect(p.x+6,p.y+8,p.w,p.h);
      for(let x=p.x;x<p.x+p.w;x+=TILE) {
        this.sprite(p.ground ? x===p.x?'grassLeft':x===p.x+p.w-TILE?'grassRight':'grass':'platform',x,p.y);
        if(p.ground)for(let y=p.y+TILE;y<720;y+=TILE)this.sprite('soil',x,y);
      }
    }
    for (let i=0;i<115;i++) {
      const x=i*61+hash(i+15)*35;
      if(x<this.camera-80 || x>this.camera+w+80)continue;
      const surface=LEVEL.platforms.find(p=>p.ground && x>=p.x+10 && x<p.x+p.w-36);
      if(!surface)continue;
      const key=i%7===0?'tree':i%5===0?'pine':i%4===0?'mushroom':i%3===0?'bigPlant':'plant';
      const size=key==='pine'||key==='tree'?65:29;
      this.sprite(key,x,surface.y-size+3,size,size);
    }
    const collected=new Set(state.collected);
    for(const coin of LEVEL.coins) {
      if(collected.has(coin.id) || coin.x<this.camera-30 || coin.x>this.camera+w+30)continue;
      const y=coin.y+Math.sin(time*2.5+coin.x)*4;
      const glow=ctx.createRadialGradient(coin.x+12,y+12,2,coin.x+12,y+12,25);glow.addColorStop(0,'#ffc56026');glow.addColorStop(1,'#ffc56000');ctx.fillStyle=glow;ctx.fillRect(coin.x-13,y-13,50,50);
      this.sprite(Math.sin(time*4+coin.x)>0?'coin':'coinEdge',coin.x,y,24,24);
    }
    this.sprite('sign',7*TILE,LEVEL.groundY*TILE-36);
    this.flag(LEVEL.checkpoints[1].x,LEVEL.groundY*TILE,'#b4e7bb',local?.checkpoint===1 ? 'CHECKPOINT' : 'A PLACE TO REST');
    this.flag(LEVEL.finish.x,LEVEL.groundY*TILE,'#ffdc8a','HOME IS HERE');
    for(const player of state.players) {
      const isLocal=player.id===local?.id;
      const p=isLocal?local:player;
      let x=p.x,y=p.y;
      if(isLocal){x+=state.offsetX ?? 0;y+=state.offsetY ?? 0;}
      ctx.fillStyle='#071e2b50';ctx.beginPath();ctx.ellipse(x+p.w/2,Math.min(y+p.h+3,LEVEL.groundY*TILE+3),17,4,0,0,Math.PI*2);ctx.fill();
      const walking=Math.abs(p.vx)>10 && p.grounded && Math.floor(time*9)%2===1;
      this.sprite(`character${p.slot%4}${walking?'Walk':'Idle'}`,x-6,y-4,36,40,p.facing<0);
      if(p.slot>=4){ctx.fillStyle=p.color;ctx.fillRect(x+p.w/2-2,y+9,4,3);}
      const name=state.preview?'You':p.name+(isLocal?' · you':'');
      ctx.font='11px "DM Sans", sans-serif';ctx.textAlign='center';
      const width=ctx.measureText(name).width+14;
      ctx.fillStyle='#102732dd';ctx.fillRect(x+p.w/2-width/2,y-27,width,18);
      ctx.fillStyle=p.color;ctx.fillText(name,x+p.w/2,y-14);
      if(isLocal){ctx.fillStyle=p.color;ctx.beginPath();ctx.moveTo(x+p.w/2-3,y-6);ctx.lineTo(x+p.w/2+3,y-6);ctx.lineTo(x+p.w/2,y-2);ctx.fill();}
    }
    ctx.restore();
    const shade=ctx.createLinearGradient(0,540,0,720);shade.addColorStop(0,'#102a3600');shade.addColorStop(1,'#0b202bdc');ctx.fillStyle=shade;ctx.fillRect(0,540,w,180);
    if(!state.preview)this.minimap(state);
  }
  flag(x,ground,color,label) {
    const ctx=this.ctx;ctx.fillStyle='#97b49a';ctx.fillRect(x+8,ground-98,4,98);this.sprite('flag',x+12,ground-98,36,36);ctx.fillStyle=color;ctx.font='8px sans-serif';ctx.textAlign='center';ctx.fillText(label,x+18,ground-115);
  }
  minimap(state) {
    const ctx=this.ctx,width=Math.min(180,this.width*.2),x=this.width/2-width/2,y=676;
    ctx.fillStyle='#09222c99';ctx.fillRect(x-9,y-8,width+18,22);ctx.fillStyle='#446458';ctx.fillRect(x,y,width,3);
    for(const p of state.players){ctx.fillStyle=p.color;ctx.fillRect(x+(p.id===state.local?.id?state.local.x:p.x)/LEVEL.width*width-2,y-3,4,9);}
    ctx.fillStyle='#f3cf80';ctx.fillRect(x+width-2,y-5,2,10);
  }
}
