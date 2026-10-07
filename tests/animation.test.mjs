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

test('idle holds each drawing for one third second while running remains at 8 fps',()=>{
  for(const skin of ['beetle','moth','ant','pillbug']){
    assert.equal(art.getAnimationFrame(skin,'idle',.2).index,0);
    assert.equal(art.getAnimationFrame(skin,'idle',.34).index,1);
    assert.equal(art.getAnimationFrame(skin,'idle',1.34).index,0);
    assert.equal(art.getAnimationFrame(skin,'run',.2).index,1);
  }
});

test('compact float and dash drawings retain comparable visible size to idle',()=>{
  assert.equal(typeof art.getDisplayMagnification,'function');
  for(const skin of ['beetle','moth','ant','pillbug']){
    const heights=state=>art.ANIMATIONS[skin][state].frames.map(f=>f.sh*f.scale);
    const mean=values=>values.reduce((sum,n)=>sum+n,0)/values.length;
    const idle=mean(heights('idle'));
    assert.ok(mean(heights('float'))*art.getDisplayMagnification(skin,'float')>=idle*.98);
    assert.ok(mean(heights('dash'))*art.getDisplayMagnification(skin,'dash')>=idle*.78);
    assert.equal(art.getDisplayMagnification(skin,'run'),1,'Other actions keep their approved size');
  }
  assert.equal(art.getDisplayMagnification('moth','float'),1,'Already tall float is not enlarged');
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
  assert.ok(inflated.magnification>1.2);
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
