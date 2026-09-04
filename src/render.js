import {clamp, lerp, smooth} from './timeline.js';

export const W=480;
export const H=270;
export const GROUND=224;
export const LIFT_MAX=90;
export const DAWN=[.02,.08,.15,.28,.42,.6,.98];
const VIRTUE_COLORS=['#62df7d','#ffd84a','#ff9a45','#b187ff','#5f7dff','#79e4ee','#ff5c70'];

const seeded=(seed=7)=>()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
const positiveMod=(n,d)=>((n%d)+d)%d;
const hexMix=(a,b,t)=>{
  const aa=parseInt(a.slice(1),16),bb=parseInt(b.slice(1),16);
  return '#'+[16,8,0].map(shift=>Math.round(((aa>>shift)&255)*(1-t)+((bb>>shift)&255)*t).toString(16).padStart(2,'0')).join('');
};

// Conversión de color para recolorear a los invitados sin tocarles la piel.
function rgbToHsl(r,g,b){
  r/=255;g/=255;b/=255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2;
  if(max===min)return [0,0,l];
  const d=max-min,s=l>.5?d/(2-max-min):d/(max+min);
  const h=max===r?((g-b)/d+(g<b?6:0)):max===g?((b-r)/d+2):((r-g)/d+4);
  return [h/6,s,l];
}
function hslToRgb(h,s,l){
  if(s===0){const v=Math.round(l*255);return [v,v,v];}
  const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;
  const canal=t=>{
    t=positiveMod(t,1);
    if(t<1/6)return p+(q-p)*6*t;
    if(t<1/2)return q;
    if(t<2/3)return p+(q-p)*(2/3-t)*6;
    return p;
  };
  return [Math.round(canal(h+1/3)*255),Math.round(canal(h)*255),Math.round(canal(h-1/3)*255)];
}

/**
 * Los seis invitados. Salían de una tira de recortes que son variantes del
 * mismo diseño que Génesis y Enmanuel: cambiaba la ropa, pero la cara, el pelo
 * y la estatura eran iguales, y parecían todos ellos dos. Aquí cada uno recibe
 * su propio giro de tono en la ropa y el pelo, un matiz de piel distinto y una
 * estatura propia, que a este tamaño es lo que más distingue a una persona.
 */
const GUESTS=[
  {id:'simon',cuerpo:'enmanuel',tela:.075,fuerza:.30,ropa:-.10,viveza:1.10,luz:.94,
   piel:-.014,pelo:{h:-.006,s:.90,l:.80,sube:.02},alto:1.05},
  {id:'nora',cuerpo:'genesis',tela:.515,fuerza:.34,ropa:.34,viveza:1.10,luz:1.04,
   piel:.016,pelo:{h:.010,s:1.30,l:1.20,sube:.12},alto:.92},
  {id:'lia',cuerpo:'genesis',tela:.130,fuerza:.40,ropa:-.30,viveza:1.20,luz:1.10,
   piel:.030,pelo:{h:.022,s:1.05,l:1.40,sube:.30},alto:.83},
  {id:'mateo',cuerpo:'enmanuel',tela:.615,fuerza:.34,ropa:.52,viveza:.90,luz:.90,
   piel:-.024,pelo:{h:0,s:.55,l:.55,sube:0},alto:1.12},
  {id:'abril',cuerpo:'genesis',tela:.925,fuerza:.36,ropa:.16,viveza:1.28,luz:1.02,
   piel:.008,pelo:{h:-.020,s:1.60,l:1.10,sube:.09},alto:.88},
  {id:'joel',cuerpo:'enmanuel',tela:.330,fuerza:.30,ropa:.68,viveza:.92,luz:.97,
   piel:-.006,pelo:{h:.006,s:.45,l:.90,sube:.05},alto:1.02},
];
export const GUEST_NAMES=['Simón','Nora','Lía','Mateo','Abril','Joel'];

export class Renderer{
  constructor(canvas){
    this.canvas=canvas;
    this.g=canvas.getContext('2d',{alpha:false});
    this.g.imageSmoothingEnabled=false;
    this.images={};
    this.meta={};
    this.atlas={};
    this.tints={};
    this.t=0;
    this.soft=false;
    this.pulse=0;
    const stars=seeded(2408);
    this.stars=Array.from({length:125},(_,index)=>({
      x:stars()*W,
      y:stars()*154,
      size:index%13===0?2:1,
      phase:stars()*Math.PI*2,
      depth:.015+stars()*.06,
    }));
  }

  async load(){
    const [characters,atlas]=await Promise.all([
      fetch('assets/characters.json').then(response=>{
        if(!response.ok)throw Error('No se pudo cargar characters.json');
        return response.json();
      }),
      fetch('assets/atlas.json').then(response=>{
        if(!response.ok)throw Error('No se pudo cargar atlas.json');
        return response.json();
      }),
    ]);
    this.meta=characters;
    this.atlas=atlas;
    await Promise.all(['genesis','enmanuel','atlas'].map(name=>new Promise((resolve,reject)=>{
      const image=new Image();
      image.onload=()=>{this.images[name]=image;resolve();};
      image.onerror=()=>reject(Error('No se pudo cargar '+name));
      image.src='assets/'+name+'.png';
    })));
  }

