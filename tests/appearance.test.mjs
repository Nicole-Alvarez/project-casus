import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMessage} from '../shared/protocol.mjs';
import {createPlayer,respawn,stepPlayer,NEUTRAL} from '../shared/physics.mjs';

test('appearance messages accept only supported sprite IDs and cannot carry movement state',()=>{
  for(const sprite of ['beetle','moth','ant','pillbug']){
    assert.deepEqual(parseMessage(JSON.stringify({type:'appearance',sprite})),{type:'appearance',sprite});
    assert.equal(parseMessage(JSON.stringify({type:'join',room:'skin',name:'Bug',sprite})).sprite,sprite);
  }
  for(const sprite of ['unknown','../secret',null,[],{},3])
    assert.equal(parseMessage(JSON.stringify({type:'appearance',sprite})),null);
  assert.equal(parseMessage(JSON.stringify({type:'appearance',sprite:'moth',x:999})),null);
  assert.equal(parseMessage(JSON.stringify({type:'join',room:'skin',name:'Bug',sprite:'unknown'})),null);
  assert.equal(parseMessage(JSON.stringify({type:'join',room:'skin',name:'Bug'})).sprite,'beetle');
});
test('sprite choice survives movement and respawn without changing collision dimensions',()=>{
  const a=createPlayer('a','Beetle',0,'beetle'),b=createPlayer('b','Moth',0,'moth');
  assert.equal(a.sprite,'beetle');assert.equal(b.sprite,'moth');
  for(let i=0;i<40;i++){stepPlayer(a,{...NEUTRAL,right:true,jump:i===5});stepPlayer(b,{...NEUTRAL,right:true,jump:i===5});}
  for(const key of ['x','y','vx','vy','w','h'])assert.equal(a[key],b[key]);
  respawn(b);assert.equal(b.sprite,'moth');assert.equal(b.w,26);assert.equal(b.h,44);
});
