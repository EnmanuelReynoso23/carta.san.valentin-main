import {regularBeat,beatAtTime,clamp,positiveMod} from './logic.js';
export const VIDEO_ID='gCS3ow7lSZA';
export class Music {
  constructor(status){
    this.status=status;this.source='youtube';this.volume=.35;this.muted=false;this.bpm=120;this.offset=0;this.player=null;this.ready=false;this.youtubeLoading=null;this.youtubePlaying=false;this.youtubeTime=0;this.youtubeSample=0;this.paused=true;this.ctx=null;this.toneStep=-1;this.origin=0;this.elapsed=0;this.local=null;this.localUrl=null;this.beats=null;this.onset=0;this.energy=0;this.lastEnergy=0;this.colour=0;this.started=false;this.failed=false;
    this.fallbackBeat=0;this.lastUpdate=null;this.lastYTBeat=null;
  }
  async ensureContext(){
    if(!this.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;this.ctx=new AC();this.bus=this.ctx.createGain();this.bus.gain.value=this.volume*.25;this.bus.connect(this.ctx.destination);}
    if(this.ctx.state==='suspended')await this.ctx.resume();
  }
  async connectYoutube(){
    if(this.ready)return;
    if(this.youtubeLoading)return this.youtubeLoading;
    this.status('Conectando con la canción de YouTube…');
    this.youtubeLoading=new Promise((resolve,reject)=>{
      let done=false;
      const fail=()=>{if(done)return;done=true;this.failed=true;this.status('YouTube no está disponible. Puedes elegir «Melodía del juego» o cargar el audio.');reject(new Error('YouTube unavailable'));};
      const timer=setTimeout(fail,16000);
      const create=()=>{
        try{this.player=new YT.Player('youtube',{width:'100%',height:200,videoId:VIDEO_ID,playerVars:{playsinline:1,controls:1,rel:0,loop:1,playlist:VIDEO_ID,origin:location.origin},events:{
          onReady:()=>{done=true;clearTimeout(timer);this.ready=true;this.failed=false;const ph=document.getElementById('videoPlaceholder');if(ph)ph.hidden=true;this.player.setVolume(Math.round(this.volume*100));if(this.muted)this.player.mute();if(this.started&&!this.paused&&this.source==='youtube')this.player.playVideo();this.status('Canción conectada. Si no suena, pulsa ▶ en el reproductor.');resolve();},
          onStateChange:e=>{this.youtubePlaying=e.data===1;this.youtubeTime=this.player.getCurrentTime?.()||0;this.youtubeSample=performance.now();if(e.data===1){this.failed=false;if(this.source!=='youtube')this.player.pauseVideo();else this.status('Tu canción está sonando · pulso ajustable.');}if(e.data===2&&this.source==='youtube'&&!this.paused)this.status('La canción está pausada. Puedes reanudarla en el reproductor.');},
          onError:()=>{clearTimeout(timer);this.failed=true;this.youtubePlaying=false;this.status('Este video no permite reproducirse aquí. Ábrelo en YouTube o elige otra fuente de música.');if(!done){done=true;reject(new Error('YouTube player error'));}},
          onAutoplayBlocked:()=>this.status('Pulsa ▶ en el reproductor para escuchar tu canción.')
        }});}catch{clearTimeout(timer);fail();}
      };
      if(window.YT?.Player)create();else{window.onYouTubeIframeAPIReady=create;let script=document.querySelector('script[data-youtube]');if(!script){script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.dataset.youtube='true';script.onerror=fail;document.head.append(script);}}
    });
    return this.youtubeLoading;
  }
  async start(){this.started=true;this.paused=false;await this.ensureContext();if(this.source==='youtube')this.connectYoutube().catch(()=>{});else if(this.source==='local')this.local?.play().catch(()=>this.status('Pulsa otra vez para activar el audio.'));else this.status('Melodía original del juego · suena mientras dura la historia.');this.applyVolume();this.lastUpdate=performance.now();}
  select(source){
    this.source=source;this.toneStep=-1;
    if(source!=='youtube')try{this.player?.pauseVideo();}catch{}
    if(source!=='local')this.local?.pause();
    if(source==='youtube'){this.connectYoutube().catch(()=>{});if(this.ready&&!this.paused)this.player.playVideo();this.status(this.ready?'Canción de YouTube seleccionada.':'Conectando con tu canción…');}
    if(source==='original'){this.ensureContext();this.status('Melodía original del juego · suena mientras dura la historia.');}
    if(source==='local'){if(!this.paused)this.local?.play().catch(()=>{});this.status('Archivo local · ritmo analizado por fragmentos.');}
    document.getElementById('youtubeSource').classList.toggle('selected',source==='youtube');document.getElementById('youtubeSource').setAttribute('aria-pressed',String(source==='youtube'));
    document.getElementById('originalSource').classList.toggle('selected',source==='original');document.getElementById('originalSource').setAttribute('aria-pressed',String(source==='original'));
    const box=document.querySelector('.video-box');if(box)box.hidden=source!=='youtube';
    const note=document.getElementById('syncNote');if(note)note.textContent=source==='original'?'La melodía del juego dura lo mismo que la canción.':'La historia avanza con el reloj de la canción.';
  }
  pause(){this.paused=true;try{if(this.source==='youtube')this.player?.pauseVideo();}catch{}this.local?.pause();this.bus?.gain.setTargetAtTime(0,this.ctx.currentTime,.08);}
  resume(){this.paused=false;this.lastUpdate=performance.now();this.ensureContext();if(this.source==='youtube'&&this.ready)this.player.playVideo();if(this.source==='local')this.local?.play().catch(()=>{});this.applyVolume();}
  setVolume(v){this.volume=clamp(v,0,1);this.applyVolume();}
  toggleMute(){this.muted=!this.muted;this.applyVolume();return this.muted;}
  applyVolume(){if(this.bus)this.bus.gain.setTargetAtTime(this.muted||this.paused?0:this.volume*.25,this.ctx.currentTime,.05);if(this.local)this.local.volume=this.muted?0:this.volume;try{if(this.ready){this.player.setVolume(this.volume*100);this.muted?this.player.mute():this.player.unMute();}}catch{}}
  tone(midi,duration=.2,level=.12,type='triangle',delay=0){
    if(!this.ctx||this.paused||this.muted)return;const t=this.ctx.currentTime+delay;
    const oscillator=this.ctx.createOscillator(),gain=this.ctx.createGain();oscillator.type=type;oscillator.frequency.value=440*2**((midi-69)/12);gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(level,t+.009);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);oscillator.connect(gain).connect(this.bus);oscillator.start(t);oscillator.stop(t+duration+.03);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }
  chime(lane=0){this.tone([72,76,79][lane],.25,.14,'sine');}
  celebrate(i){[0,4,7,12].forEach((v,j)=>this.tone(60+i+v,.5,.15,'triangle',j*.11));}
  update(now){
    const dt=this.lastUpdate===null?0:Math.min(.1,(now-this.lastUpdate)/1000);this.lastUpdate=now;
    if(!this.paused){this.elapsed+=dt;this.fallbackBeat+=dt*this.bpm/60;}
    if(this.ready&&this.youtubePlaying&&now-this.youtubeSample>.2*1000){try{this.youtubeTime=this.player.getCurrentTime();this.youtubeSample=now;}catch{}}
    if(this.analyser&&this.source==='local'){
      this.analyser.getByteFrequencyData(this.fft);let energy=0;for(let i=1;i<80;i++)energy+=this.fft[i]/255;energy/=79;
      this.energy=energy;const rise=energy-this.lastEnergy;this.lastEnergy=this.lastEnergy*.8+energy*.2;if(rise>.075)this.onset=1;else this.onset=Math.max(0,this.onset-dt*5);
    }
    const beat=this.beat(now), step=Math.floor(beat*2);
    if(this.source==='original'&&!this.paused&&step!==this.toneStep){
      this.toneStep=step;const major=this.colour>=3;
      const melody=major?[72,76,79,83,81,79,76,74,72,67,71,74,76,79,76,74]:[69,72,76,79,77,76,72,71,69,64,67,71,72,76,72,71];
      if(step%2===0)this.tone(melody[positiveMod(Math.floor(step/2),16)],.36,.11,'triangle');
      if(step%8===0)this.tone(major?[48,53,55,48][positiveMod(Math.floor(step/8),4)]:[45,41,43,45][positiveMod(Math.floor(step/8),4)],1.2,.11,'sine');
      if(this.colour>1&&step%2===1)this.tone((major?[60,64,67]:[57,60,64])[positiveMod(step,3)]+12,.11,.028,'square');
    }
    return beat;
  }
  /** Segundos de la canción que llevamos sonando, con la fuente que esté activa. */
  seconds(now=performance.now()){
    if(this.source==='local'&&this.local)return this.local.currentTime;
    if(this.source==='youtube'&&this.youtubePlaying)return this.youtubeTime+(now-this.youtubeSample)/1000;
    return this.elapsed;
  }
  /** Duración real de la canción; si aún no se sabe, la de la pista elegida. */
  duration(){
    try{const d=this.player?.getDuration?.();if(d>5)return d;}catch{}
    if(this.local?.duration>5)return this.local.duration;
    return 191.8;
  }
  beat(now=performance.now()){
    if(this.source==='local'&&this.local)return this.beats?beatAtTime(this.local.currentTime-this.offset,this.beats):regularBeat(this.local.currentTime,this.bpm,this.offset);
    if(this.source==='youtube'&&this.youtubePlaying){const t=this.youtubeTime+(now-this.youtubeSample)/1000;return regularBeat(t,this.bpm,this.offset);}
    return this.fallbackBeat-this.offset*this.bpm/60;
  }
  pulse(){return Math.max(this.source==='local'?this.onset:0,Math.exp(-positiveMod(this.beat(),1)*5));}
  async loadFile(file){
    if(!file)return;this.status('Analizando el ritmo de tu archivo…');
    await this.ensureContext();if(!this.ctx)throw Error('Audio no disponible');
    const bytes=await file.arrayBuffer(),buffer=await this.ctx.decodeAudioData(bytes);
    const beats=analyseBeats(buffer);
    if(this.local){this.local.pause();this.local.removeAttribute('src');}if(this.localUrl)URL.revokeObjectURL(this.localUrl);
    this.localUrl=URL.createObjectURL(file);this.local=new Audio(this.localUrl);this.local.loop=true;this.local.volume=this.muted?0:this.volume;this.beats=beats;
    this.analyser=this.ctx.createAnalyser();this.analyser.fftSize=512;this.fft=new Uint8Array(this.analyser.frequencyBinCount);
    this.localSource=this.ctx.createMediaElementSource(this.local);this.localSource.connect(this.analyser);this.analyser.connect(this.ctx.destination);
    this.select('local');this.status(file.name+' · audio local listo.');return beats.length;
  }
}

