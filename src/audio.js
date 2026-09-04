import {clamp,positiveMod,regularBeat} from './logic.js';
export const VIDEO_ID='gCS3ow7lSZA';

/**
 * La música es siempre la canción de YouTube que eligió Génesis. No hay nada
 * que elegir dentro del juego: se conecta sola al empezar. Si el vídeo no
 * puede sonar (sin internet, o el navegador lo bloquea) entra por detrás la
 * melodía del propio juego, sin pedir permiso ni añadir un botón.
 */
export class Music{
  constructor(status){
    this.status=status||(()=>{});
    this.volume=.35;this.muted=false;this.paused=true;this.started=false;
    this.player=null;this.ready=false;this.failed=false;this.youtubeLoading=null;
    this.youtubePlaying=false;this.youtubeTime=0;this.youtubeSample=0;this.startedAt=0;
    this.ctx=null;this.bus=null;this.colour=0;this.toneStep=-1;this.beat=0;this.lastUpdate=null;
  }
  async ensureContext(){
    if(!this.ctx){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      this.ctx=new AC();this.bus=this.ctx.createGain();
      this.bus.gain.value=this.volume*.25;this.bus.connect(this.ctx.destination);
    }
    if(this.ctx.state==='suspended')await this.ctx.resume();
  }
  /** Se llama con el primer toque de la persona: es lo que pide Android. */
  async start(){
    this.started=true;this.paused=false;this.startedAt=performance.now();this.lastUpdate=performance.now();
    await this.ensureContext();
    this.connectYoutube().then(()=>this.play()).catch(()=>{});
    this.applyVolume();
  }
  play(){try{if(this.ready&&!this.paused)this.player.playVideo();}catch{}}
  connectYoutube(){
    if(this.ready)return Promise.resolve();
    if(this.youtubeLoading)return this.youtubeLoading;
    this.status('Conectando con tu canción…');
    this.youtubeLoading=new Promise((resolve,reject)=>{
      let done=false;
      const fail=motivo=>{
        if(done)return;done=true;this.failed=true;
        this.status(motivo||'Sin conexión con YouTube: suena la melodía del juego.');
        reject(new Error('YouTube'));
      };
      const timer=setTimeout(()=>fail(),16000);
      const create=()=>{
        try{
          this.player=new YT.Player('youtube',{width:'100%',height:200,videoId:VIDEO_ID,
            playerVars:{playsinline:1,controls:1,rel:0,loop:1,playlist:VIDEO_ID,origin:location.origin},
            events:{
              onReady:()=>{
                done=true;clearTimeout(timer);this.ready=true;this.failed=false;
                document.getElementById('videoPlaceholder')?.setAttribute('hidden','');
                this.applyVolume();
                if(this.started&&!this.paused)this.player.playVideo();
                this.status('Tu canción está lista. Si no suena, pulsa ▶ en el reproductor.');
                resolve();
              },
              onStateChange:event=>{
                this.youtubePlaying=event.data===1;
                this.youtubeTime=this.player.getCurrentTime?.()||0;this.youtubeSample=performance.now();
                if(event.data===1){this.failed=false;this.status('Suena tu canción.');}
                if(event.data===2&&!this.paused)this.status('La canción está en pausa. Pulsa ▶ para seguir.');
              },
              onError:()=>{this.youtubePlaying=false;fail('Este vídeo no se deja reproducir aquí: suena la melodía del juego.');},
              onAutoplayBlocked:()=>this.status('Pulsa ▶ en el reproductor para escuchar tu canción.')
            }});
        }catch{clearTimeout(timer);fail();}
      };
      if(window.YT?.Player)create();
      else{
        window.onYouTubeIframeAPIReady=create;
        let script=document.querySelector('script[data-youtube]');
        if(!script){
          script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';
          script.dataset.youtube='true';script.onerror=()=>fail();document.head.append(script);
        }
      }
    });
    return this.youtubeLoading;
  }
  /** La melodía de respaldo sólo entra cuando la canción no está sonando. */
  get fallback(){
    return this.started&&!this.paused&&!this.youtubePlaying&&
      (this.failed||performance.now()-this.startedAt>6000);
  }
  pause(){
    this.paused=true;
    try{this.player?.pauseVideo();}catch{}
    this.bus?.gain.setTargetAtTime(0,this.ctx.currentTime,.08);
  }
  resume(){
    this.paused=false;this.lastUpdate=performance.now();
    this.ensureContext();this.play();this.applyVolume();
  }
  setVolume(value){this.volume=clamp(value,0,1);this.applyVolume();}
  toggleMute(){this.muted=!this.muted;this.applyVolume();return this.muted;}
  applyVolume(){
    if(this.bus&&this.ctx)this.bus.gain.setTargetAtTime(this.muted||this.paused?0:this.volume*.25,this.ctx.currentTime,.05);
    try{if(this.ready){this.player.setVolume(Math.round(this.volume*100));this.muted?this.player.mute():this.player.unMute();}}catch{}
  }
  tone(midi,duration=.2,level=.12,type='triangle',delay=0){
    if(!this.ctx||this.paused||this.muted)return;
    const t=this.ctx.currentTime+delay;
    const oscillator=this.ctx.createOscillator(),gain=this.ctx.createGain();
    oscillator.type=type;oscillator.frequency.value=440*2**((midi-69)/12);
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(level,t+.009);
    gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    oscillator.connect(gain).connect(this.bus);oscillator.start(t);oscillator.stop(t+duration+.03);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }
  celebrate(i=0){[0,4,7,12].forEach((v,j)=>this.tone(60+i+v,.5,.15,'triangle',j*.11));}
  update(now){
    const dt=this.lastUpdate===null?0:Math.min(.1,(now-this.lastUpdate)/1000);
    this.lastUpdate=now;
    if(!this.paused)this.beat+=dt*2;
    if(this.ready&&this.youtubePlaying&&now-this.youtubeSample>200){
      try{this.youtubeTime=this.player.getCurrentTime();this.youtubeSample=now;}catch{}
    }
    if(!this.fallback){this.toneStep=-1;return this.beat;}
    const step=Math.floor(this.beat*2);
    if(step!==this.toneStep){
      this.toneStep=step;
      const major=this.colour>=3;
      const melody=major?[72,76,79,83,81,79,76,74,72,67,71,74,76,79,76,74]:[69,72,76,79,77,76,72,71,69,64,67,71,72,76,72,71];
      if(step%2===0)this.tone(melody[positiveMod(Math.floor(step/2),16)],.36,.11,'triangle');
      if(step%8===0)this.tone(major?[48,53,55,48][positiveMod(Math.floor(step/8),4)]:[45,41,43,45][positiveMod(Math.floor(step/8),4)],1.2,.11,'sine');
      if(this.colour>1&&step%2===1)this.tone((major?[60,64,67]:[57,60,64])[positiveMod(step,3)]+12,.11,.028,'square');
    }
    return this.beat;
  }
  /** Segundos de canción sonados, para el compás de la melodía de respaldo. */
  seconds(now=performance.now()){
    if(this.youtubePlaying)return this.youtubeTime+(now-this.youtubeSample)/1000;
    return this.beat/2;
  }
  pulse(){return Math.exp(-positiveMod(regularBeat(this.seconds()),1)*5);}
}
