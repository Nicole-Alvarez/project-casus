const CYCLE=3.2,PHASES=32;
const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
export function getIdleMotion(elapsed){
  const phase=(Math.max(0,elapsed)%CYCLE)/CYCLE,clock=phase*PHASES;
  const snapped=Math.abs(clock-Math.round(clock))<1e-9?Math.round(clock):clock;
  const step=Math.floor(snapped),index=step%PHASES;
  return {index,nextIndex:(index+1)%PHASES,mix:snapped-step,breath:Math.sin(phase*Math.PI*2)};
}

// Deform one complete drawing, never cut it into animated body parts. Masks
// describe cloth/chest influence; protected geometry is copied unchanged.
export function prepareIdleMotion(source,f){
  const padding=Math.ceil(2/f.scale)+2,width=source.width+padding*2,height=source.height+padding*2;
  const base=document.createElement('canvas');base.width=width;base.height=height;
  const ctx=base.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,padding,padding);
  const original=ctx.getImageData(0,0,width,height),data=original.data,count=width*height;
  const cape=new Float32Array(count),chest=new Float32Array(count),locked=new Uint8Array(count);
  const distance=new Float32Array(count);distance.fill(Infinity);
  const queue=new Int32Array(count);let end=0;
  const cx=f.pivotX+padding,cy=f.shellCenterY+padding,feet=f.pivotY+padding;
  const helmetBottom=f.shellHeight/2*f.scale;
  for(let i=0;i<count;i++){
    const x=(i%width-cx)*f.scale,y=(Math.floor(i/width)-cy)*f.scale,k=i*4;
    const r=data[k],g=data[k+1],b=data[k+2],a=data[k+3];
    const bone=a>0&&r>160&&g>140&&b>95&&r>g*1.06&&r>b*1.2;
    locked[i]=y<=helmetBottom+.5||(x>=4.5&&y>=helmetBottom)||
      (Math.abs(x)<10&&Math.floor(i/width)>=feet-8/f.scale)||bone;
    if(!locked[i]&&a>80&&g>=r*.95&&g>b*1.13&&r<165){distance[i]=0;queue[end++]=i;}
  }
  // A short distance field includes dark outlines and transparent edge pixels
  // in the same cloth warp, preventing detached ink or clipped leaf tips.
  const radius=Math.ceil(1.5/f.scale);
  for(let start=0;start<end;start++){
    const i=queue[start],x=i%width,y=Math.floor(i/width),d=distance[i]+1;
    if(d>radius)continue;
    for(const j of [x>0?i-1:-1,x+1<width?i+1:-1,y>0?i-width:-1,y+1<height?i+width:-1]){
      if(j>=0&&!locked[j]&&d<distance[j]){distance[j]=d;queue[end++]=j;}
    }
  }
  for(let i=0;i<count;i++){
    if(locked[i])continue;
    const x=(i%width-cx)*f.scale,y=(Math.floor(i/width)-cy)*f.scale;
    const neck=smooth((y-helmetBottom-.5)/4),front=1-smooth((x-1.5)/3);
    const footFade=smooth(((feet-Math.floor(i/width))*f.scale-8)/3);
    cape[i]=Math.max(0,1-distance[i]/(radius+1))*neck*front*(footFade+(1-footFade)*smooth((Math.abs(x)-10)/3));
    const ellipse=(x/7)**2+((y-(helmetBottom+8))/8)**2;
    chest[i]=smooth(1-ellipse)*neck*front*footFade*(1-cape[i]);
  }
  const cache=new Map([[0,base]]);
  function frame(index){
    index=((index%PHASES)+PHASES)%PHASES;if(cache.has(index))return cache.get(index);
    const phase=index/PHASES*Math.PI*2,breath=Math.sin(phase),output=new Uint8ClampedArray(data);
    for(let i=0;i<count;i++){
      if(locked[i]||cape[i]+chest[i]===0)continue;
      const x=i%width,y=Math.floor(i/width),tail=smooth(((y-cy)*f.scale-helmetBottom)/15);
      const wave=(Math.sin(phase-tail*.9)-Math.sin(-tail*.9))*tail;
      const dx=(cape[i]*.75*wave+chest[i]*(x-cx)*f.scale*.025*breath)/f.scale;
      const dy=(cape[i]*(.28*wave-.25*breath)+chest[i]*-.35*breath)/f.scale;
      const sx=Math.max(0,Math.min(width-1,x-dx)),sy=Math.max(0,Math.min(height-1,y-dy));
      const ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy;
      const neighbors=[iy*width+ix,iy*width+Math.min(ix+1,width-1),Math.min(iy+1,height-1)*width+ix,Math.min(iy+1,height-1)*width+Math.min(ix+1,width-1)];
      const weights=[(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy];
      let alpha=0;const rgb=[0,0,0];
      for(let n=0;n<4;n++){const k=neighbors[n]*4,a=data[k+3]*weights[n];alpha+=a;for(let c=0;c<3;c++)rgb[c]+=data[k+c]*a;}
      const k=i*4;output[k+3]=alpha;for(let c=0;c<3;c++)output[k+c]=alpha?rgb[c]/alpha:0;
    }
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    canvas.getContext('2d').putImageData(new ImageData(output,width,height),0,0);cache.set(index,canvas);return canvas;
  }
  return {padding,width,height,frame};
}