export function analyseBeats(buffer){
  const data=buffer.getChannelData(0),sr=buffer.sampleRate,hop=Math.max(1,Math.round(sr/100)),energy=[];
  for(let i=0;i<data.length;i+=hop){let e=0;for(let j=i;j<Math.min(i+hop,data.length);j++)e+=data[j]*data[j];energy.push(Math.sqrt(e/hop));}
  const onset=energy.map((v,i)=>Math.max(0,v-(energy[i-1]||0)));
  const beats=[];let lastTempo=120;
  for(let start=0;start<onset.length;start+=1600){
    const end=Math.min(onset.length,start+1600);let best=0,bestLag=6000/lastTempo;
    for(let lag=35;lag<=85;lag++){let score=0;for(let i=start+lag;i<end;i++)score+=onset[i]*onset[i-lag];if(score>best){best=score;bestLag=lag;}}
    if(best>1e-8)lastTempo=6000/bestLag;
    let phase=0,power=-1;for(let o=0;o<bestLag;o++){let s=0;for(let i=start+o;i<end;i+=bestLag)s+=onset[Math.round(i)]||0;if(s>power){power=s;phase=o;}}
    for(let b=start+phase;b<end;b+=bestLag){const time=b/100;if(!beats.length||time-beats.at(-1)>.25)beats.push(time);}
  }
  return beats.length>1?beats:[0,.5];
}