  r(x,y,width,height,color){
    this.g.fillStyle=color;
    this.g.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(width)),Math.max(1,Math.round(height)));
  }

  line(points,color,width=1){
    const g=this.g;
    g.strokeStyle=color;
    g.lineWidth=width;
    g.beginPath();
    points.forEach(([x,y],index)=>index?g.lineTo(Math.round(x),Math.round(y)):g.moveTo(Math.round(x),Math.round(y)));
    g.stroke();
  }

  glow(x,y,radius,color,power=.25){
    const g=this.g;
    const gradient=g.createRadialGradient(x,y,0,x,y,radius);
    gradient.addColorStop(0,color);
    gradient.addColorStop(1,color+'00');
    g.save();
    g.globalAlpha=power;
    g.fillStyle=gradient;
    g.fillRect(x-radius,y-radius,radius*2,radius*2);
    g.restore();
  }

  /**
   * Recolorea un recorte de cualquier hoja y lo guarda. Va píxel a píxel a
   * propósito: un filtro de tono sobre el recorte entero también gira la piel
   * y deja las caras verdes. Lo cálido se reconoce como piel o pelo y no gira
   * de color; sólo la ropa gira.
   */
  recolor(key,image,sx,sy,sw,sh,look){
    const cacheKey=key+'|'+look.id;
    if(this.tints[cacheKey])return this.tints[cacheKey];
    const canvas=document.createElement('canvas');
    canvas.width=sw;canvas.height=sh;
    const c=canvas.getContext('2d',{willReadFrequently:true});
    c.imageSmoothingEnabled=false;
    c.drawImage(image,sx,sy,sw,sh,0,0,sw,sh);
    const imagen=c.getImageData(0,0,sw,sh),d=imagen.data;
    const cabeza=sh*.30;
    for(let i=0;i<d.length;i+=4){
      if(d[i+3]<8)continue;
      const y=((i/4)/sw)|0;
      const [h,sat,luz]=rgbToHsl(d[i],d[i+1],d[i+2]);
      const calido=h<.13||h>.92;
      // En la cabeza sólo hay cara y pelo; de los hombros para abajo, piel de
      // las manos y ropa. Nada cálido gira de color: girarlo entero es lo que
      // dejaba las caras verdes.
      const esCara=calido&&sat>.10&&sat<.72&&luz>.40;
      const esPelo=y<cabeza&&!esCara&&luz<.55;
      const esMano=!esPelo&&calido&&sat>.15&&luz>.35;
      let nh,ns,nl;
      if(esCara||esMano){
        nh=positiveMod(h+look.piel,1);ns=sat;nl=luz;
      }else if(esPelo){
        nh=positiveMod(h+look.pelo.h,1);
        ns=clamp(sat*look.pelo.s,0,1);
        nl=clamp(luz*look.pelo.l+look.pelo.sube,0,.92);
      }else if(sat>=.18){
        // Ropa que ya tiene color: se le gira el tono.
        nh=positiveMod(h+look.ropa,1);
        ns=clamp(sat*look.viveza,0,1);
        nl=clamp(luz*look.luz,0,1);
      }else if(luz>.16&&luz<.93){
        // Ropa blanca o gris: girarle el tono no hace nada, hay que teñirla.
        // Aquí es donde estaba el problema: los seis vestían igual.
        nh=look.tela;
        ns=clamp(look.fuerza*(1-Math.abs(luz-.5)*.7),0,1);
        nl=clamp(luz*look.luz,0,1);
      }else{
        // Contornos y brillos se dejan en paz: sostienen el dibujo.
        nh=h;ns=sat;nl=luz;
      }
      const [r,g,b]=hslToRgb(nh,ns,nl);
      d[i]=r;d[i+1]=g;d[i+2]=b;
    }
    c.putImageData(imagen,0,0);
    this.tints[cacheKey]=canvas;
    return canvas;
  }

  /**
   * Un invitado. Los recortes pequeños del atlas medían 15-20 x 42 px y había
   * que ampliarlos para llegar a los 50 de alto: no tenían detalle que dar, y
   * al lado de Génesis se veían borrosos. Estas hojas miden 169 x 319 y se
   * reducen, que es de donde sale la nitidez. Para que seis copias del mismo
   * cuerpo no parezcan la misma persona, cada uno lleva su hoja (tres de ella,
   * tres de él), su pelo, su ropa y su estatura.
   */
  guest(index,x,base,{frame=0,dir=1,alpha=1,height=50}={}){
    const look=GUESTS[index]||GUESTS[0];
    const frames=this.meta[look.cuerpo];
    if(!frames)return;
    const f=frames[frame]||frames[0];
    const lienzo=this.recolor(look.cuerpo+':'+frame,this.images[look.cuerpo],f.x,f.y,f.w,f.h,look);
    if(!lienzo)return;
    const alto=Math.round(height*look.alto),escala=alto/f.h;
    const g=this.g;
    g.save();
    g.globalAlpha=alpha;
    g.translate(Math.round(x),Math.round(base));
    if(dir<0)g.scale(-1,1);
    g.imageSmoothingEnabled=true;
    g.imageSmoothingQuality='high';
    g.drawImage(lienzo,0,0,f.w,f.h,
      Math.round(-f.pivotX*escala),-alto,Math.round(f.w*escala),alto);
    g.restore();
  }

  sp(name,x,y,height,alpha=1,dir=1){
    const frame=this.atlas[name];
    if(!frame)return;
    const fuente=this.images.atlas,recorte=frame;
    const scale=height/frame[3];
    const g=this.g;
    g.save();
    g.globalAlpha=alpha;
    if(dir===-1){
      g.translate(Math.round(x),0);
      g.scale(-1,1);
      g.drawImage(
        fuente,
        ...recorte,
        Math.round(-frame[2]*scale/2),
        Math.round(y-height),
        Math.round(frame[2]*scale),
        Math.round(height),
      );
    }else{
      g.drawImage(
        fuente,
        ...recorte,
        Math.round(x-frame[2]*scale/2),
        Math.round(y-height),
        Math.round(frame[2]*scale),
        Math.round(height),
      );
    }
    g.restore();
  }

  actor(name,x,y,{walk=false,run=false,cheer=false,jump=false,dir=1,phase=0,alpha=1,scale=1}={}){
    const frames=this.meta[name];
    if(!frames)return;
    let frameIndex=0;
    if(cheer){
      frameIndex=14; // Pose de festejo con brazos arriba y sonrisa
    }else if(jump){
      frameIndex=13; // Salto en el aire
    }else if(run){
      // Ciclo de correr: frames 8, 9, 10, 11
      frameIndex=[8,9,10,11][Math.floor(positiveMod(phase,4))];
    }else if(walk){
      // Ciclo de caminar: la hoja no viene en orden. Medida la separación de
      // los pies, las poses abiertas son la 5 y la 7 y las cerradas la 6 y la
      // 4; alternándolas el paso se lee. En el orden de la hoja (4,5,6,7) los
      // pies parecían quedarse siempre en el mismo sitio.
      frameIndex=[5,6,7,4][Math.floor(positiveMod(phase,4))];
    }else{
      // Idle orgánico: parpadeo y guiño suave (0, 1, 2, 3)
      const blink=positiveMod(this.t+name.length*.37,5.2)<.22;
      frameIndex=blink?(positiveMod(this.t,8)<4?2:3):0;
    }

    const frame=frames[frameIndex]||frames[0];
    const size=.175*scale;
    const g=this.g;
    g.save();
    g.globalAlpha=alpha;
    g.translate(Math.round(x),Math.round(y));
    if(dir<0)g.scale(-1,1);
    const breathe=this.soft?0
      :run?Math.sin(phase*Math.PI)*.7
      :walk?Math.cos(positiveMod(phase,4)*Math.PI)*.95
      :Math.sin(this.t*2)*.45;
    // Suavizado HD de alta calidad para personajes nítidos y profesionales
    g.imageSmoothingEnabled=true;
    g.imageSmoothingQuality='high';
    g.drawImage(
      this.images[name],
      frame.x,frame.y,frame.w,frame.h,
      Math.round(-frame.pivotX*size),
      Math.round(-frame.pivotY*size+breathe),
      Math.round(frame.w*size),
      Math.round(frame.h*size),
    );
    g.imageSmoothingEnabled=false;
    g.restore();
  }

  light(x,y,color,size=1,power=.82){
    this.glow(x,y,25*size,color,power+this.pulse*.12);
    this.sp('brillo1',x,y+8,15*size,.9);
    if(!this.soft){
      const orbit=this.t*1.4+x*.02;
      this.r(x+Math.cos(orbit)*9*size,y+Math.sin(orbit)*7*size,1,1,color);
    }
  }

  star(x,y,color='#ffd88a',size=1.35){
    const g=this.g;
    const pulse=1+.18*Math.sin(this.t*6);
    const rad=17*size*pulse;
    this.glow(x,y,rad*2.4,color,.58);
    this.glow(x,y,rad*.9,'#ffffff',.7);

    g.save();
    g.translate(Math.round(x),Math.round(y));
    const rot=Math.sin(this.t*2)*.18;
    g.rotate(rot);

    // 4 rayos principales dorados de la estrella guía (✦)
    const len=Math.round(10*size*pulse);
    const thick=Math.max(1,Math.round(2.2*size));
    g.fillStyle=color;
    g.beginPath();
    g.moveTo(0,-len);
    g.lineTo(thick,0);
    g.lineTo(0,len);
    g.lineTo(-thick,0);
    g.closePath();
    g.fill();

    g.beginPath();
    g.moveTo(-len,0);
    g.lineTo(0,thick);
    g.lineTo(len,0);
    g.lineTo(0,-thick);
    g.closePath();
    g.fill();

    // 4 rayos diagonales menores
    const sub=Math.round(len*.5);
    g.fillStyle='#fff3c6';
    g.beginPath();
    g.moveTo(0,-sub);g.lineTo(sub,0);g.lineTo(0,sub);g.lineTo(-sub,0);
    g.closePath();
    g.fill();

    // Núcleo brillante blanco
    g.fillStyle='#ffffff';
    g.fillRect(-1,-1,3,3);
    g.restore();

    // Estela de chispitas mágicas orbitando
    if(!this.soft){
      for(let i=0;i<4;i++){
        const orbit=this.t*3.2+i*(Math.PI/2);
        const ox=x+Math.cos(orbit)*8*size;
        const oy=y+Math.sin(orbit)*6*size;
        this.r(ox,oy,1,1,i%2?'#ffffff':'#ffe89c');
      }
    }
  }

  sky(dawn,cam){
    const g=this.g;
    const gradient=g.createLinearGradient(0,0,0,H);
    gradient.addColorStop(0,hexMix('#08142f','#6f5e92',dawn));
    gradient.addColorStop(.58,hexMix('#243b65','#e69a88',dawn));
    gradient.addColorStop(1,hexMix('#485a75','#ffd6a2',dawn));
    g.fillStyle=gradient;
    g.fillRect(0,0,W,H+LIFT_MAX);

    const night=clamp(1-dawn*1.08,0,1);
    for(const star of this.stars){
      g.globalAlpha=night*(.35+Math.sin(this.t*.65+star.phase)*.3);
      this.r(positiveMod(star.x-cam*star.depth,W),star.y,star.size,star.size,'#fff0d2');
    }
    g.globalAlpha=1;

    if(dawn<.66){
      const moonX=390-cam*.018,moonY=47;
      this.glow(moonX,moonY,48,'#f4e4bf',.18);
      g.fillStyle='#efe4c8';
      g.beginPath();g.arc(moonX,moonY,10,0,Math.PI*2);g.fill();
      g.fillStyle=hexMix('#0b1733','#75658f',dawn);
      g.beginPath();g.arc(moonX-5,moonY-3,9,0,Math.PI*2);g.fill();
    }else{
      const sunX=376-cam*.015,sunY=64-dawn*13;
      this.glow(sunX,sunY,65,'#ffe0a2',.36);
      g.fillStyle='#ffdda0';g.beginPath();g.arc(sunX,sunY,11,0,Math.PI*2);g.fill();
    }

    this.sp('nube0',positiveMod(75-cam*.045+this.t*.65,W+190)-65,61,23,.24+dawn*.32);
    this.sp('nube1',positiveMod(310-cam*.03+this.t*.4,W+220)-80,42,18,.2+dawn*.35);

    if(!this.soft){
      const shooting=positiveMod(this.t,17);
      if(shooting<1.2&&night>.35){
        const x=330-shooting*72,y=30+shooting*27;
        this.line([[x,y],[x+17,y-7]],'#fff0ceaa',1);
        this.r(x,y,2,1,'#fff8e8');
      }
    }
  }

  hills(cam,dawn){
    const back=hexMix('#1b2c4a','#8b7184',dawn);
    const front=hexMix('#253853','#8c7480',dawn);
    const g=this.g;
    g.fillStyle=back;
    g.beginPath();g.moveTo(0,178);
    for(let x=0;x<=W;x+=48)g.lineTo(x,143+Math.sin((x+cam*.08)*.025)*15);
    g.lineTo(W,205);g.lineTo(0,205);g.fill();
    g.fillStyle=front;
    g.beginPath();g.moveTo(0,190);
    for(let x=0;x<=W;x+=36)g.lineTo(x,170+Math.sin((x+cam*.16)*.033)*11);
    g.lineTo(W,210);g.lineTo(0,210);g.fill();
  }

  skyline(cam,dawn){
    for(let layer=0;layer<2;layer++){
      const rng=seeded(912+layer*25);
      let x=-150;
      while(x<2400){
        const width=24+rng()*45,height=27+rng()*75,sx=x-cam*(layer===0?.13:.28),y=176+layer*12;
        this.r(sx,y-height,width,height,hexMix(layer?'#243f59':'#263852',layer?'#7c6f8e':'#94879f',dawn));
        if(layer){
          for(let wx=4;wx<width-3;wx+=8){
            for(let wy=6;wy<height-7;wy+=12){
              if(rng()>.4)this.r(sx+wx,y-height+wy,2,3,rng()>.5?'#cbab87':'#7a91a2');
            }
          }
        }
        this.r(sx+5,y-height-4,width-10,4,hexMix('#2c415a','#7f7192',dawn));
        x+=width+5;
      }
    }
  }

  cityBuildings(scene,cam,dawn){
    const rng=seeded(scene.kind==='dawn'?33:41);
    for(let x=-120;x<scene.width+200;x+=112){
      const height=62+rng()*42,sx=x-cam*.72;
      this.r(sx,204-height,84,height,['#5c536b','#46566d','#625970'][Math.floor(rng()*3)]);
      this.r(sx-4,197-height,92,7,'#262c46');
      for(let row=0;row<Math.floor((height-14)/28);row++){
        for(let col=0;col<3;col++){
          const wx=sx+10+col*24,wy=204-height+15+row*28,lit=rng()>.35;
          this.r(wx-2,wy-2,16,20,'#303851');
          this.r(wx,wy,12,15,lit?'#d3ac82':'#45566e');
          this.r(wx+5,wy,2,15,'#7c6e78');
          this.r(wx,wy+7,12,2,'#7c6e78');
          if(lit)this.glow(wx+6,wy+7,15,'#eac18d',.08);
        }
      }
    }
  }

  ground(scene,cam,dawn){
    const garden=scene.kind==='garden';
    const room=scene.kind==='room';
    const color=room?'#5e4455':garden?'#2b4a48':hexMix('#3b4861','#b3907f',dawn);
    this.r(0,GROUND,W,H-GROUND+LIFT_MAX,color);
    this.r(0,GROUND,W,2,room?'#8f6c74':garden?'#81a592':hexMix('#a5a0a5','#eec6a6',dawn));
    this.r(0,GROUND+3,W,5,room?'#6d4f5f':garden?'#3f6b63':hexMix('#626c80','#997b8c',dawn));
    if(room){
      for(let x=-positiveMod(cam,44);x<W;x+=44)this.r(x,GROUND+8,1,H-GROUND,'#4a3646');
    }else{
      for(let index=0;index<44;index++){
        const x=positiveMod(index*61.3-cam,scene.width);
        this.r(x,GROUND+9+(index%4)*7,2+(index%3),1,garden?'#659680':hexMix('#8f8b98','#c9a58f',dawn));
      }
    }
  }

  window(x,y){
    const w=132,h=104,g=this.g;
    this.r(x-8,y-8,w+16,h+16,'#c39a95');
    this.r(x-4,y-4,w+8,h+8,'#a97f81');
    this.r(x,y,w,h,'#142642');
    this.r(x+3,y+3,w-6,h-6,'#28405f');
    for(let i=0;i<7;i++)this.r(x+9+i*18,y+h-14-((i*11)%34),9,((i*11)%34)+12,'#33507a');
    for(let i=0;i<9;i++)this.r(x+12+i*14,y+h-26-((i*7)%22),3,4,'#e8c48f');
    this.glow(x+w-30,y+26,26,'#dfe6d8',.35);
    g.fillStyle='#e8e2c8';g.beginPath();g.arc(x+w-30,y+26,7,0,Math.PI*2);g.fill();
    g.fillStyle='#2b4468';g.beginPath();g.arc(x+w-34,y+23,6,0,Math.PI*2);g.fill();
    this.r(x+w/2-3,y,6,h,'#c8a09a');this.r(x,y+h/2-3,w,6,'#c8a09a');
    this.r(x-14,y+h,w+28,7,'#d7ada0');this.r(x-14,y+h+7,w+28,3,'#a97f81');
    for(const side of [-1,1]){
      const cx=side<0?x-26:x+w+8;
      this.r(cx,y-10,18,h+16,'#8d6690');
      for(let i=0;i<4;i++)this.r(cx+2+i*4,y-6,2,h+8,'#a97fab');
    }
    this.r(x-34,y-16,w+68,7,'#b58f8f');
    this.glow(x+w/2,y+h/2,90,'#8fb8d8',.09);
  }

  chair(x,y,facing=1,tone='#8a6272'){
    this.r(x-9,y-16,18,3,tone);
    this.r(x-8,y-14,16,2,'#6d4b5c');
    this.r(x-8,y-13,3,13,'#6d4b5c');this.r(x+5,y-13,3,13,'#6d4b5c');
    const back=facing>0?x+7:x-10;
    this.r(back,y-34,3,20,tone);
    this.r(back-facing*13,y-34,15,3,tone);
    this.r(back-facing*13,y-28,15,2,tone);
  }

  cake(x,base,lit){
    this.r(x-23,base-2,46,3,'#e3d3d6');this.r(x-20,base+1,40,2,'#ab8d94');
    this.r(x-18,base-15,36,13,'#e8c79b');this.r(x-18,base-15,36,3,'#d2a97c');
    this.r(x-18,base-19,36,5,'#fbe6ee');
    for(let i=0;i<6;i++)this.r(x-16+i*6,base-14,3,2+((i*7)%4),'#fbe6ee');
    for(let i=0;i<5;i++)this.r(x-14+i*7,base-11,2,2,'#e08aa0');
    this.r(x-12,base-30,24,11,'#e8c79b');this.r(x-12,base-30,24,3,'#d2a97c');
    this.r(x-12,base-33,24,4,'#fbe6ee');
    for(let i=0;i<4;i++)this.r(x-10+i*6,base-29,3,2+((i*5)%3),'#fbe6ee');
    this.r(x-8,base-36,3,3,'#e8687f');this.r(x+5,base-36,3,3,'#e8687f');
    this.r(x-9,base-25,2,2,'#e08aa0');this.r(x+7,base-25,2,2,'#e08aa0');
    // Vela con mecha
    this.r(x-1,base-43,3,10,'#f8f0f4');
    this.r(x-1,base-40,3,2,'#e0899f');this.r(x-1,base-36,3,2,'#e0899f');
    this.r(x,base-45,1,2,'#4a373a');
    if(lit){
      // Llama viva animada y parpadeante
      const flick=Math.sin(this.t*15)*.8;
      const h=5+Math.abs(Math.sin(this.t*12))*3;
      this.glow(x,base-48,22,'#ffbe65',.55+Math.sin(this.t*8)*.08);
      this.glow(x,base-48,10,'#ffffff',.45);
      this.r(x-2,base-48+flick,5,h,'#ff9933');
      this.r(x-1,base-50+flick,3,h,'#ffde6a');
      this.r(x,base-51+flick,1,h-1,'#ffffff');
    }else{
      // Voluta de humo suave al apagarse
      const s=positiveMod(this.t*3.5,3.5);
      this.r(x+Math.sin(s*2.5)*2,base-46-s*4,1,2,'#baa8b666');
    }
  }

  door(x,open){
    this.r(x-17,GROUND-64,34,64,'#7a5a63');
    this.r(x-14,GROUND-60,28,60,open?'#1b2743':'#8e6a6d');
    if(open){
      for(let i=0;i<5;i++)this.r(x-12+i*6,GROUND-56+((i*7)%20),3,10,'#2c4670');
      this.glow(x,GROUND-32,44,'#ffd9a0',.30);
      this.r(x-14,GROUND-60,28,2,'#f0c58e');
    }else{
      this.r(x-11,GROUND-56,22,24,'#7d5b60');this.r(x-11,GROUND-28,22,24,'#7d5b60');
      this.r(x+7,GROUND-34,3,3,'#e8c48f');
    }
    this.r(x-19,GROUND-68,38,5,'#9a747a');
  }

  room(scene,cam,state){
    this.r(0,0,W,GROUND,'#5b4358');
    for(let x=-positiveMod(cam,58)-58;x<W;x+=58){
      this.r(x,0,2,GROUND,'#8b647030');
      this.r(x+6,92,46,1,'#92697538');
    }
    this.r(0,16,W,7,'#b08789');
    this.r(0,206,W,18,'#996f77');
    this.r(0,209,W,2,'#d7ac9a');
    for(let x=10;x<scene.width;x+=34){
      const gx=x-cam,gy=34+Math.sin(x*.02)*7;
      this.r(gx,gy,2,2,'#e7c79c');
      this.glow(gx,gy,13,'#ffce95',.16);
    }

    // Cama de Génesis
    const bed=40-cam;
    this.r(bed,182,116,42,'#6a4459');
    this.r(bed-5,160,9,64,'#93707c');
    this.r(bed,183,116,19,'#b6849a');
    this.r(bed+9,176,32,13,'#ead0c4');
    this.r(bed+47,190,62,15,'#8d769c');

    // Ventana con vista a la noche de la ciudad
    this.window(168-cam,58);

    // Cuadro con corazón en la pared
    this.r(310-cam,74,38,50,'#c09582');
    this.r(313-cam,77,32,44,'#39405f');
    this.sp('corazon',329-cam,112,22);

    // La mesa del cumpleaños, con las 6 sillas preparadas para los invitados
    const table=480-cam;
    this.chair(table-74,GROUND,1);
    this.chair(table-44,GROUND,1,'#7d5f7e');
    this.chair(table-20,GROUND,1,'#8a6272');
    this.chair(table+24,GROUND,-1,'#8a6272');
    this.chair(table+52,GROUND,-1,'#7d5f7e');
    this.chair(table+82,GROUND,-1);

    this.r(table-52,190,104,7,'#c6977f');
    this.r(table-52,197,104,3,'#a57a6c');
    this.r(table-44,200,6,24,'#7a5567');
    this.r(table+38,200,6,24,'#7a5567');

    const candleLit = Boolean(state?.candleLit ?? (!state?.flame || state.flameX <= table));
    this.cake(table,190,candleLit);
    this.sp('regalo',table-36,190,22);
    this.sp('foto',table+34,190,20);
    this.sp('maceta',580-cam,GROUND,44);

    // Puerta de salida hacia la calle
    const doorOpen = (state?.player?.x||0) > 400 || Boolean(state?.flame && state.flameX > 510);
    this.door(670-cam, doorOpen);
  }

  homecoming(state){
    const g=this.g;
    // Fondo de la habitación con ambiente cálido, dorado y festivo
    this.r(0,0,W,GROUND,'#5f4559');
    for(let x=0;x<W;x+=58){
      this.r(x,0,2,GROUND,'#93677938');
      this.r(x+6,92,46,1,'#996e7e38');
    }
    this.r(0,16,W,7,'#b88a8d');
    this.r(0,206,W,18,'#9f727c');
    this.r(0,209,W,2,'#dcab98');

    // Guirnaldas festivas y luces alegres en el techo
    this.sp('guirnalda',90,46,26,.95);
    this.sp('guirnalda',240,46,26,.95);
    this.sp('guirnalda',390,46,26,.95);
    for(let x=15;x<W;x+=35){
      const gy=34+Math.sin(x*.06)*6;
      this.r(x,gy,3,3,'#fff1d0');
      this.glow(x,gy,15,'#ffd58a',.25);
    }

    // Ventana con los rayos dorados del amanecer entrando
    this.window(24,56);
    this.glow(50,80,60,'#ffd58a',.38);

    // Cuadro con corazón dorado en la pared
    this.r(410,74,38,50,'#c09582');
    this.r(413,77,32,44,'#4d355d');
    this.sp('corazon',429,112,22);
    this.glow(429,100,24,'#ef829a',.45);

    // Puerta abierta al fondo con luz resplandeciente del nuevo día
    this.door(455,true);

    // La gran mesa de fiesta: ¡Todos reunidos comiendo del bizcocho de cumpleaños!
    const table=270;
    this.r(table-74,190,148,8,'#c6977f');
    this.r(table-74,198,148,3,'#a57a6c');
    this.r(table-62,201,7,23,'#7a5567');
    this.r(table+55,201,7,23,'#7a5567');

    // El bizcocho de cumpleaños en el centro con velas y porciones
    this.cake(table,190,true);
    this.glow(table,152,32,'#ffd58a',.5);

    // Los 6 amigos sentados alrededor de la mesa comiendo bizcocho
    // 3 a la izquierda (Simón, Nora, Lía) y 3 a la derecha (Mateo, Abril, Joel)
    const guests=[
      {x:table-66,dir:1,sprite:0,name:'Simón',color:'#62df7d'},
      {x:table-44,dir:1,sprite:4,name:'Nora',color:'#ffd84a'},
      {x:table-22,dir:1,sprite:8,name:'Lía',color:'#ff9a45'},
      {x:table+22,dir:-1,sprite:12,name:'Mateo',color:'#b187ff'},
      {x:table+44,dir:-1,sprite:16,name:'Abril',color:'#5f7dff'},
      {x:table+66,dir:-1,sprite:20,name:'Joel',color:'#79e4ee'},
    ];

    for(const [idx,guest] of guests.entries()){
      this.chair(guest.x,GROUND,guest.dir);
      const reaction=!this.soft?Math.floor(positiveMod(this.t*2.2+idx,4)):0;
      this.guest(idx,guest.x,GROUND+1,{frame:reaction,dir:guest.dir,height:48});
      // Plato con rebanada de bizcocho frente a cada uno en la mesa
      const px=guest.x+guest.dir*10;
      this.r(px-5,188,10,2,'#f0e0e3');
      this.r(px-3,184,6,4,'#e8c79b');
      this.r(px-3,183,6,1,'#fbe6ee');
      // Corazoncito flotando de alegría sobre sus cabezas
      const hy=GROUND-54-Math.sin(this.t*2.6+idx)*3;
      this.glow(guest.x,hy,12,guest.color,.42);
      this.sp('corazon',guest.x,hy,11,.9);
    }

    // Enmanuel y Génesis juntos al lado de la mesa
    const gX=120;
    const eX=65;

    // Enmanuel entregando la carta sellada a Génesis
    this.actor('enmanuel',eX,GROUND,{walk:false,run:false,dir:1,phase:0});
    this.actor('genesis',gX,GROUND,{walk:false,run:false,cheer:true,dir:-1,phase:0});

    // La carta mágica flotando hacia las manos de Génesis con el alma de Determinación
    const letterT=Math.min(1,(positiveMod(this.t*0.7,1.8)/1.2));
    const lx=lerp(eX+15,gX-8,letterT);
    const ly=GROUND-42-Math.sin(letterT*Math.PI)*10;
    this.glow(lx,ly,26,'#ffd58a',.85);
    this.glow(lx,ly,14,'#e74c3c',.8);
    this.sp('sobre',lx,ly,19,1);
    this.sp('corazon',lx,ly-7,12,1);

    // Chispas doradas festivas flotando en el ambiente
    if(!this.soft){
      for(let i=0;i<16;i++){
        const cx=positiveMod(i*31+this.t*18,W);
        const cy=positiveMod(i*23+this.t*25,GROUND-15);
        this.r(cx,cy,2,2,i%2?'#ffd58a':'#ffffff');
      }
    }
  }

  alley(scene,cam,dawn){
    this.sky(dawn,cam);
    this.hills(cam,dawn);
    this.skyline(cam,dawn);
    this.cityBuildings(scene,cam,dawn);
    this.ground(scene,cam,dawn);

    for(let x=95;x<scene.width;x+=190){
      const sx=x-cam;
      this.line([[sx-72,83],[sx+72,90]],'#1e2942',1);
      for(let bulb=-56;bulb<=56;bulb+=28){
        const bx=sx+bulb,by=86+bulb*.025;
        this.r(bx,by,2,2,'#ffd694');
        this.glow(bx,by,11,'#ffd694',.18);
      }
    }
    for(let x=155;x<scene.width;x+=255){
      const sx=x-cam;
      this.r(sx-19,GROUND-11,38,2,'#26344d');
      this.r(sx-16,GROUND-9,32,1,'#8090a4');
      this.glow(sx,GROUND-8,30,'#7698bb',.12);
    }
    this.sp('buzon',430-cam,GROUND+1,31);
    this.sp('maceta',770-cam,GROUND+1,41);
  }

  street(scene,cam,dawn){
    this.sky(dawn,cam);
    this.hills(cam,dawn);
    this.skyline(cam,dawn);
    this.cityBuildings(scene,cam,dawn);
    this.ground(scene,cam,dawn);

    for(let x=180;x<scene.width;x+=245){
      const lamp=x-cam;
      this.sp('farola',lamp,GROUND+1,58);
      this.glow(lamp,GROUND-48,38,'#ffd18d',.18+(1-dawn)*.08+this.pulse*.04);
    }
    for(let x=315;x<scene.width;x+=430){
      const puddle=x-cam;
      this.r(puddle-28,GROUND+14,56,2,'#7893a45c');
      this.r(puddle-18,GROUND+18,36,1,'#efbd8e66');
      const ripple=positiveMod(this.t*12,24);
      this.r(puddle-ripple/2,GROUND+20,Math.max(2,ripple),1,'#a9c1ca40');
    }
    this.sp('buzon',340-cam,GROUND+1,30);
    this.sp('banco',720-cam,GROUND+1,23);
    this.sp('maceta',1110-cam,GROUND+1,42);
  }

  garden(scene,cam,dawn){
    this.sky(dawn,cam);
    this.hills(cam,dawn);
    this.skyline(cam,dawn);
    for(let index=0;index<18;index++){
      const x=index*112-cam*.63;
      this.sp(index%3?'arbol':'palmera',x,GROUND+1,index%3?104:118,.88);
    }
    this.ground(scene,cam,dawn);
    for(let index=0;index<28;index++){
      const x=positiveMod(index*73-cam*.86,scene.width+190)-95;
      this.sp('arbusto',x,GROUND+3,28,.94);
      if(index%3===0)this.sp('rosa',x+11,GROUND+1,15,.9);
    }
    this.sp('banco',1120-cam,GROUND+1,24);
    if(!this.soft)for(let index=0;index<14;index++){
      const x=positiveMod(index*97+Math.sin(this.t*.7+index)*18-cam*.45,W+80)-40;
      const y=125+Math.sin(this.t*1.4+index*1.8)*31;
      this.r(x,y,1,1,index%2?'#d6efac':'#ffe193');
      this.glow(x,y,7,index%2?'#b7e7aa':'#ffe193',.17);
    }
  }

  bridge(scene,cam,dawn){
    this.sky(dawn,cam);
    this.hills(cam,dawn);
    this.skyline(cam,dawn);

    const water=GROUND-4;
    this.r(0,water,W,H-water+LIFT_MAX,hexMix('#122c4b','#8d6c80',dawn));
    for(let index=0;index<24;index++){
      const y=water+5+index*3;
      const drift=positiveMod(index*41+this.t*(index%2?4:-3)-cam*.2,W+90)-45;
      this.r(drift,y,24+(index%4)*9,1,index%3===0?'#d7b08b55':'#7092aa55');
    }

    this.r(0,GROUND-2,W,10,'#4d3a45');
    this.r(0,GROUND-5,W,4,'#aa7f73');
    for(let x=-positiveMod(cam,32);x<W;x+=32)this.r(x,GROUND-4,2,9,'#2f2d3c');
    this.line([[0,190],[W,190]],'#b08b7e',3);
    this.line([[0,198],[W,198]],'#594653',2);
    for(let x=-positiveMod(cam,60);x<W+60;x+=60){
      this.r(x,181,4,45,'#3e3544');
      this.r(x-2,179,8,4,'#a37a71');
    }
    for(let x=150;x<scene.width;x+=310){
      const ribbon=x-cam;
      const wave=this.soft?0:Math.sin(this.t*2+x)*3;
      this.line([[ribbon,184],[ribbon+17,187+wave],[ribbon+26,184-wave]],'#ef829a',2);
    }
  }

  fountain(x){
    this.r(x-31,GROUND-12,62,12,'#8b7184');
    this.r(x-37,GROUND-13,74,4,'#c29a99');
    this.r(x-17,GROUND-28,34,16,'#735f78');
    this.r(x-22,GROUND-29,44,4,'#b78f97');
    this.r(x-2,GROUND-49,4,22,'#9f8290');
    const height=10+Math.sin(this.t*2.4)*3;
    this.line([[x,GROUND-48],[x-9,GROUND-48-height],[x-16,GROUND-31]],'#9fc9d2b5',1);
    this.line([[x,GROUND-48],[x+9,GROUND-48-height],[x+16,GROUND-31]],'#9fc9d2b5',1);
    this.glow(x,GROUND-33,32,'#9fc9d2',.08);
  }

  plaza(scene,cam,dawn){
    this.sky(dawn,cam);
    this.hills(cam,dawn);
    this.skyline(cam,dawn);
    this.cityBuildings(scene,cam,dawn);
    this.ground(scene,cam,dawn);
    for(let x=-positiveMod(cam,48);x<W;x+=48){
      this.line([[x,GROUND+2],[x+18,H+LIFT_MAX]],'#705f715c',1);
    }
    for(let y=GROUND+14;y<H+LIFT_MAX;y+=15)this.r(0,y,W,1,'#796a7850');

    for(let x=175;x<scene.width;x+=260){
      const lamp=x-cam;
      this.sp('farola',lamp,GROUND+1,56);
      this.glow(lamp,GROUND-47,34,'#ffcc90',.19+this.pulse*.05);
    }
    for(let x=60;x<scene.width;x+=300){
      const left=x-cam;
      this.line([[left,107],[left+280,116]],'#4b3b52',1);
      for(let bulb=0;bulb<9;bulb++){
        const bx=left+bulb*34,by=109+bulb*1.1;
        this.r(bx,by,2,2,bulb%2?'#ffb0c1':'#ffd58a');
        this.glow(bx,by,10,bulb%2?'#ffb0c1':'#ffd58a',.13);
      }
    }
    this.fountain(760-cam);
    this.sp('banco',470-cam,GROUND+1,24);
    this.sp('maceta',1050-cam,GROUND+1,42);
  }

  dawn(scene,cam,dawn){
    this.sky(dawn,cam);
    this.hills(cam,dawn);
    this.skyline(cam,dawn);
    this.r(0,203,W,21,hexMix('#3d5067','#b48a80',dawn));
    for(let index=0;index<32;index++){
      const x=positiveMod(index*43-cam*.28,W+70)-35;
      this.r(x,207+(index%4)*3,18+(index%3)*7,1,'#f4c59a55');
    }
    this.ground(scene,cam,dawn);
    this.line([[0,191],[W,191]],'#745567',3);
    for(let x=-positiveMod(cam,72);x<W+72;x+=72){
      this.r(x,185,4,40,'#503e50');
      this.r(x-2,183,8,4,'#a27878');
    }
    for(let index=0;index<30;index++){
      const x=positiveMod(index*47-cam,scene.width);
      this.sp('rosa',x,GROUND+1,15,.92);
    }
    this.sp('banco',510-cam,GROUND+1,25);
    this.sp('guirnalda',725-cam,128,31,.92);
  }

  coverScene(state){
    this.sky(.12,0);
    this.hills(0,.12);
    this.skyline(0,.12);
    this.r(0,220,W,50,'#17243c');
    this.r(0,220,W,2,'#697b91');
    for(let index=0;index<7;index++){
      const angle=-Math.PI*.9+index*Math.PI*.3;
      const x=240+Math.cos(angle)*112;
      const y=100+Math.sin(angle)*44;
      this.glow(x,y,18,VIRTUE_COLORS[index],.28);
      this.r(x,y,index===3?2:1,index===3?2:1,'#fff0d4');
      if(index)this.line([[x,y],[240+Math.cos(angle-Math.PI*.3)*112,100+Math.sin(angle-Math.PI*.3)*44]],'#d5c4bd32',1);
    }
    this.glow(240,193,75,'#ffd58a',.12+this.pulse*.04);
    this.r(228,221,25,2,'#050b1766');
    this.actor('genesis',240,220,{walk:false,dir:1,phase:0,scale:1.08});
    this.light(286,151,'#ffd58a',1.05);
  }

  portrait(canvas,who){
    const g=canvas.getContext('2d');
    g.imageSmoothingEnabled=false;
    g.clearRect(0,0,70,78);
    if(who==='Luz'||who==='Narración'||who==='Determinación'){
      const frame=this.atlas[who==='Narración'?'luna0':'brillo0'];
      if(frame)g.drawImage(this.images.atlas,...frame,10,8,50,62);
      return;
    }
    const invitado=GUEST_NAMES.indexOf(who);
    if(invitado>=0){
      // El mismo cuerpo en alta que en el escenario, recortado a la cara.
      const look=GUESTS[invitado],f=this.meta[look.cuerpo]?.[0];
      if(f){
        const lienzo=this.recolor(look.cuerpo+':0',this.images[look.cuerpo],f.x,f.y,f.w,f.h,look);
        g.imageSmoothingEnabled=true;
        g.imageSmoothingQuality='high';
        g.drawImage(lienzo,0,0,f.w,Math.min(f.h,210),12,4,48,72);
        g.imageSmoothingEnabled=false;
      }
      return;
    }
    const key=who==='Enmanuel'?'enmanuel':'genesis';
    const frame=this.meta[key]?.[0];
    if(frame){
      g.imageSmoothingEnabled=true;
      g.imageSmoothingQuality='high';
      g.drawImage(this.images[key],frame.x,frame.y,frame.w,Math.min(frame.h,210),12,4,48,72);
      g.imageSmoothingEnabled=false;
    }
  }

  render(state){
    const g=this.g;
    this.t=state.time||0;
    this.soft=state.reduced;
    this.pulse=state.pulse||0;
    g.imageSmoothingEnabled=false;
    g.globalAlpha=1;
    g.clearRect(0,0,W,H);

    if(state.mode==='cover'){
      this.coverScene(state);
      return;
    }

    const scene=state.scene;
    const camera=state.camera||0;
    const dawn=state.dawn??0;
    const lift=Math.round(clamp(state.lift||0,0,LIFT_MAX));
    g.save();
    g.translate(0,-lift);

    if(state.homecoming){
      this.homecoming(state);
      g.restore();
      return;
    }

    if(scene.kind==='room')this.room(scene,camera,state);
    else if(scene.kind==='alley')this.alley(scene,camera,dawn);
    else if(scene.kind==='street')this.street(scene,camera,dawn);
    else if(scene.kind==='garden')this.garden(scene,camera,dawn);
    else if(scene.kind==='bridge')this.bridge(scene,camera,dawn);
    else if(scene.kind==='plaza')this.plaza(scene,camera,dawn);
    else this.dawn(scene,camera,dawn);

    for(const [index,person] of (scene.kind==='plaza'?state.people||[]:[]).entries()){
      const x=person.x-camera;
      const colour=person.received?.color||'#ffd39a';
      if(person.lit)this.glow(x,GROUND-27,45,colour,.5+this.pulse*.1);
      const reaction=person.lit&&!this.soft?Math.floor(positiveMod(this.t*2.2+index,4)):0;
      // Personaje secundario mirando de frente hacia Génesis (hacia la izquierda, dir = -1)
      this.guest(index,x,GROUND+1,{frame:reaction,dir:-1,alpha:person.lit?1:.72,height:52});
      if(person.lit){
        this.light(x-8,GROUND-47,colour,.65,.45);
        // ¡El personaje sostiene visiblemente el regalo en sus manos!
        this.glow(x-10,GROUND-20,18,colour,.6);
        this.sp('regalo',x-10,GROUND-14,18,1);
        // Corazón o destello de gratitud flotando sobre su cabeza
        const heartY=GROUND-58-Math.sin(this.t*2.6+index)*4;
        this.glow(x,heartY,14,colour,.5);
        this.sp('corazon',x,heartY,13,.9);
      }
    }

    // Animación del regalo volando en arco luminoso desde Génesis hacia el personaje
    for(const gift of state.giftTransfers||[]){
      const elapsed=this.t-gift.time;
      const p=clamp(elapsed/(gift.duration||0.95),0,1);
      if(p<1){
        const gx=lerp(gift.fromX,gift.toX,p)-camera;
        const gy=lerp(gift.fromY,gift.toY,p)-Math.sin(p*Math.PI)*28;
        this.glow(gx,gy,24,gift.color,.8);
        this.glow(gx,gy,10,'#ffffff',.85);
        this.sp('regalo',gx,gy,19,1);
        if(!this.soft){
          for(let i=0;i<3;i++){
            const sx=gx-(i+1)*3+Math.sin(this.t*12+i)*2;
            const sy=gy+Math.cos(this.t*12+i)*2;
            this.r(sx,sy,2,2,i%2?'#ffffff':gift.color);
          }
        }
      }
    }

    for(const item of (scene.kind==='garden'?state.lights||[]:[])){
      if(item.taken)continue;
      this.light(item.x-camera,item.y+Math.sin(this.t*1.45+item.x)*3,item.color,1.08);
    }

    // Enmanuel corre invisible / etéreo por delante con estelas de luz.
    // Su silueta translúcida anima la carrera y guía el camino.
    if(state.guide&&!state.guideSolid){
      const x=state.guide.x-camera;
      const flicker=.22+Math.sin(this.t*3)*.08;
      this.glow(x,GROUND-26,42,'#9fe3c8',flicker);
      for(let step=0;step<4;step++){
        const sx=x-(state.guide.dir||1)*(step*15+6);
        const alpha=clamp(1-step*.24,0,1)*(.28+this.pulse*.1);
        g.globalAlpha=alpha;
        this.r(sx,GROUND-2-(step%2),4,1,'#bcebd8');
        this.glow(sx,GROUND-2,7,'#9fe3c8',alpha*.45);
      }
      g.globalAlpha=1;

      // Silueta etérea de Enmanuel corriendo o esperando
      const ghostAlpha=.34+Math.sin(this.t*2.4)*.1;
      this.actor('enmanuel',x,GROUND,{
        run:Boolean(state.guide.running),
        walk:false,
        dir:state.guide.dir||1,
        phase:state.guide.phase||0,
        alpha:ghostAlpha,
      });
    }

    if(state.guideSolid&&state.guide){
      const x=state.guide.x-camera;
      this.glow(x,GROUND-30,55,'#ffd7a0',.25);
      this.r(x-9,GROUND+1,19,2,'#1a253866');
      this.actor('enmanuel',x,GROUND,{
        walk:false,
        run:Boolean(state.guide.running),
        dir:state.guide.dir||-1,
        phase:state.guide.phase||0,
      });

      // Animación de la entrega de la carta de Enmanuel a Génesis
      if(state.letterTransfer){
        const p=clamp((this.t-state.letterTransfer.time)/state.letterTransfer.duration,0,1);
        if(p<1){
          const lx=lerp(state.letterTransfer.fromX,state.letterTransfer.toX,p)-camera;
          const ly=lerp(state.letterTransfer.fromY,state.letterTransfer.toY,p)-Math.sin(p*Math.PI)*24;
          this.glow(lx,ly,26,'#ffd58a',.85);
          this.glow(lx,ly,14,'#e74c3c',.75);
          this.sp('sobre',lx,ly,19,1);
          this.sp('corazon',lx,ly-7,12,.95);
        }else{
          // Génesis sostiene la carta sellada en sus manos
          const gx=state.player.x-camera;
          this.glow(gx+14,GROUND-42,20,'#ffd58a',.8);
          this.sp('sobre',gx+14,GROUND-42,19,1);
          this.sp('corazon',gx+14,GROUND-50,11,.95);
        }
      }else{
        this.sp('sobre',x-15,GROUND-51,19);
      }
    }

    const player=state.player;
    this.r(player.x-camera-11,GROUND+1,23,2,'#0b172766');
    this.actor('genesis',player.x-camera,GROUND,{
      walk:player.walking,
      run:player.running,
      cheer:Boolean(state.cheerUntil&&state.time<state.cheerUntil),
      dir:player.dir,
      phase:player.phase,
    });

    for(let index=0;index<(state.carried||[]).length;index++){
      const item=state.carried[index];
      this.light(
        player.x-camera-player.dir*(20+index*7),
        GROUND-63-Math.sin(this.t*1.5+index*.7)*4,
        item.color,
        .55,
        .48,
      );
    }
    if(state.flame)this.star(state.flameX-camera,state.flameY,'#ffd88a',1.35);

    for(const particle of state.particles||[]){
      g.globalAlpha=clamp(particle.life,0,1);
      this.r(particle.x-camera,particle.y,particle.size||1,particle.size||1,particle.color);
    }
    g.globalAlpha=1;

    if(!this.soft)for(let index=0;index<24;index++){
      const x=positiveMod(index*47+this.t*(2+index%3)-camera*.14,520)-20;
      const y=positiveMod(index*39+Math.sin(this.t+index)*5,200);
      this.r(x,y,1,1,index%3===0?'#f4dda5':'#98c8bd6b');
    }
    g.restore();

    const bottom=g.createLinearGradient(0,H-26,0,H);
    bottom.addColorStop(0,'#08112500');
    bottom.addColorStop(1,'#08112573');
    g.fillStyle=bottom;
    g.fillRect(0,H-26,W,26);

    if(state.fade>0){
      g.globalAlpha=clamp(state.fade,0,1);
      g.fillStyle='#080f24';
      g.fillRect(0,0,W,H);
      if(state.fade>.72){
        g.globalAlpha=(state.fade-.72)/.28;
        this.r(W/2-1,H/2-1,3,3,'#ffd58a');
      }
      g.globalAlpha=1;
    }
  }
}
