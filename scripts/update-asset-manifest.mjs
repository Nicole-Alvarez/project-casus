// Refresh provenance/inventory for the retained library. This never changes PNGs.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../assets/',import.meta.url);
async function list(dir,prefix=''){
  const files=[];
  for(const entry of await readdir(dir,{withFileTypes:true})){
    const path=prefix+entry.name;
    if(entry.isDirectory())files.push(...await list(new URL(entry.name+'/',dir),path+'/'));
    else if(entry.isFile())files.push(path);
  }
  return files.sort();
}
const paths=await list(root);
const generated=[];
for(const path of paths.filter(p=>p.startsWith('generated/sanctuary/')&&p.endsWith('.png'))){
  const bytes=await readFile(new URL(path,root));
  generated.push({path:path.slice('generated/sanctuary/'.length),sha256:createHash('sha256').update(bytes).digest('hex'),
    width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),mode:bytes[25]===6?'RGBA':'RGB'});
}
await writeFile(new URL('generated/sanctuary/manifest.json',root),JSON.stringify({
  generatedAt:'2026-10-07',tool:'built-in image-generation',
  characterReference:'../characters/replacement-concepts/bug-knights-v1.png',animationFps:8,
  files:generated,
},null,2)+'\n');
const files=[];
for(const path of paths.filter(p=>p!=='manifest.json')){
  const bytes=await readFile(new URL(path,root));
  const runtime=(path.startsWith('generated/sanctuary/')&&path.endsWith('.png'))||
    /^kenney-new-platformer\/audio\/sfx_(jump|magic)\.ogg$/.test(path);
  files.push({path,category:runtime?(path.endsWith('.ogg')?'audio':path.includes('/backgrounds/')?'backgrounds':'characters'):
    path.endsWith('License.txt')?'licenses':path.endsWith('.png')?'concepts':path.endsWith('.json')?'metadata':'documentation',
    runtime,sha256:createHash('sha256').update(bytes).digest('hex')});
}
await writeFile(new URL('manifest.json',root),JSON.stringify({
  sources:[{author:'Kenney',page:'https://kenney.nl/assets/new-platformer-pack',license:'CC0-1.0',
    files:['kenney-new-platformer/audio/sfx_jump.ogg','kenney-new-platformer/audio/sfx_magic.ogg','kenney-new-platformer/licenses/License.txt']}],
  generatedArt:{tool:'built-in image-generation',license:'No third-party CC0 license asserted'},
  files,
},null,2)+'\n');
console.log('Inventoried '+files.length+' retained files; '+files.filter(f=>f.runtime).length+' runtime image/sound files.');
