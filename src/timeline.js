// La historia se cuenta sola. Aquí se convierte el guion en una línea de tiempo
// normalizada: cada paso ocupa una fracción del total y el total es la canción.
export const SONG_SECONDS=191.8;
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const smooth=t=>t*t*(3-2*t);

export function stepWeight(step){
  if(step.kind==='say')return 1.15+step.text.length/42;
  if(step.kind==='walk')return Math.max(.12,step.distance/95);
  return Math.max(.12,step.hold||1);
}

export function buildTimeline(acts,{transition=1.1}={}){
  const steps=[];
  acts.forEach((act,index)=>{
    let x=act.spawn;
    for(const raw of act.script){
      if(raw.kind==='walk'){steps.push({...raw,act:index,from:x,distance:Math.abs(raw.to-x)});x=raw.to;}
      else steps.push({...raw,act:index,at:x});
    }
    if(index<acts.length-1)steps.push({kind:'transition',act:index,at:x,hold:transition});
  });
  const total=steps.reduce((sum,step)=>sum+(step.weight=stepWeight(step)),0);
  let acc=0;
  for(const step of steps){step.start=acc/total;acc+=step.weight;step.end=acc/total;}
  return steps;
}

/** Paso que corresponde a un avance p (0 a 1) de la historia. */
export function stepAt(timeline,p){
  if(p<=0)return 0;
  if(p>=1)return timeline.length-1;
  let lo=0,hi=timeline.length-1;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(timeline[mid].start<=p)lo=mid;else hi=mid-1;}
  return lo;
}

/** Dónde está Génesis y qué se dice en ese instante. */
export function frameAt(timeline,p){
  const index=stepAt(timeline,clamp(p,0,1)),step=timeline[index];
  const span=Math.max(1e-9,step.end-step.start);
  const local=clamp((clamp(p,0,1)-step.start)/span,0,1);
  const x=step.kind==='walk'?lerp(step.from,step.to,smooth(local)):step.at;
  const walking=step.kind==='walk'&&step.distance>1&&local>0&&local<1;
  return {index,step,local,x,walking,act:step.act,
    dir:step.kind==='walk'?Math.sign(step.to-step.from)||1:0,
    line:step.kind==='say'?step:null,
    // El texto se escribe en el primer 55 % del paso y se queda a la vista el resto.
    reveal:step.kind==='say'?clamp(local/.55,0,1):0};
}

/** Segundos de pantalla de cada paso para una canción de esta duración. */
export function stepSeconds(timeline,seconds=SONG_SECONDS){
  return timeline.map(step=>(step.end-step.start)*seconds);
}

/** Reloj de la historia: avanza con la música y no salta si el vídeo salta. */
export class StoryClock{
  constructor(){this.last=null;this.value=0;}
  tick(sourceSeconds){
    if(this.last===null){this.last=sourceSeconds;return this.value;}
    const delta=sourceSeconds-this.last;this.last=sourceSeconds;
    if(delta>0&&delta<1.5)this.value+=delta;
    return this.value;
  }
  resync(){this.last=null;}
  set(value){this.value=Math.max(0,value);this.last=null;}
}
