import {writeFileSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const sampleRate=22050;
const duration=192;
const bpm=100;
const beat=60/bpm;
const samples=new Float32Array(sampleRate*duration);
const output=resolve('assets/una-luz-para-ti.ogg');
const temporary=join(tmpdir(),'genesis-una-luz-para-ti.wav');
const midi=note=>440*2**((note-69)/12);

function oscillator(type,phase){
  const sine=Math.sin(phase);
  if(type==='triangle')return 2/Math.PI*Math.asin(sine);
  if(type==='softSquare')return Math.tanh(sine*2.4);
  return sine;
}

function note(start,durationSeconds,pitch,amplitude,type='sine',attack=.035,release=.24){
  const first=Math.max(0,Math.floor(start*sampleRate));
  const last=Math.min(samples.length,Math.ceil((start+durationSeconds)*sampleRate));
  const frequency=midi(pitch);
  for(let index=first;index<last;index++){
    const time=index/sampleRate-start;
    const tail=start+durationSeconds-index/sampleRate;
    const envelope=Math.min(1,time/attack,tail/release);
    const phase=Math.PI*2*frequency*time;
    const voice=oscillator(type,phase)+oscillator('sine',phase*2.001)*.12;
    samples[index]+=voice*amplitude*Math.max(0,envelope);
  }
}

function bell(start,pitch,amplitude=.055){
  const length=1.15;
  const first=Math.floor(start*sampleRate);
  const last=Math.min(samples.length,Math.ceil((start+length)*sampleRate));
  const frequency=midi(pitch);
  for(let index=first;index<last;index++){
    const time=index/sampleRate-start;
    const envelope=Math.exp(-time*3.35)*(1-Math.exp(-time*80));
    const phase=Math.PI*2*frequency*time;
    const voice=Math.sin(phase)+Math.sin(phase*2.01)*.42+Math.sin(phase*3.98)*.16;
    samples[index]+=voice*amplitude*envelope;
  }
}

function kick(start,amplitude=.08){
  const length=.24;
  const first=Math.floor(start*sampleRate);
  const last=Math.min(samples.length,Math.ceil((start+length)*sampleRate));
  for(let index=first;index<last;index++){
    const time=index/sampleRate-start;
    const phase=Math.PI*2*(70*time-36*time*time);
    samples[index]+=Math.sin(phase)*Math.exp(-time*17)*amplitude;
  }
}

function hat(start,amplitude=.018){
  const length=.08;
  const first=Math.floor(start*sampleRate);
  const last=Math.min(samples.length,Math.ceil((start+length)*sampleRate));
  let noise=7919+Math.floor(start*1000);
  for(let index=first;index<last;index++){
    noise=(noise*16807)%2147483647;
    const value=(noise/2147483647)*2-1;
    const time=index/sampleRate-start;
    samples[index]+=value*Math.exp(-time*48)*amplitude;
  }
}

const progressions=[
  [45,48,52,57],
  [41,45,48,53],
  [43,47,50,55],
  [40,43,47,52],
  [48,52,55,60],
  [43,47,50,55],
  [45,48,52,57],
  [48,52,55,60],
];
const motifs=[
  [0,3,7,10,7,3,5,7],
  [0,5,7,12,10,7,5,3],
  [0,3,7,12,7,10,7,5],
  [0,4,7,11,12,11,7,4],
];

for(let bar=0;bar<80;bar++){
  const start=bar*beat*4;
  const section=Math.min(6,Math.floor(bar/12));
  const chord=progressions[(bar+Math.floor(section/2))%progressions.length];
  const warmth=section>=4;
  const strength=.018+section*.0024;

  for(const pitch of chord.slice(0,3)){
    note(start,beat*4,pitch,strength,'sine',.32,.7);
    note(start,beat*4,pitch+12,strength*.34,'triangle',.4,.8);
  }

  note(start,beat*1.5,chord[0]-12,.04+(section*.002),'sine',.03,.34);
  note(start+beat*2,beat*1.5,(bar%2?chord[2]:chord[0])-12,.034,'sine',.03,.34);

  const motif=motifs[(bar>>2)%motifs.length];
  const subdivision=section<2?1:2;
  for(let step=0;step<4*subdivision;step++){
    if(section===0&&step%2)continue;
    const when=start+step*(beat/subdivision);
    const degree=motif[(step+bar)%motif.length];
    note(when,beat*(section<2?.62:.34),chord[0]+24+degree,.023+section*.003,'triangle',.012,.13);
    if(section>=2&&step%2===0)bell(when,chord[0]+24+degree,.018+section*.002);
  }

  if(section>=1){
    for(let pulse=0;pulse<4;pulse++){
      kick(start+pulse*beat,section>=5?.062:.043);
      if(section>=3)hat(start+(pulse+.5)*beat,.012+section*.0015);
    }
  }

  if(bar%8===7){
    const lift=warmth?[0,4,7,12]:[0,3,7,12];
    lift.forEach((degree,index)=>bell(start+beat*(2.35+index*.32),chord[0]+24+degree,.035+section*.003));
  }
}

// Una melodía humana aparece en la segunda mitad y vuelve, más abierta, al amanecer.
const melody=[0,3,7,5,3,0,5,7,10,7,5,3,0,-2,0,3];
for(let bar=32;bar<80;bar++){
  if(bar%4===3)continue;
  const root=progressions[(bar+Math.floor(Math.min(6,Math.floor(bar/12))/2))%progressions.length][0];
  for(let step=0;step<8;step++){
    const pitch=root+24+melody[(bar*3+step)%melody.length]+(bar>=68?12:0);
    bell(bar*beat*4+step*beat/2,pitch,bar>=68?.038:.027);
  }
}

// Respiración inicial y despedida limpia.
for(let index=0;index<samples.length;index++){
  const time=index/sampleRate;
  const fadeIn=Math.min(1,time/3.5);
  const fadeOut=Math.min(1,(duration-time)/7);
  samples[index]*=Math.max(0,Math.min(fadeIn,fadeOut));
}
let peak=0;
for(const sample of samples)peak=Math.max(peak,Math.abs(sample));
const gain=.82/Math.max(.82,peak);

const wave=Buffer.alloc(44+samples.length*2);
wave.write('RIFF',0);
wave.writeUInt32LE(36+samples.length*2,4);
wave.write('WAVE',8);
wave.write('fmt ',12);
wave.writeUInt32LE(16,16);
wave.writeUInt16LE(1,20);
wave.writeUInt16LE(1,22);
wave.writeUInt32LE(sampleRate,24);
wave.writeUInt32LE(sampleRate*2,28);
wave.writeUInt16LE(2,32);
wave.writeUInt16LE(16,34);
wave.write('data',36);
wave.writeUInt32LE(samples.length*2,40);
for(let index=0;index<samples.length;index++){
  const value=Math.max(-1,Math.min(1,samples[index]*gain));
  wave.writeInt16LE(Math.round(value*32767),44+index*2);
}
writeFileSync(temporary,wave);

const encoded=spawnSync('ffmpeg',[
  '-hide_banner','-loglevel','error','-y','-i',temporary,
  '-c:a','libvorbis','-q:a','5','-metadata','title=Una luz para ti',
  '-metadata','artist=La odisea de Genesis',output,
],{stdio:'inherit'});
unlinkSync(temporary);
if(encoded.status!==0)process.exit(encoded.status||1);
console.log(output);
