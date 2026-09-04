import {regularBeat,clamp,positiveMod} from './logic.js';

export const VIDEO_ID='gCS3ow7lSZA';
export const LOCAL_TRACK='assets/una-luz-para-ti.ogg';
export const TRACK_SECONDS=192;

export class Music{
  constructor(status){
    this.status=status;
    this.source='local';
    this.volume=.45;
    this.muted=false;
    this.bpm=100;
    this.offset=0;
    this.player=null;
    this.ready=false;
    this.youtubeLoading=null;
    this.youtubePlaying=false;
    this.youtubeTime=0;
    this.youtubeSample=0;
    this.paused=true;
    this.ctx=null;
    this.bus=null;
    this.toneStep=-1;
    this.elapsed=0;
    this.local=null;
    this.localReady=false;
    this.colour=0;
    this.started=false;
    this.failed=false;
    this.lastUpdate=null;
  }

  async prepare(){
    if(this.local)return this.localReady;
    const testAudio=typeof Audio!=='undefined'?new Audio():null;
    const canPlayOgg=testAudio&&Boolean(testAudio.canPlayType&&testAudio.canPlayType('audio/ogg; codecs="vorbis"').replace(/no/,''));
    const candidates=canPlayOgg?[LOCAL_TRACK,'assets/una-luz-para-ti.mp3']:['assets/una-luz-para-ti.mp3',LOCAL_TRACK];

    let audio=null;
    let ready=false;

    for(const trackPath of candidates){
      audio=new Audio(trackPath);
      audio.preload='auto';
      audio.loop=true;
      audio.volume=this.muted?0:this.volume;
      ready=await new Promise(resolve=>{
        let finished=false;
        const done=val=>{if(finished)return;finished=true;clearTimeout(timer);resolve(val);};
        const timer=setTimeout(()=>done(audio.readyState>=1),4000);
        audio.addEventListener('loadedmetadata',()=>done(true),{once:true});
        audio.addEventListener('canplaythrough',()=>done(true),{once:true});
        audio.addEventListener('error',()=>done(false),{once:true});
        audio.load();
      });
      if(ready){
        this.local=audio;
        break;
      }
    }

    if(!ready&&audio){
      this.local=audio;
    }
    this.localReady=ready;
    if(ready){
      this.status('Banda sonora incluida · lista para comenzar.');
    }else{
      this.source='original';
      this.status('No se encontró la pista incluida. Se usará la melodía de respaldo.');
    }
    this.updateSourceUI();
    return ready;
  }

  async ensureContext(){
    if(!this.ctx){
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return;
      this.ctx=new AC();
      this.bus=this.ctx.createGain();
      this.bus.gain.value=this.volume*.24;
      this.bus.connect(this.ctx.destination);
    }
    if(this.ctx.state==='suspended')await this.ctx.resume();
  }

  async connectYoutube(){
    if(this.ready)return;
    if(this.youtubeLoading)return this.youtubeLoading;
    this.status('Conectando con la canción elegida…');
    this.youtubeLoading=new Promise((resolve,reject)=>{
      let done=false;
      const fail=()=>{
        if(done)return;
        done=true;
        this.failed=true;
        this.youtubePlaying=false;
        this.status('YouTube no está disponible. Volviendo a la banda sonora incluida.');
        this.select(this.localReady?'local':'original');
        reject(new Error('YouTube unavailable'));
      };
      const timer=setTimeout(fail,16000);
      const create=()=>{
        try{
          this.player=new YT.Player('youtube',{
            width:'100%',height:210,videoId:VIDEO_ID,
            playerVars:{playsinline:1,controls:1,rel:0,loop:0,origin:location.origin},
            events:{
              onReady:()=>{
                done=true;clearTimeout(timer);this.ready=true;this.failed=false;
                const placeholder=document.getElementById('videoPlaceholder');
                if(placeholder)placeholder.hidden=true;
                this.player.setVolume(Math.round(this.volume*100));
                if(this.muted)this.player.mute();
                if(this.youtubeTime>0)this.player.seekTo(this.youtubeTime,true);
                if(this.started&&!this.paused&&this.source==='youtube')this.player.playVideo();
                this.status('Canción elegida conectada.');
                resolve();
              },
              onStateChange:event=>{
                this.youtubePlaying=event.data===1;
                this.youtubeTime=this.player.getCurrentTime?.()||0;
                this.youtubeSample=performance.now();
                if(event.data===1){
                  if(this.source!=='youtube')this.player.pauseVideo();
                  else this.status('Canción elegida · la historia sigue su reloj.');
                }
                if(event.data===2&&this.source==='youtube'&&!this.paused){
                  this.status('La canción está pausada; la historia esperará.');
                }
                if(event.data===0&&this.source==='youtube'&&!this.paused){
                  this.youtubeTime=0;
                  this.youtubeSample=performance.now();
                  try{this.player.seekTo(0,true);this.player.playVideo();}catch{}
                }
              },
              onError:fail,
              onAutoplayBlocked:()=>this.status('Pulsa ▶ en el reproductor para continuar la historia.'),
            },
          });
        }catch{clearTimeout(timer);fail();}
      };
      if(window.YT?.Player)create();
      else{
        window.onYouTubeIframeAPIReady=create;
        let script=document.querySelector('script[data-youtube]');
        if(!script){
          script=document.createElement('script');
          script.src='https://www.youtube.com/iframe_api';
          script.dataset.youtube='true';
          script.onerror=fail;
          document.head.append(script);
        }
      }
    });
    return this.youtubeLoading;
  }

