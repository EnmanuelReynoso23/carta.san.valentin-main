import {ACTS,LETTER,LIGHTS} from './story.js';
import {buildTimeline,frameAt,StoryClock,clamp,lerp,SONG_SECONDS} from './timeline.js';
import {Music} from './audio.js';
import {Renderer,W,H,GROUND,LIFT_MAX,DAWN} from './render.js';

const $=id=>document.getElementById(id);
const SETTINGS_KEY='genesis-musica-v6';
const timeline=buildTimeline(ACTS);
const actRange=ACTS.map((_,index)=>{
  const steps=timeline.filter(step=>step.act===index);
  return {start:steps[0].start,end:steps.at(-1).end};
});
const renderer=new Renderer($('world'));
const music=new Music(text=>$('audioStatus').textContent=text);
const clock=new StoryClock();
const virtueDots=LIGHTS.map(light=>{
  const dot=document.createElement('i');
  dot.title=light.name;
  dot.setAttribute('aria-label',light.name);
  dot.style.setProperty('--virtue',light.color);
  $('virtueTrack').append(dot);
  return dot;
});

let settings={};
try{settings=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');}catch{}
let previous=performance.now();
let loading=true;
let speaker='';
let shownText='';
let testSeconds=null;
let settingsPaused=false;

const state={
  mode:'cover',
  time:0,
  lift:0,
  camera:0,
  fade:0,
  dawn:DAWN[0],
  pulse:0,
  scene:ACTS[0],
  progress:0,
  player:{x:ACTS[0].spawn,dir:1,phase:0,walking:false},
  guide:null,
  guideSolid:false,
  lights:[],
  people:[],
  carried:[],
  particles:[],
  flame:false,
  flameX:0,
  flameY:0,
  noteUntil:0,
  reduced:settings.reduced??matchMedia('(prefers-reduced-motion: reduce)').matches,
  pausedFrom:null,
};

function saveSettings(){
  try{
    localStorage.setItem(SETTINGS_KEY,JSON.stringify({
      volume:music.volume,
      muted:music.muted,
      reduced:state.reduced,
      source:music.source,
    }));
  }catch{}
}

function sceneLabels(scene){
  $('actLabel').textContent=scene.act;
  $('placeLabel').textContent=scene.name;
}

function resetWorld(){
  state.time=0;
  state.camera=0;
  state.fade=0;
  state.progress=0;
  state.pulse=0;
  state.scene=ACTS[0];
  state.player={x:ACTS[0].spawn,dir:1,phase:0,walking:false};
  state.guide=null;
  state.guideSolid=false;
  state.carried=[];
  state.particles=[];
  state.flame=true;
  state.noteUntil=0;
  state.lights=(ACTS.find(act=>act.lights)?.lights||[]).map((x,index)=>({
    x,
    y:126+(index%2)*15,
    taken:false,
    ...LIGHTS[index%LIGHTS.length],
  }));
  state.people=(ACTS.find(act=>act.people)?.people||[]).map((x,index)=>({
    x,
    name:['Simón','Nora','Lía','Mateo','Abril','Joel'][index],
    sprite:index*4,
    lit:false,
    received:null,
  }));
  clock.set(0);
  if(testSeconds!==null)testSeconds=0;
  speaker='';
  shownText='';
  $('dialogue').hidden=true;
  $('sceneNote').hidden=true;
  $('elapsed').style.width='0%';
  sceneLabels(ACTS[0]);
  refreshVirtues();
}

function refreshVirtues(){
  virtueDots.forEach((dot,index)=>{
    const light=state.lights[index];
    const status=!light?.taken?'waiting':state.carried.includes(light)?'carried':'given';
    dot.className=status;
  });
  const labels={waiting:'aún por encontrar',carried:'la lleva Génesis',given:'entregada'};
  $('virtueTrack').setAttribute('aria-label',
    'Almas y dones: '+LIGHTS.map((light,index)=>`${light.name}, ${labels[virtueDots[index].className]}`).join('; '),
  );
}

function sparkle(x,y,color,count=22){
  for(let i=0;i<count;i++){
    const angle=Math.random()*Math.PI*2;
    const speed=18+Math.random()*42;
    state.particles.push({
      x,y,
      vx:Math.cos(angle)*speed,
      vy:Math.sin(angle)*speed-22,
      life:.75+Math.random()*.8,
      size:Math.random()>.72?2:1,
      color,
    });
  }
}

function footstep(x,dir){
  for(let index=0;index<3;index++)state.particles.push({
    x:x-dir*(7+index*2),
    y:GROUND-2-index%2,
    vx:-dir*(4+Math.random()*7),
    vy:-3-Math.random()*7,
    life:.28+Math.random()*.2,
    size:1,
    color:'#d6c6ac',
  });
}

function announce(text){
  const note=$('sceneNote');
  note.querySelector('span').textContent=text;
  note.hidden=false;
  state.noteUntil=state.time+3.1;
}

function sourceSeconds(){return testSeconds!==null?testSeconds:music.seconds();}
function songSeconds(){return testSeconds!==null?SONG_SECONDS:music.duration();}

function start(){
  if(loading)return;
  music.restart();
  resetWorld();
  state.mode='story';
  $('cover').hidden=true;
  $('ending').hidden=true;
  $('pausePanel').hidden=true;
  $('chapterPill').hidden=false;
  music.start();
}

function letter(){
  if(state.mode==='ending')return;
  state.mode='ending';
  $('ending').hidden=false;
  $('dialogue').hidden=true;
  $('chapterPill').hidden=true;
  $('sceneNote').hidden=true;
  $('ending').scrollTop=0;
}

function pause(){
  if(state.mode!=='story')return;
  state.pausedFrom=state.mode;
  state.mode='pause';
  music.pause();
  $('pausePanel').hidden=false;
  $('resume').focus();
}

function resume(){
  if(state.mode!=='pause')return;
  state.mode=state.pausedFrom||'story';
  state.pausedFrom=null;
  $('pausePanel').hidden=true;
  music.resume();
  clock.resync();
}

function toCover(){
  music.pause();
  music.restart();
  state.mode='cover';
  resetWorld();
  $('cover').hidden=false;
  $('ending').hidden=true;
  $('pausePanel').hidden=true;
  $('chapterPill').hidden=true;
  $('dialogue').hidden=true;
}

function setReduced(value){
  state.reduced=value;
  $('reduced').checked=value;
  document.body.classList.toggle('soft-motion',value);
  saveSettings();
}

// El diálogo puede ocupar parte del encuadre en pantallas bajas. El mundo sube
// únicamente cuando el panel cruza la línea de suelo del lienzo.
function dialogueLift(){
  if(state.mode!=='story'||$('dialogue').hidden)return 0;
  const stage=$('stage').getBoundingClientRect();
  const panel=$('dialogue').getBoundingClientRect();
  if(!stage.height)return 0;
  return clamp((stage.bottom-panel.top)/stage.height*H-(H-GROUND)+11,0,LIFT_MAX);
}

function showLine(line,reveal){
  if(speaker!==line.who){
    speaker=line.who;
    $('speaker').textContent=line.who;
    renderer.portrait($('portrait'),line.who);
  }
  const visible=line.text.slice(0,state.reduced?line.text.length:Math.ceil(line.text.length*reveal));
  if(visible!==shownText){
    shownText=visible;
    $('line').textContent=visible;
  }
  $('dialogue').hidden=false;
}

function applyFrame(frame,dt){
  const scene=ACTS[frame.act];
  const player=state.player;
  if(state.scene!==scene){
    state.scene=scene;
    sceneLabels(scene);
    announce(scene.name);
  }

  const dx=frame.x-player.x;
  const previousStep=Math.floor(player.phase);
  if(Math.abs(dx)>.01){
    player.phase+=Math.abs(dx)/8.5;
    player.dir=dx>0?1:-1;
  }
  const nextStep=Math.floor(player.phase);
  if(frame.walking&&!state.reduced&&nextStep!==previousStep&&Math.abs(dx)<24)footstep(frame.x,player.dir);
  player.x=frame.x;
  player.walking=frame.walking;
  music.colour=frame.act;

  if(frame.line)showLine(frame.line,frame.reveal);
  else if(!$('dialogue').hidden){
    $('dialogue').hidden=true;
    shownText='';
  }

  state.fade=frame.step.kind==='transition'?Math.sin(frame.local*Math.PI):0;
  const range=actRange[frame.act];
  const inside=clamp((state.progress-range.start)/Math.max(1e-9,range.end-range.start),0,1);

  // Durante el viaje Enmanuel no se dibuja: solo altera luces, hojas y charcos
  // unos metros por delante. Su sprite aparece al amanecer, cuando se detiene.
  if(scene.guide){
    const x=Math.min(player.x+145+frame.act*8,scene.width-44);
    state.guide=state.guide||{x,phase:0};
    state.guide.phase+=Math.abs(x-state.guide.x)/8+dt*1.4;
    state.guide.x=x;
    state.guideSolid=false;
  }else if(scene.kind==='dawn'&&player.x>=300){
    state.guide={x:790,dir:-1,phase:0};
    state.guideSolid=true;
  }else{
    state.guide=null;
    state.guideSolid=false;
  }

  for(const light of state.lights){
    if(light.taken||scene.kind!=='garden'||player.x<light.x-5)continue;
    light.taken=true;
    state.carried.push(light);
    refreshVirtues();
    sparkle(light.x,light.y,light.color,27);
    music.tone(70+state.carried.length*2,.45,.11,'sine');
    announce('Encontraste el alma de la '+light.name+'.');
  }

  for(const person of state.people){
    // El don se entrega al marcharse: primero Génesis escucha a la persona.
    if(person.lit||scene.kind!=='plaza'||player.x<=person.x+8||!state.carried.length)continue;
    person.lit=true;
    const given=state.carried.shift();
    person.received=given;
    refreshVirtues();
    sparkle(person.x,GROUND-32,given.color,24);
    music.tone(76+state.people.filter(item=>item.lit).length*2,.55,.1,'triangle');
    announce(`Entregaste el don de la ${given.name} a ${person.name}.`);
  }

  if(scene.kind==='room'){
    state.flame=true;
    const release=clamp((inside-.78)/.2,0,1);
    state.flameX=lerp(510,player.x+30,release);
    state.flameY=lerp(175,GROUND-74,release)-Math.sin(state.time*2.3)*2;
  }else if(scene.kind!=='dawn'){
    state.flame=true;
    state.flameX=(state.guide?.x||player.x+58);
    state.flameY=GROUND-76+Math.sin(state.time*1.9)*5;
  }else{
    state.flame=false;
  }

  state.dawn=lerp(DAWN[frame.act],DAWN[Math.min(frame.act+1,DAWN.length-1)],inside);
  state.pulse=music.pulse();
  const portrait=innerHeight>innerWidth;
  const anchor=portrait?.5:.42;
  const minimum=portrait?-W*.35:0;
  const maximum=Math.max(minimum,scene.width-(portrait?W*.65:W));
  const target=clamp(player.x-W*anchor,minimum,maximum);
  state.camera=state.camera===0&&frame.index===0?target:lerp(state.camera,target,1-Math.exp(-dt*4.2));
}

function update(dt){
  state.time+=dt;
  state.lift=lerp(state.lift,dialogueLift(),state.reduced?1:1-Math.exp(-dt*7));
  for(const particle of state.particles){
    particle.x+=particle.vx*dt;
    particle.y+=particle.vy*dt;
    particle.vy+=48*dt;
    particle.life-=dt;
  }
  state.particles=state.particles.filter(particle=>particle.life>0);
  if(!state.noteUntil||state.time>state.noteUntil)$('sceneNote').hidden=true;
  if(state.mode!=='story')return;

  const seconds=clock.tick(sourceSeconds());
  const total=Math.max(30,songSeconds());
  state.progress=clamp(seconds/total,0,1);
  applyFrame(frameAt(timeline,state.progress),dt);
  $('elapsed').style.width=(state.progress*100).toFixed(2)+'%';
  if(state.progress>=.9995)letter();
}

function frame(now){
  const dt=Math.min(.05,(now-previous)/1000);
  previous=now;
  music.update(now);
  if(!loading){
    update(dt);
    renderer.render(state);
  }
  requestAnimationFrame(frame);
}

async function toggleFullscreen(){
  try{
    if(document.fullscreenElement)await document.exitFullscreen();
    else await $('stage').requestFullscreen();
  }catch{}
}

$('start').onclick=start;
$('replay').onclick=()=>{toCover();start();};
$('pause').onclick=()=>state.mode==='pause'?resume():pause();
$('home').onclick=()=>pause();
$('resume').onclick=resume;
$('restart').onclick=toCover;
$('reduced').onchange=event=>setReduced(event.target.checked);
$('fullscreen').onclick=toggleFullscreen;
$('settings').onclick=()=>{
  settingsPaused=state.mode==='story';
  if(settingsPaused)pause();
  $('musicPanel').showModal();
};
$('musicPanel').addEventListener('close',()=>{
  if(settingsPaused&&state.mode==='pause')resume();
  settingsPaused=false;
});
$('sound').onclick=()=>{
  const muted=music.toggleMute();
  $('sound').setAttribute('aria-pressed',String(!muted));
  $('sound').setAttribute('aria-label',muted?'Activar música':'Silenciar música');
  $('sound').textContent=muted?'♪̸':'♫';
  saveSettings();
};
$('volume').oninput=event=>{
  music.setVolume(Number(event.target.value)/100);
  $('volumeValue').value=event.target.value+'%';
  saveSettings();
};
$('loadYoutube').onclick=()=>music.connectYoutube().catch(()=>{});
$('localSource').onclick=()=>{music.select('local');clock.resync();saveSettings();};
$('youtubeSource').onclick=()=>{music.select('youtube');clock.resync();saveSettings();};
$('originalSource').onclick=()=>{music.select('original');clock.resync();saveSettings();};

addEventListener('keydown',event=>{
  if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
  if(event.key.toLowerCase()==='f'){
    event.preventDefault();
    toggleFullscreen();
    return;
  }
  if(event.key==='Escape'&&!$('musicPanel').open){
    event.preventDefault();
    state.mode==='pause'?resume():pause();
    return;
  }
  if((event.key===' '||event.key==='Enter')&&state.mode==='cover'){
    event.preventDefault();
    start();
  }
});
addEventListener('blur',()=>{if(state.mode==='story')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
document.addEventListener('fullscreenchange',()=>{
  const active=!!document.fullscreenElement;
  $('fullscreen').setAttribute('aria-label',active?'Salir de pantalla completa':'Ver en pantalla completa');
  $('fullscreen').textContent=active?'⛶':'⛶';
});

for(const item of LETTER){
  const paragraph=document.createElement('p');
  if(item.name){
    paragraph.className='soul-line';
    paragraph.style.setProperty('--soul',item.color);
    const name=document.createElement('strong');
    name.textContent=item.name+'. ';
    paragraph.append(name,document.createTextNode(item.text));
  }else paragraph.textContent=item.text;
  $('letterText').append(paragraph);
}

music.volume=clamp(Number(settings.volume??.45),0,1);
music.muted=!!settings.muted;
if(['local','youtube','original'].includes(settings.source))music.source=settings.source;
$('volume').value=music.volume*100;
$('volumeValue').value=Math.round(music.volume*100)+'%';
setReduced(state.reduced);
if(music.muted){
  $('sound').textContent='♪̸';
  $('sound').setAttribute('aria-pressed','false');
  $('sound').setAttribute('aria-label','Activar música');
}

document.querySelectorAll('.timeline i').forEach((marker,index)=>{
  const range=actRange[index+1];
  if(range)marker.style.setProperty('--mark',(range.start*100).toFixed(2)+'%');
});

try{
  await Promise.all([renderer.load(),music.prepare()]);
  music.updateSourceUI();
  loading=false;
  $('start').disabled=false;
  $('start').textContent='Empezar la historia';
  sceneLabels(ACTS[0]);
  renderer.render(state);
  requestAnimationFrame(frame);
}catch(error){
  $('start').textContent='No se pudo cargar el arte';
  $('audioStatus').textContent='Recarga la página para volver a cargar los personajes.';
  console.error(error);
}

// Un reloj controlable permite verificar toda la película sin acortar ni
// reemplazar ningún paso de la experiencia real.
const testParams=new URLSearchParams(location.search);
if(testParams.has('test')){
  testSeconds=0;
  window.__genesis={
    state,music,renderer,timeline,start,pause,resume,letter,
    advance(seconds,draw=false){
      const steps=Math.ceil(seconds*30);
      for(let i=0;i<steps;i++){
        const dt=seconds/steps;
        if(state.mode!=='pause')testSeconds+=dt;
        update(dt);
      }
      if(draw)renderer.render(state);
      return this.snapshot();
    },
    snapshot(){
      return {
        mode:state.mode,
        act:ACTS.indexOf(state.scene),
        scene:state.scene.id,
        progress:+state.progress.toFixed(4),
        x:Math.round(state.player.x),
        carried:state.carried.length,
        lights:state.lights.filter(light=>light.taken).length,
        people:state.people.filter(person=>person.lit).length,
        gifts:state.people.filter(person=>person.received).map(person=>[person.name,person.received.name]),
        guideVisible:!!state.guideSolid,
        musicPaused:music.paused,
        musicSource:music.source,
        musicLoop:!!music.local?.loop,
        speaker,
        line:shownText,
      };
    },
  };
  const previewAt=Number(testParams.get('at'));
  if(testParams.has('at')&&Number.isFinite(previewAt)){
    music.muted=true;
    music.source='original';
    start();
    window.__genesis.advance(clamp(previewAt,0,SONG_SECONDS),true);
  }
}
