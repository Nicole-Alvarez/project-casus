import test from 'node:test';
import assert from 'node:assert/strict';
import * as art from '../frontend/src/assets.mjs';
import {createPlayer,stepPlayer,NEUTRAL} from '../shared/physics.mjs';

test('actual movement selects distinct idle, run, jump, fall and float animations',()=>{
  assert.equal(typeof art.getAnimationState,'function','Movement must select action-specific frames');
  const p=createPlayer('animation','Knight',0);
  for(let i=0;i<5;i++)stepPlayer(p);
  assert.equal(art.getAnimationState(p),'idle');
  for(let i=0;i<8;i++)stepPlayer(p,{...NEUTRAL,right:true});
  assert.equal(art.getAnimationState(p),'run');
  stepPlayer(p,{...NEUTRAL,jump:true});assert.equal(art.getAnimationState(p),'jump');
  for(let i=0;i<27;i++)stepPlayer(p);
  assert.equal(art.getAnimationState(p),'fall');
  stepPlayer(p,{...NEUTRAL,float:true});assert.equal(art.getAnimationState(p),'float');
  stepPlayer(p,{...NEUTRAL,dash:true});assert.equal(art.getAnimationState(p),'dash');
});

test('tether and wall poses take precedence over ordinary airborne frames',()=>{
  assert.equal(typeof art.getAnimationState,'function');
  const p=createPlayer('priority','Knight',0);
  Object.assign(p,{grounded:false,vy:100,floatActive:true,wallSide:1});
  assert.equal(art.getAnimationState(p),'cling');
  p.grappleId='silk-a';assert.equal(art.getAnimationState(p),'grapple');
  p.invulnerable=true;assert.equal(art.getAnimationState(p),'dash');
  p.dashVertical=true;assert.equal(art.getAnimationState(p),'wallDash');
});


test('whole-character clips advance exactly every 125 ms and loop at 8 fps',()=>{
  assert.equal(typeof art.getAnimationFrame,'function','Whole generated drawings must replace joint transforms');
  for(const skin of ['beetle','moth','ant','pillbug']){
    const a=art.getAnimationFrame(skin,'run',0);
    assert.equal(art.getAnimationFrame(skin,'run',.124).index,0);
    assert.equal(art.getAnimationFrame(skin,'run',.125).index,1);
    assert.equal(art.getAnimationFrame(skin,'run',.25).index,2);
    assert.equal(art.getAnimationFrame(skin,'run',.5).index,0);
    assert.deepEqual(art.getAnimationFrame(skin,'run',-1),a);
    assert.notDeepEqual(art.getAnimationFrame(skin,'run',.125).frame,a.frame,'Distinct complete drawing per frame');
  }
});
test('jump and dash hold their final drawings; float loops complete balloon poses',()=>{
  assert.equal(typeof art.getAnimationFrame,'function');
  assert.equal(art.getAnimationFrame('beetle','jump',10).index,3);
  assert.equal(art.getAnimationFrame('beetle','dash',10).index,3);
  assert.equal(art.getAnimationFrame('beetle','float',0).index,0);
  assert.equal(art.getAnimationFrame('beetle','float',.125).index,1);
  assert.equal(art.getAnimationFrame('beetle','float',.5).index,0);
});

test('idle uses one unchanged whole pose so sword and leg geometry cannot cycle',()=>{
  for(const skin of ['beetle','moth','ant','pillbug']){
    const reference=art.ANIMATIONS[skin].idle.frames[0];
    for(const elapsed of [-1,0,.2,.3,.34,.5,.67,1,1.34,2.4,3.2,6.4,30]){
      const pose=art.getAnimationFrame(skin,'idle',elapsed);
      assert.equal(pose.frame,reference,skin+' must not change its sword or legs');
      assert.equal(pose.nextFrame,reference);
      assert.equal(pose.index,0);assert.equal(pose.mix,0);assert.equal(pose.fps,0);
    }
    assert.equal(art.getAnimationFrame(skin,'run',.2).index,1);
  }
});

