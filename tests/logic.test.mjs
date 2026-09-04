import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {regularBeat,beatAtTime} from '../src/logic.js';
import {analyseBeats,VIDEO_ID,LOCAL_TRACK,TRACK_SECONDS} from '../src/audio.js';
import {ACTS,LETTER,LIGHTS} from '../src/story.js';
import {buildTimeline,frameAt,stepSeconds,SONG_SECONDS,StoryClock} from '../src/timeline.js';
import {DAWN} from '../src/render.js';

test('the bundled soundtrack and optional YouTube source are explicit',async()=>{
  assert.equal(VIDEO_ID,'gCS3ow7lSZA');
  assert.equal(LOCAL_TRACK,'assets/una-luz-para-ti.ogg');
  assert.equal(TRACK_SECONDS,192);
  const path=new URL('../assets/una-luz-para-ti.ogg',import.meta.url);
  const info=await stat(path);
  const header=await readFile(path);
  assert.ok(info.size>500_000,'soundtrack should contain the full encoded song');
  assert.equal(header.subarray(0,4).toString(),'OggS');
});

test('the seven locations form a complete automatic 3:12 film',()=>{
  assert.equal(SONG_SECONDS,192);
  assert.equal(ACTS.length,7);
  assert.equal(new Set(ACTS.map(act=>act.kind)).size,7);
  assert.equal(DAWN.length,ACTS.length);
  assert.ok(ACTS.slice(1,-1).every(act=>act.guide),'the unseen guide must stay ahead through the journey');
  for(const act of ACTS){
    assert.ok(act.spawn>=0&&act.spawn<=act.width);
    for(const step of act.script.filter(step=>step.kind==='walk'))assert.ok(step.to>=0&&step.to<=act.width);
  }
});

test('timeline transitions change locations while the screen is fully covered',()=>{
  const timeline=buildTimeline(ACTS);
  assert.equal(timeline[0].start,0);
  assert.ok(Math.abs(timeline.at(-1).end-1)<1e-12);
  for(const transition of timeline.filter(step=>step.kind==='transition')){
    const before=frameAt(timeline,transition.start+(transition.end-transition.start)*.49);
    const after=frameAt(timeline,transition.start+(transition.end-transition.start)*.51);
    assert.equal(before.act,transition.act);
    assert.equal(after.act,transition.nextAct);
    assert.equal(after.x,transition.nextAt);
  }
});

test('beat interpolation follows source time, including offset and end extrapolation',()=>{
  assert.equal(regularBeat(1.25,120,.25),2);
  assert.equal(beatAtTime(1.25,[.25,.75,1.25,1.75]),2);
  assert.equal(beatAtTime(2.25,[.25,.75,1.25,1.75]),4);
  assert.equal(beatAtTime(0,[.25,.75]),-.5);
});

test('a paused or seeking clock cannot jump over a timed sequence',()=>{
  const clock=new StoryClock();
  clock.tick(120);
  assert.equal(clock.tick(120.5),.5);
  assert.equal(clock.tick(250),.5);
  assert.equal(clock.tick(0),.5);
  assert.equal(clock.tick(.5),1);
  clock.resync();
  assert.equal(clock.tick(500),1);
  assert.equal(clock.tick(500.5),1.5);
});

test('automatic story timeline spans the exact full song duration',()=>{
  const timeline=buildTimeline(ACTS);
  const seconds=stepSeconds(timeline);
  const total=seconds.reduce((sum,value)=>sum+value,0);
  assert.ok(Math.abs(total-SONG_SECONDS)<1e-9);
  assert.equal(timeline.length>40,true);
  assert.equal(timeline.every(step=>step.end>=step.start),true);
});

test('the seven named virtues all use distinct colours',()=>{
  assert.deepEqual(LIGHTS.map(light=>light.name),[
    'Amabilidad','Justicia','Valentía','Perseverancia','Integridad','Paciencia','Determinación',
  ]);
  assert.equal(new Set(LIGHTS.map(light=>light.color)).size,LIGHTS.length);
  assert.equal(ACTS.find(act=>act.kind==='garden').lights.length,7);
  assert.equal(ACTS.find(act=>act.kind==='plaza').people.length,6);
  assert.deepEqual(LETTER.filter(item=>item.name).map(item=>item.name),LIGHTS.map(light=>light.name));
  assert.ok(LETTER.some(item=>item.text.includes('cariño y admiración')));
});

test('every line remains readable inside the fixed 3:12 soundtrack',()=>{
  const timeline=buildTimeline(ACTS);
  const seconds=stepSeconds(timeline);
  const dialogue=timeline
    .map((step,index)=>step.kind==='say'?step.text.length/seconds[index]:0)
    .filter(Boolean);
  assert.ok(Math.max(...dialogue)<21,'no line should require reading faster than 21 characters per second');
  assert.ok(Math.abs(seconds.reduce((sum,value)=>sum+value,0)-SONG_SECONDS)<1e-9);
});

test('source sprite rectangles keep complete figures and feet pivots',async()=>{
  const atlas=JSON.parse(await readFile(new URL('../assets/characters.json',import.meta.url),'utf8'));
  for(const name of ['genesis','enmanuel']){
    assert.equal(atlas[name].length,16);
    for(const frame of atlas[name]){
      assert.ok(frame.x>=0&&frame.y>=0&&frame.x+frame.w<=1254&&frame.y+frame.h<=1254);
      assert.ok(frame.pivotX>0&&frame.pivotX<frame.w);
      assert.equal(frame.pivotY,frame.h);
    }
  }
  assert.ok(atlas.genesis[0].h>314);
});

test('local audio beat analysis follows a known 120 BPM pulse train',()=>{
  const sampleRate=10_000;
  const data=new Float32Array(sampleRate*20);
  for(let time=.25;time<20;time+=.5){
    for(let index=0;index<150;index++)data[Math.floor(time*sampleRate)+index]=Math.sin(index*.8)*Math.exp(-index/25);
  }
  const beats=analyseBeats({getChannelData:()=>data,sampleRate});
  assert.ok(beats.length>30);
  const gaps=beats.slice(1).map((value,index)=>value-beats[index]).sort((a,b)=>a-b);
  assert.ok(Math.abs(gaps[Math.floor(gaps.length/2)]-.5)<.03);
});
