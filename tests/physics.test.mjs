import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, stepPlayer, respawn, createRoom, stepRoom, roomSnapshot, cameraTarget, NEUTRAL, selectGrappleAnchor, canTakeDamage } from '../shared/physics.mjs';
import { LEVEL, DT } from '../shared/level.mjs';
import { parseMessage } from '../shared/protocol.mjs';
const advance = (p, input = NEUTRAL, n = 60) => { for (let i=0;i<n;i++) stepPlayer(p, input, DT); };
const player = () => { const p=createPlayer('a','Explorer',0);advance(p);return p; };

test('walking, braking, ground collision and world bounds',()=>{
  const p=player(),start=p.x;assert.equal(p.grounded,true);
  advance(p,{...NEUTRAL,right:true},20);assert.ok(p.x>start+50);
  advance(p);const stopped=p.x;advance(p);assert.equal(p.x,stopped);
  assert.equal(p.y+p.h,1700);advance(p,{...NEUTRAL,left:true},300);assert.ok(p.x>=0);
});
test('exactly two jumps; held jump never auto-jumps',()=>{
  const p=player();stepPlayer(p,{...NEUTRAL,jump:true});assert.ok(p.vy<0);assert.equal(p.airJumpAvailable,true);
  advance(p,NEUTRAL,12);stepPlayer(p,{...NEUTRAL,jump:true});assert.ok(p.vy<-500);assert.equal(p.airJumpAvailable,false);
  stepPlayer(p,NEUTRAL);const before=p.vy;stepPlayer(p,{...NEUTRAL,jump:true});assert.ok(p.vy>before);
  advance(p,{...NEUTRAL,jump:true},180);assert.equal(p.grounded,true);assert.equal(p.y+p.h,1700);
});
test('walking off a ledge preserves one air jump; float caps descent without lift',()=>{
  const p=player();Object.assign(p,{x:840,y:1520-p.h,grounded:true});
  advance(p,{...NEUTRAL,right:true},20);assert.equal(p.grounded,false);assert.equal(p.airJumpAvailable,true);
  advance(p,{...NEUTRAL,float:true},10);assert.ok(p.vy>=0&&p.vy<=110);assert.equal(p.floatActive,true);
  stepPlayer(p,{...NEUTRAL,jump:true,float:true});assert.ok(p.vy<0);assert.equal(p.floatActive,false);
});
test('wall cling, detach and wall jump steering lock',()=>{
  const p=player();Object.assign(p,{x:1900-p.w,y:1230,vy:300,grounded:false,airJumpAvailable:false});
  advance(p,{...NEUTRAL,right:true},2);assert.equal(p.wallSide,1);assert.equal(p.vy,0);assert.equal(p.airJumpAvailable,true);
  stepPlayer(p,{...NEUTRAL,left:true});assert.equal(p.wallSide,0);assert.ok(p.vy>0);
  Object.assign(p,{x:1900-p.w,y:1230,vy:300});advance(p,{...NEUTRAL,right:true},2);
  stepPlayer(p,{...NEUTRAL,left:true,jump:true});assert.ok(p.vx<0);assert.ok(p.wallLock>0);assert.ok(p.vy<0);
  advance(p,{...NEUTRAL,right:true},4);assert.ok(p.vx<0);
});
test('holding into either wall jumps away from it and restores aerial abilities',()=>{
  for(const side of [-1,1]){
    const p=player();Object.assign(p,{x:side===1?1900-p.w:2180,y:1200,vy:200,grounded:false});
    const input={...NEUTRAL,left:side<0,right:side>0};
    advance(p,input,2);assert.equal(p.wallSide,side);
    const x=p.x,y=p.y;stepPlayer(p,{...input,jump:true});
    assert.equal(Math.sign(p.x-x),-side);assert.equal(p.vx,-side*420);assert.ok(p.vy<-580);
    assert.equal(p.airJumpAvailable,true);assert.equal(p.airDashAvailable,true);
    advance(p,input,4);assert.equal(Math.sign(p.x-x),-side);assert.ok(p.y<y-35);
  }
});
test('spent air dash refreshes on wall jump; double jump and dash work during the launch lock',()=>{
  for(const side of [-1,1]){
    const p=player();Object.assign(p,{x:side===1?1800:2250,y:1200,grounded:false});
    const toward={...NEUTRAL,left:side<0,right:side>0};
    stepPlayer(p,{...toward,dash:true});advance(p,{...toward,dash:true},65);
    assert.equal(p.wallSide,side);assert.equal(p.airDashAvailable,false);assert.equal(p.dashCooldown,0);
    stepPlayer(p,{...toward,jump:true});assert.equal(p.airDashAvailable,true);
    stepPlayer(p,toward);stepPlayer(p,{...toward,jump:true});
    assert.equal(p.airJumpAvailable,false);assert.ok(p.vy<-500);assert.ok(p.wallLock>0);
    stepPlayer(p,{...toward,dash:true});
    assert.equal(p.invulnerable,true);assert.equal(p.dashVertical,false);
    assert.equal(p.vx,-side*900,'Dash honors the wall launch direction during its steering lock');
  }
});
test('wall jump restores the air dash budget without bypassing its cooldown',()=>{
  const p=player();Object.assign(p,{x:1800,y:1200,grounded:false});
  const toward={...NEUTRAL,right:true};
  stepPlayer(p,{...toward,dash:true});advance(p,toward,8);assert.equal(p.wallSide,1);
  const cooldown=p.dashCooldown;stepPlayer(p,{...toward,jump:true});
  assert.equal(p.airDashAvailable,true);assert.ok(p.dashCooldown>0&&p.dashCooldown<cooldown);
  stepPlayer(p,{...NEUTRAL,left:true,dash:true});assert.equal(p.invulnerable,false);
});
test('wall dash climbs vertically, keeps i-frames and cannot pass the ceiling',()=>{
  const p=player();Object.assign(p,{x:70,y:100,vy:200,grounded:false});
  advance(p,{...NEUTRAL,left:true},2);assert.equal(p.wallSide,-1);
  const x=p.x,y=p.y;stepPlayer(p,{...NEUTRAL,left:true,dash:true});
  assert.equal(p.x,x);assert.equal(p.vx,0);assert.equal(p.vy,-900);
  assert.equal(p.invulnerable,true);advance(p,{...NEUTRAL,left:true,dash:true},3);
  assert.ok(p.y<y-40);assert.equal(p.invulnerable,true);
  advance(p,{...NEUTRAL,left:true,dash:true},10);
  assert.ok(p.y>=0);assert.equal(p.invulnerable,false);
  assert.equal(p.airDashAvailable,false);
});
test('wall dashes repeat on either wall after cooldown without landing or wall jumping',()=>{
  for(const side of [-1,1]){
    const wall=LEVEL.platforms.find(r=>r.id===(side<0?'left-wall':'right-wall'));
    const p=player();Object.assign(p,{x:side<0?wall.x+wall.w:wall.x-p.w,y:850,grounded:false});
    const toward={...NEUTRAL,left:side<0,right:side>0};advance(p,toward,2);
    assert.equal(p.wallSide,side);
    for(let repeat=0;repeat<2;repeat++){
      const y=p.y;
      stepPlayer(p,{...toward,dash:true});assert.equal(p.dashVertical,true);assert.equal(canTakeDamage(p),false);
      advance(p,{...toward,dash:true},50);
      assert.ok(p.y<y-100);assert.equal(p.grounded,false);assert.equal(p.wallSide,side);
      assert.equal(p.dashCooldown,0);assert.equal(p.invulnerable,false,'Holding Q never auto-repeats');
      stepPlayer(p,toward);
    }
  }
});
test('wall contact does not bypass cooldown or grant a dash after leaving the wall',()=>{
  const p=player();Object.assign(p,{x:70,y:1200,grounded:false});
  const toward={...NEUTRAL,left:true};advance(p,toward,2);stepPlayer(p,{...toward,dash:true});
  advance(p,toward,15);stepPlayer(p,{...toward,dash:true});assert.equal(p.invulnerable,false);
  advance(p,toward,40);assert.equal(p.dashCooldown,0);
  advance(p,{...NEUTRAL,right:true,float:true},5);
  stepPlayer(p,{...NEUTRAL,right:true,dash:true});assert.equal(p.invulnerable,false,'Ordinary air dash still needs its budget');
});
test('air dash restores one air jump, which can interrupt an active dash',()=>{
  const p=player();stepPlayer(p,{...NEUTRAL,jump:true});advance(p,NEUTRAL,12);
  stepPlayer(p,{...NEUTRAL,jump:true});assert.equal(p.airJumpAvailable,false);
  stepPlayer(p,{...NEUTRAL,dash:true});assert.equal(p.airJumpAvailable,true);assert.ok(p.invulnerable);
  stepPlayer(p,{...NEUTRAL,jump:true});assert.equal(p.airJumpAvailable,false);assert.ok(p.vy<-500);assert.equal(p.invulnerable,false);
  stepPlayer(p,NEUTRAL);const before=p.vy;stepPlayer(p,{...NEUTRAL,jump:true});assert.ok(p.vy>before);
});
test('grapple selection uses range and unobstructed level anchors; release, arrival and jump detach',()=>{
  const p=player();assert.equal(selectGrappleAnchor(p),null);
  Object.assign(p,{x:1220,y:1090,grounded:false});const a=selectGrappleAnchor(p);assert.ok(a);
  stepPlayer(p,{...NEUTRAL,grapple:true});assert.equal(p.grappleId,a.id);assert.ok(p.vy<0);
  stepPlayer(p,NEUTRAL);assert.equal(p.grappleId,null);
  stepPlayer(p,{...NEUTRAL,grapple:true});stepPlayer(p,{...NEUTRAL,grapple:true,jump:true});assert.equal(p.grappleId,null);
  Object.assign(p,{x:a.x-p.w/2,y:a.y-p.h/2+10,grappleId:a.id});stepPlayer(p,{...NEUTRAL,grapple:true});assert.equal(p.grappleId,null);
  advance(p,{...NEUTRAL,grapple:true},3);assert.equal(p.grappleId,null);
  Object.assign(p,{x:1990,y:870});assert.ok(LEVEL.anchors.some(a=>Math.hypot(a.x-p.x-p.w/2,a.y-p.y-p.h/2)<=420),'Blocked candidate is actually in range');assert.equal(selectGrappleAnchor(p),null);
  p.grappleId='silk-c';p.grappleHeld=true;stepPlayer(p,{...NEUTRAL,grapple:true});assert.equal(p.grappleId,null);
});
test('dash grants 0.09-second i-frames, expires, respects cooldown and press edges',()=>{
  const p=player();stepPlayer(p,{...NEUTRAL,dash:true});assert.equal(p.dashTime,.09);assert.equal(p.vx,900);assert.equal(p.dashCooldown,.8);assert.equal(canTakeDamage(p),false);
  advance(p,{...NEUTRAL,dash:true},5);assert.ok(p.invulnerable);stepPlayer(p,{...NEUTRAL,dash:true});assert.equal(p.invulnerable,false);assert.equal(canTakeDamage(p),true);
  advance(p,{...NEUTRAL,dash:true},60);assert.equal(p.dashTime,0);
  stepPlayer(p,NEUTRAL);stepPlayer(p,{...NEUTRAL,dash:true});assert.ok(p.dashTime>0);
});
test('air dash cannot repeat without landing or wall jump; collision cancels invulnerability without tunneling',()=>{
  const p=player();Object.assign(p,{x:1700,y:1200,grounded:false});stepPlayer(p,{...NEUTRAL,right:true,dash:true});
  advance(p,{...NEUTRAL,float:true},50);assert.equal(p.airDashAvailable,false);stepPlayer(p,{...NEUTRAL,dash:true});assert.equal(p.dashTime,0);
  Object.assign(p,{x:1900-p.w-5,y:1230,dashCooldown:0,airDashAvailable:true,dashHeld:false,grounded:false});
  stepPlayer(p,{...NEUTRAL,right:true,dash:true});assert.equal(p.x,1900-p.w);assert.equal(p.dashTime,0);assert.equal(p.invulnerable,false);
});
test('respawn clears every transient ability and falling returns to the current rest',()=>{
  const p=player();p.checkpoint=1;Object.assign(p,{dashTime:.1,invulnerable:true,grappleId:LEVEL.anchors[0].id,wallSide:1,wallLock:.1,floatActive:true});
  respawn(p);assert.equal(p.x,LEVEL.checkpoints[1].x);assert.equal(p.dashTime,0);assert.equal(p.invulnerable,false);assert.equal(p.grappleId,null);assert.equal(p.wallSide,0);assert.equal(p.floatActive,false);assert.equal(p.wallLock,0);
  p.y=LEVEL.height+100;stepPlayer(p);assert.equal(p.x,LEVEL.checkpoints[1].x);
});
test('rest activation requires proximity in both axes; exploration snapshots have no objectives',()=>{
  const p=player(),r=LEVEL.checkpoints[1];Object.assign(p,{x:r.x,y:1700-p.h});stepPlayer(p);assert.equal(p.checkpoint,0);
  Object.assign(p,{x:r.x,y:r.y});stepPlayer(p);assert.equal(p.checkpoint,1);
  const room=createRoom('GROVE');room.players.set(p.id,p);stepRoom(room);const snapshot=roomSnapshot(room);
  assert.equal('collected' in snapshot,false);assert.equal('completed' in snapshot,false);assert.equal('coins' in LEVEL,false);assert.equal('finish' in LEVEL,false);
});
test('camera centers horizontally and anchors the player 40% above the bottom, including world edges',()=>{
  assert.equal(cameraTarget(100,960),-380);assert.equal(cameraTarget(1800,960),1320);assert.equal(cameraTarget(600,720),240);
  for(const height of [285.7142857142857,390,844]){
    for(const center of [0,600,2100]){
      const screenY=center-cameraTarget(center,height,.6);
      assert.ok(Math.abs(screenY/height-.6)<1e-10,'Player center must sit at 60% of screen height');
    }
  }
});
test('protocol requires seven boolean controls and rejects injected ability state',()=>{
  assert.deepEqual(parseMessage('{"type":"join","room":"grove","name":"  Moss  "}'),{type:'join',room:'GROVE',name:'Moss',sprite:'beetle'});
  for(const raw of ['bad json','{"type":"join","room":"../../x","name":"Moss"}','{"type":"input","right":"yes"}',JSON.stringify({type:'input',...NEUTRAL,invulnerable:true}),JSON.stringify({type:'input',...NEUTRAL,x:9000})])assert.equal(parseMessage(raw),null);
  assert.deepEqual(parseMessage(JSON.stringify({type:'input',...NEUTRAL,float:true,grapple:true,dash:true})),{type:'input',...NEUTRAL,float:true,grapple:true,dash:true});
});

test('ground dash preserves floor contact and a cancelling jump uses the ground jump',()=>{
  const p=player();stepPlayer(p,{...NEUTRAL,dash:true});assert.equal(p.grounded,true);
  stepPlayer(p,{...NEUTRAL,jump:true});assert.equal(p.invulnerable,false);assert.ok(p.vy<-580);assert.equal(p.airJumpAvailable,true);
});

test('collision sweeps stop at a solid thinner than dash or grapple travel',async()=>{
  const {moveAxis}=await import('../shared/geometry.mjs');
  const p={x:0,y:0,w:26,h:44};const thin={x:30,y:0,w:2,h:80};
  assert.equal(moveAxis(p,100,'x',[thin]),true);assert.equal(p.x,4);
  const upward={x:0,y:20,w:26,h:44};assert.equal(moveAxis(upward,-100,'y',[{x:0,y:10,w:50,h:2}]),true);assert.equal(upward.y,12);
});