test('Thorn Ant matches the beetle and guardian body height without changing size across actions or missing wall contact',()=>{
  const track=new art.CharacterAnimation(),idle=track.sample('ant','idle',0);
  const f=idle.frame,height=idle.headHeight+f.shellHeight*f.scale*idle.magnification/2;
  assert.ok(height>=41&&height<=44,'Thorn Ant must stand at the other compact explorers\' body height: '+height);
  assert.ok(Math.abs(idle.headHeight-(f.pivotY-f.shellCenterY)*f.scale*idle.magnification)<1e-9,'Enlarged feet remain planted');
  for(const [i,state] of Object.keys(art.ANIMATIONS.ant).entries()){
    const pose=track.sample('ant',state,i+1);const settled=track.sample('ant',state,i+1.2);
    assert.equal(pose.magnification,idle.magnification);assert.equal(settled.magnification,idle.magnification);
    assert.equal(settled.headHeight,idle.headHeight,'Cape/action changes retain the enlarged body anchor');
  }
  for(const side of [-1,1]){
    const wallTrack=new art.CharacterAnimation();wallTrack.sample('ant','cling',0,{facing:side,wallSide:side,w:26});
    const pose=wallTrack.sample('ant','cling',.2,{facing:side,wallSide:side,w:26});
    const hand=pose.headX+pose.layers.reduce((sum,l)=>sum+l.facing*(l.frame.wallAttachX-l.frame.pivotX)*l.frame.scale*pose.magnification*l.weight,0);
    assert.ok(Math.abs(hand-side*13)<1e-9,'The enlarged raised hand stays on either wall');
  }
});

test('idle breathes and carries cape motion without resizing its fixed source pose',()=>{
  assert.equal(typeof art.getIdleMotion,'function','Idle needs local cape and breathing motion');
  for(const skin of ['beetle','moth','ant','pillbug']){
    const track=new art.CharacterAnimation(),start=track.sample(skin,'idle',0);
    assert.equal(start.idleBreath,0);
    const f=start.frame;
    assert.equal(start.headHeight,(f.pivotY-f.shellCenterY)*f.scale*start.magnification,'The held drawing keeps its feet at the fixed body anchor');
    const peak=track.sample(skin,'idle',.8);
    assert.ok(peak.idleBreath>.9,'Chest expands gently during inhalation');
    assert.ok(peak.layers[0].idleTime>start.layers[0].idleTime,'Cape motion advances continuously');
    assert.equal(peak.magnification,start.magnification);
    assert.equal(peak.headHeight,start.headHeight);
    assert.equal(peak.layers[0].frame,start.layers[0].frame);
    assert.ok(Math.abs(track.sample(skin,'idle',3.2).idleBreath)<1e-12,'Breathing loop closes continuously');
    const leaned=track.sample(skin,'idle',4);
    const run=track.sample(skin,'run',4);
    assert.equal(run.idleBreath,leaned.idleBreath,'Leaving idle starts from its displayed breath');
    const midway=track.sample(skin,'run',4.06);
    assert.ok(midway.idleBreath>0&&midway.idleBreath<run.idleBreath);
    const interrupted=track.sample(skin,'jump',4.06);
    assert.ok(Math.abs(interrupted.idleBreath-midway.idleBreath)<1e-12,'An interrupted change retains its displayed breath');
    assert.equal(track.sample(skin,'jump',4.2).idleBreath,0,'Movement has no idle deformation');
  }
});

test('idle texture interpolation closes its loop and stays bounded across negative/long clocks',()=>{
  assert.equal(typeof art.getIdleMotion,'function');
  assert.deepEqual(art.getIdleMotion(-1),art.getIdleMotion(0));
  const first=art.getIdleMotion(0),wrapped=art.getIdleMotion(3.2);
  assert.equal(first.index,wrapped.index);assert.equal(first.mix,wrapped.mix);
  assert.ok(Math.abs(first.breath-wrapped.breath)<1e-12);
  const before=art.getIdleMotion(3.2-1e-7);
  assert.equal(before.nextIndex,0);assert.ok(before.mix>.9999);
  for(const time of [.01,.05,.8,2.4,3.2-1e-12,17,100]){
    const motion=art.getIdleMotion(time);
    assert.ok(motion.mix>=0&&motion.mix<1);
    assert.ok(motion.index>=0&&motion.index<32&&motion.nextIndex>=0&&motion.nextIndex<32);
    assert.ok(Math.abs(motion.breath)<=1);
  }
});

test('cape envelopes never change the size of the character body',()=>{
  assert.equal(typeof art.getDisplayMagnification,'function');
  for(const skin of ['beetle','moth','ant','pillbug']){
    for(const state of Object.keys(art.ANIMATIONS[skin])){
      assert.equal(art.getDisplayMagnification(skin,state),art.getDisplayMagnification(skin,'idle'),skin+'/'+state+' keeps its normal display size');
      const track=new art.CharacterAnimation(),idle=track.sample(skin,'idle',0);
      track.sample(skin,state,.5);
      const pose=track.sample(skin,state,.8);
      assert.equal(pose.headHeight,idle.headHeight,'Cape changes do not move the body anchor');
      for(const layer of pose.layers)assert.ok(Math.abs(layer.frame.shellSpan*layer.frame.scale-20)<.001);
    }
  }
  assert.equal(art.getDisplayMagnification('moth','float'),1,'Large float cape keeps the normal body scale');
});

