import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as art from '../frontend/src/assets.mjs';
const root=new URL('../assets/',import.meta.url);

test('retained asset inventory resolves all files and hashes without obsolete downloads',async()=>{
  const manifest=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
  assert.equal(new Set(manifest.files.map(f=>f.path)).size,manifest.files.length);
  for(const file of manifest.files){
    assert.ok((await stat(new URL(file.path,root))).isFile(),file.path);
    const bytes=await readFile(new URL(file.path,root));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256,file.path);
  }
  async function list(dir,prefix=''){const result=[];for(const e of await readdir(dir,{withFileTypes:true})){
    const path=prefix+e.name;if(e.isDirectory())result.push(...await list(new URL(e.name+'/',dir),path+'/'));
    else result.push(path);
  }return result;}
  const actual=await list(root);
  assert.deepEqual(actual.sort(),['manifest.json',...manifest.files.map(f=>f.path)].sort(),'No unreferenced leftover asset files');
  assert.equal(actual.some(p=>p.endsWith('.zip')),false);
});
test('every character action has complete local frames with stable shell size and valid anchors',async()=>{
  const sizes={};
  for(const [key,path] of Object.entries(art.RUNTIME_ART)){
    const bytes=await readFile(new URL(path.replace('/game-assets/',''),root));
    assert.equal(bytes.subarray(1,4).toString(),'PNG');
    sizes[key]=[bytes.readUInt32BE(16),bytes.readUInt32BE(20)];
  }
  for(const skin of ['beetle','moth','ant','pillbug']){
    assert.deepEqual(Object.keys(art.ANIMATIONS[skin]).sort(),['idle','run','jump','fall','doubleJump','grapple','float','cling','dash','wallDash'].sort());
    for(const clip of Object.values(art.ANIMATIONS[skin])){
      assert.equal(clip.frames.length,4);
      for(const frame of clip.frames){
        const [w,h]=sizes[frame.sheet];
        assert.ok(frame.sx>=0&&frame.sy>=0&&frame.sw>0&&frame.sh>0);
        assert.ok(frame.sx+frame.sw<=w&&frame.sy+frame.sh<=h,'Complete pose stays inside its source');
        assert.ok(frame.seedX>=0&&frame.seedX<frame.sw&&frame.seedY>=0&&frame.seedY<frame.sh);
        assert.ok(Number.isFinite(frame.pivotX)&&Number.isFinite(frame.pivotY)&&frame.scale>0);
        assert.ok(Math.abs(frame.shellSpan*frame.scale-20)<.001,'Floating and angled drawings do not enlarge their shells');
      }
    }
  }
});