  async start(){
    this.started=true;
    this.paused=false;
    this.lastUpdate=performance.now();
    await this.ensureContext();
    if(this.source==='local'&&this.localReady){
      try{
        await this.local.play();
        this.status('Una luz para ti · sonando.');
      }catch{
        this.select('original');
        this.status('El navegador bloqueó el archivo; la música de respaldo continúa automáticamente.');
      }
    }else if(this.source==='youtube'){
      this.connectYoutube().catch(()=>{});
      if(this.ready)try{this.player.playVideo();}catch{}
    }else{
      this.status('Melodía sintetizada de respaldo · sonando.');
    }
    this.applyVolume();
  }

  restart(){
    this.elapsed=0;
    this.toneStep=-1;
    this.youtubeTime=0;
    this.youtubeSample=performance.now();
    if(this.local){
      this.local.pause();
      try{this.local.currentTime=0;}catch{}
    }
    try{this.player?.seekTo?.(0,true);}catch{}
  }

  select(source){
    const current=this.seconds();
    if(source==='local'&&!this.localReady)source='original';
    this.source=source;
    this.toneStep=-1;
    this.elapsed=current;
    if(source!=='youtube')try{this.player?.pauseVideo();}catch{}
    if(source!=='local')this.local?.pause();
    if(source==='local'){
      try{this.local.currentTime=Math.min(current,Math.max(0,(this.local.duration||TRACK_SECONDS)-.1));}catch{}
      if(!this.paused)this.local.play().catch(()=>{});
      this.status('Banda sonora incluida · la historia sigue su reloj.');
    }
    if(source==='youtube'){
      this.youtubeTime=current;
      this.youtubeSample=performance.now();
      try{if(this.ready)this.player.seekTo(current,true);}catch{}
      this.connectYoutube().catch(()=>{});
      if(this.ready&&!this.paused)try{this.player.playVideo();}catch{}
      this.status(this.ready?'Canción elegida · la historia sigue su reloj.':'Conectando con la canción elegida…');
    }
    if(source==='original'){
      this.ensureContext();
      this.status('Melodía sintetizada de respaldo · sonando.');
    }
    this.updateSourceUI();
  }

  updateSourceUI(){
    for(const [id,value] of [['localSource','local'],['youtubeSource','youtube'],['originalSource','original']]){
      const button=document.getElementById(id);
      if(!button)continue;
      button.classList.toggle('selected',this.source===value);
      button.setAttribute('aria-pressed',String(this.source===value));
    }
    const box=document.querySelector('.video-box');
    if(box)box.hidden=this.source!=='youtube';
    const note=document.getElementById('syncNote');
    if(note)note.textContent=this.source==='youtube'?
      'La historia espera si el reproductor se pausa.':
      this.source==='local'?
        'La historia avanza con el reloj exacto de la banda sonora.':
        'La melodía de respaldo conserva la duración completa de la historia.';
  }

  pause(){
    this.paused=true;
    try{this.player?.pauseVideo();}catch{}
    this.local?.pause();
    this.bus?.gain.setTargetAtTime(0,this.ctx.currentTime,.08);
    this.status('Historia y música en pausa.');
  }

  resume(){
    this.paused=false;
    this.lastUpdate=performance.now();
    this.ensureContext();
    if(this.source==='youtube'&&this.ready)try{this.player.playVideo();}catch{}
    if(this.source==='local')this.local?.play().catch(()=>{
      this.select('original');
      this.status('La música de respaldo continúa automáticamente.');
    });
    this.applyVolume();
    this.status(this.source==='local'?'Una luz para ti · sonando.':
      this.source==='youtube'?'Canción elegida · sonando.':'Melodía sintetizada de respaldo · sonando.');
  }

  setVolume(value){this.volume=clamp(value,0,1);this.applyVolume();}
  toggleMute(){this.muted=!this.muted;this.applyVolume();return this.muted;}

