import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, stepPlayer, NEUTRAL, selectGrappleAnchor } from '../shared/physics.mjs';
import { LEVEL } from '../shared/level.mjs';
const run=(p,n,input=NEUTRAL)=>{for(let i=0;i<n;i++)stepPlayer(p,input);};
const fresh=()=>{const p=createPlayer('route','Explorer',0);run(p,5);return p;};
const surface=id=>LEVEL.platforms.find(r=>r.id===id);
function walkTo(p,x){for(let i=0;i<500&&Math.abs(p.x-x)>5;i++)stepPlayer(p,{...NEUTRAL,left:p.x>x,right:p.x<x});run(p,10);assert.ok(Math.abs(p.x-x)<25);}
function climb(p,id){const s=surface(id);walkTo(p,s.x-150);let second=false;
  stepPlayer(p,{...NEUTRAL,right:true,jump:true});
  for(let i=0;i<150;i++) {
    const jump=!second&&p.vy>=-30; if(jump)second=true;
    stepPlayer(p,{...NEUTRAL,right:p.x<s.x+70,jump});
    if(p.grounded&&Math.abs(p.y+p.h-s.y)<.01)return;
  }
  assert.fail(`Could not climb ${id}: ${JSON.stringify({x:p.x,y:p.y,vy:p.vy})}`);
}
function canopy(p){for(const id of ['canopy-1','canopy-2','canopy-3'])climb(p,id);}

test('sanctuary entrance steps require the second jump and are reachable from the normal spawn',()=>{
  const p=fresh();canopy(p);assert.ok(p.y<1200);assert.equal(p.checkpoint,1);
  const single=fresh();walkTo(single,580);stepPlayer(single,{...NEUTRAL,right:true,jump:true});let highest=single.y;for(let i=0;i<100;i++){stepPlayer(single,{...NEUTRAL,right:true});highest=Math.min(highest,single.y);}
  assert.ok(highest>surface('canopy-1').y-single.h,'A single jump cannot reach the shelf top');
  assert.equal(single.y+single.h,1700);
});
test('windfall float crosses the glade onto its recovery shelf; normal fall falls short',()=>{
  function cross(float){const p=fresh();canopy(p);walkTo(p,1440);let landed=false;
    for(let i=0;i<180;i++){stepPlayer(p,{...NEUTRAL,right:p.x<1830,float});if(p.grounded&&p.y+p.h===1410){landed=true;break;}}
    return {p,landed};}
  const floating=cross(true),falling=cross(false);assert.equal(floating.landed,true);assert.equal(falling.landed,false);
});
test('root chimney climbs from the lower entrance with upward dash and alternating wall jumps',()=>{
  const p=fresh();walkTo(p,2100);stepPlayer(p,{...NEUTRAL,jump:true});run(p,23);stepPlayer(p,{...NEUTRAL,jump:true});
  for(let i=0;i<40&&!p.wallSide;i++)stepPlayer(p,{...NEUTRAL,right:p.y<1450});
  stepPlayer(p,{...NEUTRAL,right:true,dash:true});assert.equal(p.dashVertical,true);assert.equal(p.invulnerable,true);
  run(p,12,{...NEUTRAL,right:true});
  let clings=0,jumps=0,highest=p.y;
  for(let i=0;i<1500;i++) {
    const direction=p.wallSide?-p.wallSide:(p.vx<0?-1:1);
    const jump=Boolean(p.wallSide)&&!p.jumpHeld;
    if(p.wallSide)clings++;if(jump)jumps++;
    const steer=p.wallSide?p.wallSide:direction;
    stepPlayer(p,{...NEUTRAL,left:steer<0,right:steer>0,jump});highest=Math.min(highest,p.y);
    if(p.y<670)break;
  }
  assert.ok(clings>=2,`clings ${clings}, jumps ${jumps}, highest ${highest}, end ${p.x},${p.y}`);assert.ok(jumps>=2);assert.ok(highest<670,`highest ${highest}`);
});
test('connected treetop loop uses actual inputs, anchors, dash and float without teleports',()=>{
  const p=fresh();canopy(p);let pulls=0;
  for(const anchor of LEVEL.anchors) {
    assert.equal(selectGrappleAnchor(p)?.id,anchor.id,`anchor ${anchor.id} from ${p.x},${p.y}`);
    stepPlayer(p,{...NEUTRAL,grapple:true});assert.equal(p.grappleId,anchor.id);pulls++;
    for(let i=0;i<80&&p.grappleId;i++)stepPlayer(p,{...NEUTRAL,grapple:true});
    stepPlayer(p,NEUTRAL);
  }
  run(p,100);assert.equal(p.y+p.h,190);walkTo(p,2950);assert.equal(p.checkpoint,3);
  stepPlayer(p,{...NEUTRAL,right:true,jump:true});stepPlayer(p,{...NEUTRAL,right:true,dash:true});assert.ok(p.invulnerable);
  run(p,20,{...NEUTRAL,right:true,float:true});assert.equal(p.invulnerable,false);
  // Holding into the new enclosing wall deliberately clings. Release it to
  // settle on the return ledge, then step left into the safe lower corridor.
  for(let i=0;i<1100&&!p.wallSide;i++)stepPlayer(p,{...NEUTRAL,right:true,float:true});
  run(p,600,{...NEUTRAL,float:true});assert.equal(p.y+p.h,980);
  walkTo(p,3350);run(p,600,{...NEUTRAL,float:true});
  assert.equal(p.y+p.h,1700);assert.equal(pulls,6);assert.ok(p.x>3200);
});
test('bough passage jump and short dash cross the gap and land on the next branch',()=>{
  const p=fresh();canopy(p);
  for(const a of LEVEL.anchors.slice(0,5)){assert.equal(selectGrappleAnchor(p)?.id,a.id);stepPlayer(p,{...NEUTRAL,grapple:true});for(let i=0;i<80&&p.grappleId;i++)stepPlayer(p,{...NEUTRAL,grapple:true});stepPlayer(p,NEUTRAL);}
  run(p,100);assert.equal(p.y+p.h,450);walkTo(p,2550);
  const walking={...p};run(walking,100,{...NEUTRAL,right:true});assert.ok(walking.y+walking.h>450,'Walking off the branch drops below the next landing');
  stepPlayer(p,{...NEUTRAL,right:true,jump:true});
  stepPlayer(p,{...NEUTRAL,right:true,dash:true});run(p,25,{...NEUTRAL,right:true,float:true});
  run(p,100,{...NEUTRAL,float:true});assert.equal(p.y+p.h,450);assert.ok(p.x>=2700&&p.x<2910);
});

test('the sanctuary encloses the map with solid side walls and an overhead ceiling',()=>{
  const p=fresh();run(p,200,{...NEUTRAL,left:true});assert.equal(p.x,70);
  Object.assign(p,{x:500,y:5,vy:-600,grounded:false});stepPlayer(p);assert.equal(p.y,0);assert.equal(p.vy,0);
  assert.ok(LEVEL.width<=3600&&LEVEL.height<=2100,'Compact first map');
});
