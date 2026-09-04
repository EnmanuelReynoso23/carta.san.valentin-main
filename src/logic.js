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