  applyVolume(){
    if(this.bus)this.bus.gain.setTargetAtTime(this.muted||this.paused?0:this.volume*.24,this.ctx.currentTime,.05);
    if(this.local)this.local.volume=this.muted?0:this.volume;
    try{
      if(this.ready){
        this.player.setVolume(this.volume*100);
        this.muted?this.player.mute():this.player.unMute();
      }
    }catch{}
  }

  tone(midi,duration=.2,level=.12,type='triangle',delay=0){
    if(!this.ctx||this.paused||this.muted)return;
    const time=this.ctx.currentTime+delay;
    const oscillator=this.ctx.createOscillator();
    const gain=this.ctx.createGain();
    oscillator.type=type;
    oscillator.frequency.value=440*2**((midi-69)/12);
    gain.gain.setValueAtTime(0,time);
    gain.gain.linearRampToValueAtTime(level,time+.009);
    gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    oscillator.connect(gain).connect(this.bus);
    oscillator.start(time);
    oscillator.stop(time+duration+.03);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }

  update(now){
    const dt=this.lastUpdate===null?0:Math.min(.1,(now-this.lastUpdate)/1000);
    this.lastUpdate=now;
    if(!this.paused)this.elapsed+=dt;
    if(this.ready&&this.youtubePlaying&&now-this.youtubeSample>200){
      try{this.youtubeTime=this.player.getCurrentTime();this.youtubeSample=now;}catch{}
    }
    const step=Math.floor(this.beat(now)*2);
    if(this.source==='original'&&!this.paused&&step!==this.toneStep){
      this.toneStep=step;
      const warm=this.colour>=4;
      const melody=warm?[72,76,79,83,81,79,76,74,72,67,71,74,76,79,76,74]:[69,72,76,79,77,76,72,71,69,64,67,71,72,76,72,71];
      if(step%2===0)this.tone(melody[positiveMod(Math.floor(step/2),16)],.36,.1,'triangle');
      if(step%8===0)this.tone((warm?[48,53,55,48]:[45,41,43,45])[positiveMod(Math.floor(step/8),4)],1.2,.1,'sine');
      if(this.colour>2&&step%2===1)this.tone((warm?[60,64,67]:[57,60,64])[positiveMod(step,3)]+12,.11,.026,'square');
    }
  }

  seconds(now=performance.now()){
    if(this.source==='local'&&this.localReady)return this.local.currentTime||0;
    if(this.source==='youtube'){
      return this.youtubePlaying?this.youtubeTime+(now-this.youtubeSample)/1000:this.youtubeTime;
    }
    return this.elapsed;
  }

  duration(){
    if(this.source==='youtube'){
      try{const duration=this.player?.getDuration?.();if(duration>5)return duration;}catch{}
    }
    if(this.source==='local'&&this.local?.duration>5)return this.local.duration;
    return TRACK_SECONDS;
  }

  beat(now=performance.now()){return regularBeat(this.seconds(now),this.bpm,this.offset);}
  pulse(){return Math.exp(-positiveMod(this.beat(),1)*5);}
}

// Se conserva como utilidad probada para analizar una pista local si en el
// futuro se sustituye la banda sonora por otra grabación autorizada.
export function analyseBeats(buffer){
  const data=buffer.getChannelData(0),sampleRate=buffer.sampleRate,hop=Math.max(1,Math.round(sampleRate/100)),energy=[];
  for(let i=0;i<data.length;i+=hop){
    let value=0;
    for(let j=i;j<Math.min(i+hop,data.length);j++)value+=data[j]*data[j];
    energy.push(Math.sqrt(value/hop));
  }
  const onset=energy.map((value,index)=>Math.max(0,value-(energy[index-1]||0)));
  const beats=[];
  let lastTempo=100;
  for(let start=0;start<onset.length;start+=1600){
    const end=Math.min(onset.length,start+1600);
    let best=0,bestLag=6000/lastTempo;
    for(let lag=35;lag<=85;lag++){
      let score=0;
      for(let i=start+lag;i<end;i++)score+=onset[i]*onset[i-lag];
      if(score>best){best=score;bestLag=lag;}
    }
    if(best>1e-8)lastTempo=6000/bestLag;
    let phase=0,power=-1;
    for(let offset=0;offset<bestLag;offset++){
      let score=0;
      for(let i=start+offset;i<end;i+=bestLag)score+=onset[Math.round(i)]||0;
      if(score>power){power=score;phase=offset;}
    }
    for(let beat=start+phase;beat<end;beat+=bestLag){
      const time=beat/100;
      if(!beats.length||time-beats.at(-1)>.25)beats.push(time);
    }
  }
  return beats.length>1?beats:[0,.6];
}
