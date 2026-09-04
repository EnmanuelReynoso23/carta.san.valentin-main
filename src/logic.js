export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const positiveMod=(n,d)=>((n%d)+d)%d;
export const lerp=(a,b,t)=>a+(b-a)*t;
export function seeded(seed=7){return ()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};}
export function regularBeat(seconds,bpm=120,offset=0){return (seconds-offset)*bpm/60;}
export function beatAtTime(time,beats){
  if(!beats?.length)return regularBeat(time);
  if(beats.length===1)return (time-beats[0])*2;
  let lo=0,hi=beats.length-1;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(beats[mid]<=time)lo=mid;else hi=mid-1;}
  if(time<beats[0])return (time-beats[0])/(beats[1]-beats[0]);
  const next=beats[Math.min(lo+1,beats.length-1)];
  const span=lo===beats.length-1?beats[lo]-beats[lo-1]:next-beats[lo];
  return lo+(time-beats[lo])/Math.max(.15,span);
}
export function patternFor(heartIndex,mode,startBeat){
  const rng=seeded(239+heartIndex*173), notes=[];
  if(mode==='echo'){
    for(let round=0;round<4;round++){
      const pattern=Array.from({length:4},()=>Math.floor(rng()*3));
      for(let i=0;i<4;i++){
        notes.push({lane:pattern[i],beat:startBeat+round*16+i*1.5,kind:'listen',round});
        notes.push({lane:pattern[i],beat:startBeat+round*16+8+i*1.5,kind:'play',round});
      }
    }
  } else for(let i=0;i<32;i++)notes.push({lane:heartIndex===0?1:Math.floor(rng()*3),beat:startBeat+i*2,kind:'play'});
  return notes.sort((a,b)=>a.beat-b.beat).map((note,i)=>({...note,id:i,judged:false,hit:false}));
}
export function judgeNote(notes,lane,beat,window=.48){
  const candidates=notes.filter(n=>n.kind==='play'&&!n.judged&&n.lane===lane&&Math.abs(n.beat-beat)<=window);
  candidates.sort((a,b)=>Math.abs(a.beat-beat)-Math.abs(b.beat-beat));
  const n=candidates[0];if(!n)return null;n.judged=true;n.hit=true;return {note:n,perfect:Math.abs(n.beat-beat)<.2};
}
export function validSave(raw,sceneCount=8){
  if(!raw||raw.version!==3||!Number.isInteger(raw.scene)||raw.scene<0||raw.scene>=sceneCount||!Array.isArray(raw.hearts))return null;
  if(raw.hearts.some(h=>!Number.isInteger(h)||h<0||h>6))return null;
  const hearts=[...new Set(raw.hearts)].sort((a,b)=>a-b);
  for(let i=0;i<raw.scene;i++)if(!hearts.includes(i))return null;
  if(hearts.some(h=>h>raw.scene))return null;
  if(raw.finished&&(raw.scene!==sceneCount-1||hearts.length!==7))return null;
  return {version:3,scene:raw.scene,hearts,auto:!!raw.auto,finished:!!raw.finished};
}
export class ChallengeClock{
  constructor(){this.last=null;this.value=0;}
  tick(musicBeat){if(this.last===null){this.last=musicBeat;return this.value;}const delta=musicBeat-this.last;this.last=musicBeat;if(delta>=0&&delta<1.5)this.value+=delta;return this.value;}
  resync(){this.last=null;}
}
