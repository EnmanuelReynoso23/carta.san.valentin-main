import {ACTS,LETTER,LIGHTS} from './story.js';
import {buildTimeline,frameAt,StoryClock,clamp,lerp,SONG_SECONDS} from './timeline.js';
import {Music} from './audio.js';
import {Renderer,W,H,GROUND,LIFT_MAX,DAWN} from './render.js';

const $=id=>document.getElementById(id);
const SETTINGS_KEY='genesis-musica-v4';
const timeline=buildTimeline(ACTS);
// Dónde empieza y acaba cada acto dentro de la historia, para el color del cielo.
const actRange=ACTS.map((_,index)=>{
  const steps=timeline.filter(step=>step.act===index);
  return {start:steps[0].start,end:steps.at(-1).end};
});
const renderer=new Renderer($('world'));
const music=new Music(text=>$('audioStatus').textContent=text);
const clock=new StoryClock();

let settings={};try{settings=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');}catch{}
let previous=performance.now(),loading=true,speaker='',shownText='',testSeconds=null;

const state={
  mode:'cover',time:0,lift:0,camera:0,fade:0,dawn:DAWN[0],scene:ACTS[0],progress:0,
  player:{x:ACTS[0].spawn,dir:1,phase:0,walking:false},
  ghost:null,ghostSolid:false,lights:[],people:[],carried:[],particles:[],
  flame:false,flameX:0,flameY:0,
  reduced:settings.reduced??matchMedia('(prefers-reduced-motion: reduce)').matches,
  pausedFrom:null,
};

function saveSettings(){
  try{localStorage.setItem(SETTINGS_KEY,JSON.stringify({volume:music.volume,muted:music.muted,reduced:state.reduced,source:music.source}));}catch{}
}
function resetWorld(){
  state.time=0;state.camera=0;state.fade=0;state.progress=0;state.scene=ACTS[0];
  state.player={x:ACTS[0].spawn,dir:1,phase:0,walking:false};
  state.ghost=null;state.ghostSolid=false;state.carried=[];state.particles=[];state.flame=false;
  state.lights=(ACTS[2].lights||[]).map((x,i)=>({x,y:128+(i%2)*14,taken:false,...LIGHTS[i%LIGHTS.length]}));
  state.people=(ACTS[3].people||[]).map((x,i)=>({x,sprite:[4,0,8,5][i%4],lit:false}));
  clock.set(0);testSeconds=testSeconds===null?null:0;
  speaker='';shownText='';$('dialogue').hidden=true;
  sceneLabels(ACTS[0]);
}
function sceneLabels(scene){
  $('actLabel').textContent=scene.act;$('placeLabel').textContent=scene.name;$('note').textContent='';
}
function sparkle(x,y,color,count=22){
  for(let i=0;i<count;i++)state.particles.push({x,y,vx:(Math.random()-.5)*44,vy:-18-Math.random()*46,life:1.3,color});
}
/** Segundos de canción que llevamos, con la fuente que esté sonando. */
function sourceSeconds(){return testSeconds!==null?testSeconds:music.seconds();}
function songSeconds(){return testSeconds!==null?SONG_SECONDS:music.duration();}

function start(){
  if(loading)return;
  resetWorld();
  state.mode='story';
  $('cover').hidden=true;$('ending').hidden=true;$('pausePanel').hidden=true;
  $('sceneLabel').hidden=false;
  music.start();
}
function letter(){
  state.mode='ending';$('ending').hidden=false;$('dialogue').hidden=true;$('sceneLabel').hidden=true;$('ending').scrollTop=0;
}
function pause(){
  if(state.mode!=='story')return;
  state.pausedFrom=state.mode;state.mode='pause';music.pause();$('pausePanel').hidden=false;$('resume').focus();
}
function resume(){
  if(state.mode!=='pause')return;
  state.mode=state.pausedFrom||'story';state.pausedFrom=null;$('pausePanel').hidden=true;music.resume();clock.resync();
}
function toCover(){
  music.pause();state.mode='cover';resetWorld();
  $('cover').hidden=false;$('ending').hidden=true;$('pausePanel').hidden=true;$('sceneLabel').hidden=true;$('dialogue').hidden=true;
}
function setReduced(value){
  state.reduced=value;$('reduced').checked=value;document.body.classList.toggle('soft-motion',value);saveSettings();
}
// El panel de conversación tapa el suelo: el mundo sube lo justo para que
// Génesis y quien le habla sigan a la vista, en móvil también.
function dialogueLift(){
  if(state.mode!=='story'||$('dialogue').hidden)return 0;
  const stage=$('stage').getBoundingClientRect(),panel=$('dialogue').getBoundingClientRect();
  if(!stage.height)return 0;
  return clamp((stage.bottom-panel.top)/stage.height*H-(H-GROUND)+12,0,LIFT_MAX);
}
function showLine(line,reveal){
  if(speaker!==line.who){speaker=line.who;$('speaker').textContent=line.who;renderer.portrait($('portrait'),line.who);}
  const visible=line.text.slice(0,state.reduced?line.text.length:Math.ceil(line.text.length*reveal));
  if(visible!==shownText){shownText=visible;$('line').textContent=visible;}
  $('dialogue').hidden=false;
}
function applyFrame(frame,dt){
  const scene=ACTS[frame.act],player=state.player;
  if(state.scene!==scene){state.scene=scene;sceneLabels(scene);}
  const dx=frame.x-player.x;
  if(Math.abs(dx)>.01){player.phase+=Math.abs(dx)/9;player.dir=dx>0?1:-1;}
  player.x=frame.x;player.walking=frame.walking;
  music.colour=frame.act;
  if(frame.line)showLine(frame.line,frame.reveal);
  else if(!$('dialogue').hidden){$('dialogue').hidden=true;shownText='';}
  state.fade=frame.step.kind==='transition'?Math.sin(frame.local*Math.PI):0;

  // El chico va siempre por delante y nunca se deja alcanzar… hasta el final.
  if(scene.ghost){
    const x=Math.min(player.x+150+frame.act*12,scene.width-40);
    state.ghost=state.ghost||{x,dir:1,phase:0};
    state.ghost.phase+=Math.abs(x-state.ghost.x)/9+dt*1.5;state.ghost.x=x;state.ghost.dir=1;
    state.ghostSolid=false;
  }else if(scene.kind==='dawn'){
    state.ghost={x:585,dir:-1,phase:0};state.ghostSolid=true;
  }else{state.ghost=null;state.ghostSolid=false;}

  for(const light of state.lights){
    if(light.taken||frame.act!==2||player.x<light.x-6)continue;
    light.taken=true;state.carried.push(light);
    sparkle(light.x,light.y,light.color);music.tone(72+state.carried.length*2,.4,.12,'sine');
    $('note').textContent='Recogiste '+light.name+'.';
  }
  for(const person of state.people){
    if(person.lit||frame.act!==3||player.x<person.x-14||!state.carried.length)continue;
    person.lit=true;const given=state.carried.shift();
    sparkle(person.x,GROUND-30,given.color,18);music.tone(79+state.people.filter(p=>p.lit).length,.5,.12,'triangle');
    $('note').textContent='Le dejaste '+given.name+'.';
  }

  if(frame.act===0){
    state.flame=!!frame.step.flame;
    state.flameX=470;state.flameY=lerp(178,96,frame.step.flame?frame.local:0);
  }else if(frame.act<4){
    state.flame=true;
    state.flameX=player.x+player.dir*26;state.flameY=GROUND-78+Math.sin(state.time*1.6)*4;
  }else state.flame=false;

  const range=actRange[frame.act];
  const inside=clamp((state.progress-range.start)/Math.max(1e-9,range.end-range.start),0,1);
  state.dawn=lerp(DAWN[frame.act],DAWN[Math.min(frame.act+1,DAWN.length-1)],inside);
  const target=clamp(player.x-W*.42,0,Math.max(0,scene.width-W));
  state.camera=state.camera===0&&frame.index===0?target:lerp(state.camera,target,1-Math.exp(-dt*4));
}
function update(dt){
  state.time+=dt;
  state.lift=lerp(state.lift,dialogueLift(),state.reduced?1:1-Math.exp(-dt*7));
  for(const p of state.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=52*dt;p.life-=dt;}
  state.particles=state.particles.filter(p=>p.life>0);
  if(state.mode!=='story')return;
  const seconds=clock.tick(sourceSeconds()),total=Math.max(30,songSeconds());
  state.progress=clamp(seconds/total,0,1);
  applyFrame(frameAt(timeline,state.progress),dt);
  $('elapsed').style.width=(state.progress*100).toFixed(1)+'%';
  if(state.progress>=1)letter();
}
function frame(now){
  const dt=Math.min(.05,(now-previous)/1000);previous=now;
  music.update(now);
  if(!loading){update(dt);renderer.render(state);}
  requestAnimationFrame(frame);
}

$('start').onclick=start;
$('replay').onclick=()=>{toCover();start();};
$('pause').onclick=()=>state.mode==='pause'?resume():pause();
$('home').onclick=event=>{event.preventDefault();pause();};
$('resume').onclick=resume;
$('restart').onclick=toCover;
$('reduced').onchange=event=>setReduced(event.target.checked);
$('sound').onclick=()=>{
  const muted=music.toggleMute();
  $('sound').setAttribute('aria-pressed',String(!muted));
  $('sound').setAttribute('aria-label',muted?'Activar música':'Silenciar música');
  $('sound').textContent=muted?'♪̸':'♫';saveSettings();
};
$('volume').oninput=event=>{music.setVolume(Number(event.target.value)/100);$('volumeValue').value=event.target.value+'%';saveSettings();};
$('loadYoutube').onclick=()=>music.connectYoutube().catch(()=>{});
$('youtubeSource').onclick=()=>{music.select('youtube');clock.resync();saveSettings();};
$('originalSource').onclick=()=>{music.select('original');clock.resync();saveSettings();};

addEventListener('keydown',event=>{
  if(['INPUT','TEXTAREA','SELECT','SUMMARY'].includes(document.activeElement?.tagName))return;
  if(event.key==='Escape'){event.preventDefault();state.mode==='pause'?resume():pause();return;}
  if((event.key===' '||event.key==='Enter')&&state.mode==='cover'){event.preventDefault();start();}
});
addEventListener('blur',()=>{if(state.mode==='story')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});

for(const text of LETTER){const p=document.createElement('p');p.textContent=text;$('letterText').append(p);}
music.volume=clamp(Number(settings.volume??.35),0,1);music.muted=!!settings.muted;
$('volume').value=music.volume*100;$('volumeValue').value=Math.round(music.volume*100)+'%';
if(settings.source==='original'){music.source='original';document.querySelector('.video-box').hidden=true;
  $('youtubeSource').classList.remove('selected');$('youtubeSource').setAttribute('aria-pressed','false');
  $('originalSource').classList.add('selected');$('originalSource').setAttribute('aria-pressed','true');}
setReduced(state.reduced);
if(music.muted){$('sound').textContent='♪̸';$('sound').setAttribute('aria-pressed','false');$('sound').setAttribute('aria-label','Activar música');}

try{
  await renderer.load();
  loading=false;
  $('start').disabled=false;$('start').textContent='Empezar la historia';
  sceneLabels(ACTS[0]);renderer.render(state);
  requestAnimationFrame(frame);
}catch(error){
  $('start').textContent='No se pudo cargar el arte';
  $('audioStatus').textContent='Recarga la página para volver a cargar los personajes.';
  console.error(error);
}

// Reloj de pruebas: mueve la misma historia, con el mismo guion y los mismos
// pasos que ve cualquiera. No salta ni acorta nada.
if(new URLSearchParams(location.search).has('test')){
  testSeconds=0;
  window.__genesis={state,music,renderer,timeline,start,pause,resume,letter,
    advance(seconds,draw=false){
      const steps=Math.ceil(seconds*30);
      for(let i=0;i<steps;i++){const dt=seconds/steps;if(state.mode!=='pause')testSeconds+=dt;update(dt);}
      if(draw)renderer.render(state);
      return this.snapshot();
    },
    snapshot(){return {mode:state.mode,act:ACTS.indexOf(state.scene),progress:+state.progress.toFixed(4),
      x:Math.round(state.player.x),carried:state.carried.length,
      lights:state.lights.filter(l=>l.taken).length,people:state.people.filter(p=>p.lit).length,
      speaker,line:shownText};}
  };
}
