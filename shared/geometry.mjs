export const overlaps = (a,b) => a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;

// Slab intersection: an anchor is eligible only when its tether has clear sight.
export function segmentIntersectsRect(a,b,r) {
  let near=0,far=1;
  for(const [start,delta,min,max] of [[a.x,b.x-a.x,r.x,r.x+r.w],[a.y,b.y-a.y,r.y,r.y+r.h]]) {
    if(Math.abs(delta)<1e-9){if(start<min||start>max)return false;continue;}
    const t1=(min-start)/delta,t2=(max-start)/delta;
    near=Math.max(near,Math.min(t1,t2));far=Math.min(far,Math.max(t1,t2));if(near>far)return false;
  }
  return far>0 && near<1;
}

// Sweep each axis against every solid, including obstacles thinner than a tick's travel.
export function moveAxis(p,amount,axis,solids) {
  const other=axis==='x'?'y':'x',size=axis==='x'?'w':'h',cross=axis==='x'?'h':'w';
  let allowed=amount,hit=false;
  for(const r of solids) {
    if(p[other]>=r[other]+r[cross] || p[other]+p[cross]<=r[other])continue;
    const gap=amount>0?r[axis]-p[axis]-p[size]:r[axis]+r[size]-p[axis];
    if(amount>0 && gap>=-1e-7 && gap<=allowed){allowed=Math.max(0,gap);hit=true;}
    if(amount<0 && gap<=1e-7 && gap>=allowed){allowed=Math.min(0,gap);hit=true;}
  }
  p[axis]+=allowed;return hit;
}