test('complete-frame blends progress smoothly, hold opacity and survive interrupted actions',async()=>{
  const module=await import('../frontend/src/assets.mjs');
  assert.equal(typeof module.CharacterAnimation,'function');
  const track=new module.CharacterAnimation();
  const idle=track.sample('pillbug','idle',0);
  const moving=track.sample('pillbug','run',.4);
  assert.deepEqual(moving.layers,idle.layers,'Action begins at the displayed drawing');
  const midway=track.sample('pillbug','run',.46);
  assert.ok(midway.layers.length>1,'Transition uses complete source drawings');
  assert.ok(Math.abs(midway.layers.reduce((sum,l)=>sum+l.weight,0)-1)<1e-9);
  const interrupt=track.sample('pillbug','float',.46);
  assert.deepEqual(interrupt.layers,midway.layers,'Interrupted change continues from the displayed mix');
  assert.equal(interrupt.magnification,midway.magnification);
  const inflated=track.sample('pillbug','float',.60);
  assert.equal(inflated.magnification,1,'A larger canopy does not inflate the body');
  assert.ok(inflated.layers.every(l=>module.ANIMATIONS.pillbug.float.frames.includes(l.frame)));
  const next=track.sample('pillbug','float',.70);
  assert.ok(next.layers.length>1,'Adjacent movement drawings blend during their interval');
  assert.ok(Math.abs(next.layers.reduce((sum,l)=>sum+l.weight,0)-1)<1e-9);
  const changed=track.sample('ant','idle',.70);
  assert.ok(changed.layers.every(l=>module.ANIMATIONS.ant.idle.frames.includes(l.frame)),'Character switch clears the old artwork');
  const loop=new module.CharacterAnimation();loop.sample('beetle','run',0);
  const beforeWrap=loop.sample('beetle','run',.499999),afterWrap=loop.sample('beetle','run',.5);
  assert.ok(beforeWrap.layers.find(l=>l.frame===module.ANIMATIONS.beetle.run.frames[0]).weight>.999);
  assert.ok(Math.abs(beforeWrap.headHeight-afterWrap.headHeight)<.001,'Loop wrap preserves pose alignment');
});

test('cling looks away from either wall and retains orientation through wall-jump blending',()=>{
  assert.equal(typeof art.getCharacterFacing,'function');
  for(const side of [-1,1]){
    const player={facing:side,wallSide:side};
    assert.equal(art.getCharacterFacing(player,'cling'),-side);
    assert.equal(art.getCharacterFacing(player,'run'),side);
    const track=new art.CharacterAnimation();
    const cling=track.sample('beetle','cling',0,player);
    assert.ok(cling.layers.every(l=>l.facing===side&&Number.isFinite(l.frame.wallAttachX)));
    const jump=track.sample('beetle','jump',.2,{facing:-side,wallSide:0});
    assert.deepEqual(jump.layers,cling.layers,'Outgoing wall pose keeps its wall orientation');
    assert.equal(jump.headX,cling.headX,'Wall jump begins at the displayed body position');
    const blend=track.sample('beetle','jump',.26,{facing:-side,wallSide:0});
    assert.ok(blend.layers.some(l=>l.frame.wallAttachX!==undefined&&l.facing===side));
    assert.ok(blend.layers.some(l=>l.frame.wallAttachX===undefined&&l.facing===-side));
    assert.ok(Math.abs(blend.headX)<Math.abs(cling.headX),'Body eases away from the wall anchor');
    assert.equal(track.sample('beetle','jump',.4,{facing:-side,wallSide:0}).headX,0);
  }
});

test('movement frames interpolate throughout each interval and double jump keeps its wings open',()=>{
  for(const skin of ['beetle','moth','ant','pillbug']){
    assert.ok(art.getAnimationFrame(skin,'run',.025).mix>0,'No static hold before each movement blend');
    assert.equal(art.getAnimationFrame(skin,'doubleJump',.5).index,2);
    assert.equal(art.getAnimationFrame(skin,'doubleJump',.625).index,3);
    assert.equal(art.getAnimationFrame(skin,'doubleJump',1).index,2,'Unfurl does not restart while rising');
    assert.equal(art.getAnimationFrame(skin,'fall',.5).index,2,'Fall reverses smoothly instead of snapping from last to first');
    assert.equal(art.getAnimationFrame(skin,'cling',.625).index,1);
  }
});
