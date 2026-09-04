// Dibuja los iconos de la aplicación (la estrella dorada sobre la noche) sin
// depender de nada: escribe los PNG a mano. `node tools/icons.mjs`.
import {deflateSync} from 'node:zlib';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const SIZE=64;
const table=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc=buffer=>{let c=0xffffffff;for(const byte of buffer)c=table[(c^byte)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
function chunk(type,data){
  const out=Buffer.alloc(data.length+12);
  out.writeUInt32BE(data.length,0);out.write(type,4,'ascii');data.copy(out,8);
  out.writeUInt32BE(crc(Buffer.concat([Buffer.from(type,'ascii'),data])),data.length+8);
  return out;
}
function png(width,height,rgba){
  const raw=Buffer.alloc(height*(width*4+1));
  for(let y=0;y<height;y++){raw[y*(width*4+1)]=0;rgba.copy(raw,y*(width*4+1)+1,y*width*4,(y+1)*width*4);}
  const head=Buffer.alloc(13);
  head.writeUInt32BE(width,0);head.writeUInt32BE(height,4);head[8]=8;head[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',head),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
/** La estrella de cuatro puntas, la misma que acompaña a Génesis todo el viaje. */
function scene(){
  const pixels=Buffer.alloc(SIZE*SIZE*4);
  const set=(x,y,[r,g,b],a=255)=>{const i=(y*SIZE+x)*4;pixels[i]=r;pixels[i+1]=g;pixels[i+2]=b;pixels[i+3]=a;};
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    const t=Math.hypot(x-SIZE/2,y-SIZE*.42)/SIZE;
    set(x,y,[Math.round(20+30*(1-t)),Math.round(28+34*(1-t)),Math.round(54+42*(1-t))]);
  }
  for(const [sx,sy] of [[10,12],[52,9],[18,50],[47,46],[31,7],[7,32],[57,28]])set(sx,sy,[242,220,209]);
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    const dx=Math.abs(x+.5-SIZE/2),dy=Math.abs(y+.5-SIZE*.44);
    const star=Math.sqrt(dx)+Math.sqrt(dy);
    if(star<=Math.sqrt(21))set(x,y,star<=Math.sqrt(12)?[255,241,208]:[245,191,105]);
    else if(star<=Math.sqrt(30)){
      const i=(y*SIZE+x)*4,mix=(star-Math.sqrt(21))/(Math.sqrt(30)-Math.sqrt(21));
      set(x,y,[Math.round(245*(1-mix)+pixels[i]*mix),Math.round(191*(1-mix)+pixels[i+1]*mix),Math.round(105*(1-mix)+pixels[i+2]*mix)]);
    }
  }
  // El suelo de la ciudad, para que se lea como un lugar y no como un símbolo.
  for(let y=SIZE-13;y<SIZE;y++)for(let x=0;x<SIZE;x++)set(x,y,y<SIZE-11?[143,108,116]:[94,68,85]);
  for(const [bx,bw,bh] of [[4,9,14],[15,7,9],[24,10,17],[36,8,11],[46,12,15],[59,5,8]])
    for(let y=SIZE-13-bh;y<SIZE-13;y++)for(let x=bx;x<Math.min(SIZE,bx+bw);x++)set(x,y,[38,56,82]);
  for(const [wx,wy] of [[6,54],[18,58],[27,50],[39,56],[49,52],[60,57]])if(wy<SIZE)set(wx,wy-8,[232,196,143]);
  return pixels;
}
function scale(pixels,factor){
  const size=SIZE*factor,out=Buffer.alloc(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const from=((y/factor|0)*SIZE+(x/factor|0))*4,to=(y*size+x)*4;
    pixels.copy(out,to,from,from+4);
  }
  return png(size,size,out);
}
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const art=scene();
for(const factor of [3,8]){
  const size=SIZE*factor;
  writeFileSync(path.join(root,'assets',`icon-${size}.png`),scale(art,factor));
  console.log('assets/icon-'+size+'.png');
}
