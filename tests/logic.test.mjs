import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {regularBeat,beatAtTime,patternFor,judgeNote,validSave,ChallengeClock} from '../src/logic.js';
import {analyseBeats,VIDEO_ID} from '../src/audio.js';
import {SCENES,HEARTS} from '../src/story.js';
import {platforms} from '../src/render.js';

test('long music link is the actual embedded source',()=>assert.equal(VIDEO_ID,'gCS3ow7lSZA'));
test('beat interpolation follows source time, including offset and end extrapolation',()=>{
  assert.equal(regularBeat(1.25,120,.25),2);assert.equal(beatAtTime(1.25,[.25,.75,1.25,1.75]),2);assert.equal(beatAtTime(2.25,[.25,.75,1.25,1.75]),4);assert.equal(beatAtTime(0,[.25,.75]),-.5);
});
test('seek, loop and pause cannot jump over a musical challenge',()=>{
  const c=new ChallengeClock();c.tick(120);assert.equal(c.tick(120.5),.5);assert.equal(c.tick(250),.5);assert.equal(c.tick(0),.5);assert.equal(c.tick(.5),1);c.resync();assert.equal(c.tick(500),1);assert.equal(c.tick(500.5),1.5);
});
test('a single note can only be judged once and wrong lanes do not score',()=>{
  const notes=patternFor(0,'pulse',4);assert.equal(judgeNote(notes,0,4),null);assert.ok(judgeNote(notes,1,4).perfect);assert.equal(judgeNote(notes,1,4),null);assert.equal(judgeNote(notes,1,5),null);
});
test('echo scenes repeat exactly the phrases that were played',()=>{
  const notes=patternFor(1,'echo',4);for(let round=0;round<4;round++){const part=notes.filter(n=>n.round===round);assert.deepEqual(part.filter(n=>n.kind==='listen').map(n=>n.lane),part.filter(n=>n.kind==='play').map(n=>n.lane));}
});
test('save validation rejects impossible chapter skips and deduplicates valid hearts',()=>{
  assert.equal(validSave({version:3,scene:3,hearts:[0,2]}),null);assert.equal(validSave({version:3,scene:0,hearts:[6]}),null);assert.equal(validSave({version:2,scene:0,hearts:[]}),null);assert.deepEqual(validSave({version:3,scene:2,hearts:[1,0,1]}).hearts,[0,1]);assert.equal(validSave({version:3,scene:7,hearts:[0,1,2,3,4,5,6],finished:true}).finished,true);
});
test('all encounters and exits have visible support, including the bridge',()=>{
  for(const scene of SCENES){const solid=platforms(scene);for(const x of [scene.spawn,scene.npcX,scene.exit])assert.ok(solid.some(p=>x>=p.x&&x<=p.x+p.w),scene.id+' missing floor at '+x);}
  assert.equal(HEARTS.length,7);assert.equal(new Set(HEARTS.map(h=>h.color)).size,7);
});
test('source sprite rectangles isolate figures without the former equal-grid crop',async()=>{
  const atlas=JSON.parse(await readFile(new URL('../assets/characters.json',import.meta.url),'utf8'));
  for(const name of ['genesis','enmanuel']){assert.equal(atlas[name].length,16);for(const f of atlas[name]){assert.ok(f.x>=0&&f.y>=0&&f.x+f.w<=1254&&f.y+f.h<=1254);assert.ok(f.pivotX>0&&f.pivotX<f.w);assert.equal(f.pivotY,f.h);}}
  assert.ok(atlas.genesis[0].h>314,'idle frame must keep feet beyond the old cell edge');
});
test('local audio beat analysis follows a known 120 BPM pulse train',()=>{
  const sr=10000,data=new Float32Array(sr*20);for(let t=.25;t<20;t+=.5)for(let j=0;j<150;j++)data[Math.floor(t*sr)+j]=Math.sin(j*.8)*Math.exp(-j/25);
  const beats=analyseBeats({getChannelData:()=>data,sampleRate:sr});assert.ok(beats.length>30);const gaps=beats.slice(1).map((v,i)=>v-beats[i]).sort((a,b)=>a-b);assert.ok(Math.abs(gaps[Math.floor(gaps.length/2)]-.5)<.03);
});
