import {LETTER} from './story.js';
import {Game} from './game.js';
import {Director} from './auto.js';
import {Input} from './input.js';
import {Music} from './audio.js';
import {Renderer,W,H,GROUND,LIFT_MAX} from './render.js';
import {clamp,lerp} from './logic.js';

const $=id=>document.getElementById(id);
const SETTINGS_KEY='genesis-ajustes-v5';
const testing=new URLSearchParams(location.search).has('test');

let settings={};try{settings=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');}catch{}
let loading=true,previous=performance.now(),toastUntil=0,shownLine='',shownWho='';

const renderer=new Renderer($('world'));
const music=new Music(text=>$('audioStatus').textContent=text);
const input=new Input();
const director=new Director();
const game=new Game({storage:localStorage,emit:handle});
game.state.reduced=settings.reduced??matchMedia('(prefers-reduced-motion: reduce)').matches;
game.state.auto=false;

// ---- lo que pasa en el juego, contado en pantalla ---------------------------
function handle(kind,data){
  if(kind==='scene'){
    $('actLabel').textContent=data.act;$('placeLabel').textContent=data.name;$('note').textContent='';
    $('sceneLabel').hidden=false;music.colour=game.state.actIndex;
  }
  if(kind==='goal')$('goal').textContent=data;
  if(kind==='note')$('note').textContent=data;
  if(kind==='toast')toast(data);
  if(kind==='talk')speak(data);
  if(kind==='jump')music.tone(81,.08,.04,'square');
  if(kind==='interact')music.tone(76,.14,.05,'sine');
  if(kind==='pickup'){music.tone(72+game.state.carried.length*2,.4,.12,'sine');lightsHud();}
  if(kind==='give'){music.tone(79+game.state.given.length,.5,.12,'triangle');lightsHud();}
  if(kind==='wish')music.celebrate(0);
  if(kind==='end')ending();
}
function toast(text){
  $('toast').textContent=text;$('toast').hidden=false;toastUntil=performance.now()+2600;placeToast();
}
/** El aviso se coloca justo encima del panel de conversación, nunca debajo. */
function placeToast(){
  const stage=$('stage').getBoundingClientRect();
  if(!stage.height)return;
  const panel=$('dialogue');
  const bottom=panel.hidden?stage.height*.09:stage.bottom-panel.getBoundingClientRect().top+10;
  $('toast').style.bottom=Math.round(bottom)+'px';
}
function speak(line){
  if(!line){$('dialogue').hidden=true;shownLine='';shownWho='';return;}
  $('dialogue').hidden=false;
  if(shownWho!==line.who){shownWho=line.who;$('speaker').textContent=line.who;renderer.portrait($('portrait'),line.who);}
}
function lightsHud(){
  const carried=game.state.carried||[];
  $('lights').innerHTML='';
  for(const light of carried){
    const span=document.createElement('span');
    span.className='collection-heart';span.textContent='✦';span.style.color=light.color;span.title=light.name;
    $('lights').append(span);
  }
}
/**
 * El panel de conversación tapa el suelo: el mundo sube lo justo para que
 * Génesis y quien le habla sigan a la vista, en escritorio y en teléfono.
 */
function dialogueLift(){
  if(game.state.mode!=='play'||$('dialogue').hidden)return 0;
  const stage=$('stage').getBoundingClientRect(),panel=$('dialogue').getBoundingClientRect();
  if(!stage.height)return 0;
  return clamp((stage.bottom-panel.top)/stage.height*H-(H-GROUND)+12,0,LIFT_MAX);
}
function prompt(){
  const state=game.state,item=state.prompt;
  if(!item||game.talking||state.mode!=='play'||state.auto){$('interaction').hidden=true;return;}
  $('interaction').style.left=(worldToStage(item.x-state.camera)*100).toFixed(1)+'%';
  $('interaction').textContent=(input.kind==='táctil'?'✦ ':input.kind==='mando'?'Ⓐ ':'E · ')+item.text;
  $('interaction').hidden=false;
}

/**
 * De una x del mundo a la fracción del escenario donde cae. En el teléfono el
 * lienzo se recorta para llenar la pantalla, y esto lo tiene en cuenta.
 */
function worldToStage(x){
  const stage=$('stage').getBoundingClientRect(),canvas=$('world').getBoundingClientRect();
  if(!stage.width||!canvas.width)return clamp(x/W,.06,.94);
  const scale=getComputedStyle($('world')).objectFit==='cover'
    ?Math.max(canvas.width/W,canvas.height/H):Math.min(canvas.width/W,canvas.height/H);
  const left=canvas.left+(canvas.width-W*scale)/2-stage.left;
  return clamp((left+x*scale)/stage.width,.06,.94);
}

// ---- el latido --------------------------------------------------------------
function step(dt){
  const state=game.state;
  const manual=input.read();
  const intent=state.auto?director.intent(game,dt):manual;
  game.update(dt,intent);
  state.lift=lerp(state.lift||0,dialogueLift(),state.reduced?1:1-Math.exp(-dt*7));
  state.solids=game.solids;state.exitOpen=game.exitOpen();
  state.cheer=state.mode==='ending';
  if(game.talking){
    const visible=game.dialogue.visible;
    if(visible!==shownLine){shownLine=visible;$('line').textContent=visible;}
    $('next').hidden=!game.dialogue.done;
  }else if(!$('dialogue').hidden&&!game.dialogue.active)speak(null);
  prompt();
  $('elapsed').style.width=((state.progress||0)*100).toFixed(1)+'%';
  if(!$('toast').hidden){placeToast();if(performance.now()>toastUntil)$('toast').hidden=true;}
}
function frame(now){
  const dt=Math.min(.05,(now-previous)/1000);previous=now;
  music.update(now);
  if(!loading){step(dt);renderer.render(game.state);}
  requestAnimationFrame(frame);
}

// ---- entrar y salir del viaje ----------------------------------------------
function play(saved=null){
  game.begin(saved);
  lightsHud();
  $('cover').hidden=true;$('ending').hidden=true;$('pausePanel').hidden=true;
  $('sceneLabel').hidden=false;$('hud').hidden=false;
  document.body.classList.add('playing');
  input.clear();
  music.start();
  if(!game.state.auto)toast(input.kind==='táctil'?'Camina con ◀ ▶ y salta con ▲':'Camina con ← → y salta con ↑');
}
function pause(){
  if(game.state.mode!=='play')return;
  game.state.mode='pause';music.pause();$('pausePanel').hidden=false;$('resume').focus();input.clear();
}
function resume(){
  if(game.state.mode!=='pause')return;
  game.state.mode='play';$('pausePanel').hidden=true;music.resume();input.clear();
}
function cover(){
  music.pause();game.reset();
  $('cover').hidden=false;$('ending').hidden=true;$('pausePanel').hidden=true;
  $('sceneLabel').hidden=true;$('hud').hidden=true;$('dialogue').hidden=true;$('interaction').hidden=true;
  document.body.classList.remove('playing');
  offerContinue();
}
function ending(){
  $('ending').hidden=false;$('dialogue').hidden=true;$('interaction').hidden=true;$('ending').scrollTop=0;
  music.celebrate(4);
}
function offerContinue(){
  const saved=game.loadSave();
  $('continue').hidden=!(saved&&(saved.act>0||saved.finished));
}
function setReduced(value){
  game.state.reduced=value;game.dialogue.instant=value;
  $('reduced').checked=value;document.body.classList.toggle('soft-motion',value);saveSettings();
}
function setAuto(value,{quiet=false}={}){
  game.state.auto=value;
  $('auto').setAttribute('aria-pressed',String(value));
  $('auto').textContent=value?'✋ Jugar yo':'▶ Historia';
  $('autoCheck').checked=value;
  if(value)$('interaction').hidden=true;
  if(!quiet)toast(value?'La historia se cuenta sola. Toca cualquier tecla para jugar.':'Tomas el control.');
  saveSettings();
}
function saveSettings(){
  try{localStorage.setItem(SETTINGS_KEY,JSON.stringify({volume:music.volume,muted:music.muted,reduced:game.state.reduced}));}catch{}
}

// ---- mandos y botones -------------------------------------------------------
input.bind({buttons:[...document.querySelectorAll('#pad button')],onAny:()=>{
  if(game.state.auto&&game.state.mode==='play')setAuto(false);
}});
$('start').onclick=()=>play(null);
$('continue').onclick=()=>play(game.loadSave());
$('storyMode').onclick=()=>{setAuto(true,{quiet:true});play(null);};
$('replay').onclick=()=>{game.clearSave();play(null);};
$('look').onclick=()=>{$('ending').hidden=true;toast('Toca la pantalla para volver a la carta.');};
$('stage').addEventListener('click',()=>{if(game.state.mode==='ending'&&$('ending').hidden)$('ending').hidden=false;});
$('next').onclick=event=>{event.stopPropagation();game.advance();};
$('dialogue').onclick=()=>game.advance();
$('pause').onclick=()=>game.state.mode==='pause'?resume():pause();
$('home').onclick=event=>{event.preventDefault();pause();};
$('resume').onclick=resume;
$('restart').onclick=()=>{game.clearSave();cover();};
$('reduced').onchange=event=>setReduced(event.target.checked);
$('autoCheck').onchange=event=>setAuto(event.target.checked);
$('auto').onclick=()=>setAuto(!game.state.auto);
$('full').onclick=async()=>{
  try{
    if(document.fullscreenElement){await document.exitFullscreen();$('full').setAttribute('aria-pressed','false');}
    else{await document.documentElement.requestFullscreen();$('full').setAttribute('aria-pressed','true');}
  }catch{toast('Tu navegador no deja pantalla completa aquí.');}
};
$('sound').onclick=()=>{
  const muted=music.toggleMute();
  $('sound').setAttribute('aria-pressed',String(!muted));
  $('sound').setAttribute('aria-label',muted?'Activar música':'Silenciar música');
  $('sound').textContent=muted?'♪̸':'♫';saveSettings();
};
$('volume').oninput=event=>{music.setVolume(Number(event.target.value)/100);$('volumeValue').value=event.target.value+'%';saveSettings();};
$('loadYoutube').onclick=()=>music.connectYoutube().catch(()=>{});
addEventListener('keydown',event=>{
  if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
  if(event.key==='Escape'){event.preventDefault();game.state.mode==='pause'?resume():pause();return;}
  if(event.key==='h'||event.key==='H'){setAuto(!game.state.auto);return;}
  if(game.state.mode==='cover'&&(event.key==='Enter'||event.key===' ')){event.preventDefault();play(null);}
});
// Tocar el reproductor de YouTube no es irse del juego: sólo se pausa cuando
// de verdad se cambia de ventana.
addEventListener('blur',()=>{if(document.activeElement?.tagName!=='IFRAME')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
if(matchMedia('(hover: none)').matches)document.body.classList.add('touch');
addEventListener('touchstart',()=>document.body.classList.add('touch'),{once:true,passive:true});

// ---- arranque ---------------------------------------------------------------
for(const text of LETTER){const p=document.createElement('p');p.textContent=text;$('letterText').append(p);}
music.volume=clamp(Number(settings.volume??.35),0,1);music.muted=!!settings.muted;
$('volume').value=music.volume*100;$('volumeValue').value=Math.round(music.volume*100)+'%';
setReduced(game.state.reduced);
setAuto(false,{quiet:true});
if(music.muted){$('sound').textContent='♪̸';$('sound').setAttribute('aria-pressed','false');$('sound').setAttribute('aria-label','Activar música');}
offerContinue();

try{
  await renderer.load();
  loading=false;
  $('start').disabled=false;$('start').textContent='Empezar mi aventura';
  game.state.solids=game.solids;
  renderer.render(game.state);
  requestAnimationFrame(frame);
  if('serviceWorker' in navigator&&!testing&&location.protocol.startsWith('http'))
    navigator.serviceWorker.register('sw.js').catch(()=>{});
}catch(error){
  $('start').textContent='No se pudo cargar el arte';
  $('audioStatus').textContent='Recarga la página para volver a cargar los personajes.';
  console.error(error);
}

// Puerta de pruebas: mueve el mismo juego, con los mismos mandos y los mismos
// pasos que ve cualquiera. No salta nada ni acorta el camino.
if(testing){
  window.__genesis={game,music,renderer,input,director,
    get state(){return game.state;},
    play,pause,resume,setAuto,
    advance(seconds,draw=false){
      const steps=Math.ceil(seconds*60);
      for(let i=0;i<steps;i++)step(seconds/steps);
      if(draw)renderer.render(game.state);
      return this.snapshot();
    },
    snapshot(){return {...game.snapshot(),auto:game.state.auto,lift:Math.round(game.state.lift||0)};}
  };
}
