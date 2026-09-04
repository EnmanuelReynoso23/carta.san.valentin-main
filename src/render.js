import {clamp,positiveMod,seeded,W,H,GROUND,LIFT_MAX} from './logic.js';
export {W,H,GROUND,LIFT_MAX};
const hexMix=(a,b,t)=>{const aa=parseInt(a.slice(1),16),bb=parseInt(b.slice(1),16);return '#'+[16,8,0].map(s=>Math.round(((aa>>s)&255)*(1-t)+((bb>>s)&255)*t).toString(16).padStart(2,'0')).join('');};
// Las hojas de personaje van en cuatro filas: quieta, caminando, en el aire y
// celebrando. De ahí salen las poses del salto y la del final.
const POSE={idle:0,blink:3,rise:13,fall:10,cheer:14};
// La fila de caminar no viene en orden. Midiendo la separación de los pies en
// cada dibujo salen dos poses de paso abierto (5 y 7) y dos de paso cerrado
// (6 y 4). Alternando abierto-cerrado-abierto-cerrado el paso por fin se lee;
// puestas 4,5,6,7 los pies parecían quedarse siempre en el mismo sitio.
const WALK=[5,6,7,4];
/**
 * La gente de la plaza. Antes salían de la misma hoja que Génesis y Enmanuel
 * —por eso parecían todos ellos dos—; ahora cada uno está dibujado aquí, con
 * su estatura, su pelo y su ropa.
 */
const LOOKS={
  simon:{h:37,skin:'#c08f6b',hair:'#ded7cd',top:'#7c6244',arm:'#6b543b',leg:'#4b4033',shoe:'#332b23',style:'mayor'},
  nora:{h:41,skin:'#9c6c4d',hair:'#2c2430',top:'#3f8478',arm:'#37736a',leg:'#2f5d58',shoe:'#2f2c36',style:'mono'},
  lia:{h:29,skin:'#e0ad89',hair:'#4a2f2a',top:'#e8bb57',arm:'#d3a944',leg:'#7a5f8e',shoe:'#463a52',style:'coletas'},
  guardian:{h:48,skin:'#7a5139',hair:'#25212b',top:'#3a5480',arm:'#32496f',leg:'#2a3552',shoe:'#1e2436',cap:'#2c3f63',style:'gorra'},
};
const PORTRAIT_LOOKS={'Génesis':null,'Simón':'simon','Nora':'nora','Lía':'lia','El guardián':'guardian'};

export class Renderer{
  constructor(canvas){
    this.canvas=canvas;this.g=canvas.getContext('2d',{alpha:false});this.g.imageSmoothingEnabled=false;
    this.images={};this.meta={};this.atlas={};this.t=0;this.soft=false;
    this.stars=Array.from({length:96},(_,i)=>({x:(i*73.37)%W,y:(i*31.73)%150,size:i%8===0?2:1,phase:i*.91}));
  }
  async load(){
    const [characters,atlas]=await Promise.all([
      fetch('assets/characters.json').then(r=>{if(!r.ok)throw Error('characters');return r.json();}),
      fetch('assets/atlas.json').then(r=>{if(!r.ok)throw Error('atlas');return r.json();})]);
    this.meta=characters;this.atlas=atlas;
    await Promise.all(['genesis','enmanuel','atlas'].map(name=>new Promise((resolve,reject)=>{
      const image=new Image();image.onload=()=>{this.images[name]=image;resolve();};
      image.onerror=()=>reject(Error('No se pudo cargar '+name));image.src='assets/'+name+'.png';})));
  }
  r(x,y,w,h,color){const g=this.g;g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));}
  glow(x,y,radius,color,power=.25){
    const g=this.g,gradient=g.createRadialGradient(x,y,0,x,y,radius);
    gradient.addColorStop(0,color);gradient.addColorStop(1,color+'00');
    g.save();g.globalAlpha=power;g.fillStyle=gradient;g.fillRect(x-radius,y-radius,radius*2,radius*2);g.restore();
  }
  sp(name,x,y,height,alpha=1){
    const f=this.atlas[name];if(!f)return;
    const g=this.g,scale=height/f[3];g.save();g.globalAlpha=alpha;
    g.drawImage(this.images.atlas,...f,Math.round(x-f[2]*scale/2),Math.round(y-height),Math.round(f[2]*scale),Math.round(height));
    g.restore();
  }
  /**
   * Génesis y Enmanuel salen de sus hojas grandes. El ciclo de caminar avanza
   * con la distancia recorrida —así los pies no patinan— y en el aire se usa la
   * pose de salto, para que se note cuándo despega y cuándo cae.
   */
  actor(name,x,y,{walk=false,dir=1,phase=0,alpha=1,scale=1,air=0,cheer=false}={}){
    const frames=this.meta[name];if(!frames)return;
    const g=this.g;
    const index=cheer?POSE.cheer:air<0?POSE.rise:air>0?POSE.fall:
      walk?WALK[Math.floor(positiveMod(phase,4))]:(positiveMod(this.t,5)<.16?POSE.blink:POSE.idle);
    const f=frames[index],s=.168*scale;
    g.save();g.globalAlpha=alpha;g.translate(Math.round(x),Math.round(y));
    if(dir<0)g.scale(-1,1);
    const bob=this.soft||air?0:walk?Math.cos(positiveMod(phase,4)*Math.PI)*1.1:Math.sin(this.t*2)*.4;
    g.drawImage(this.images[name],f.x,f.y,f.w,f.h,Math.round(-f.pivotX*s),Math.round(-f.pivotY*s+bob),Math.round(f.w*s),Math.round(f.h*s));
    g.restore();
  }

  /**
   * Una persona de la plaza, dibujada punto a punto: primero las piernas, luego
   * el torso con los brazos, después la cabeza y al final lo que distingue a
   * cada uno —el bastón de Simón, el moño de Nora, las coletas de Lía y la
   * gorra del guardián—. Apagados hasta que Génesis les deja una luz.
   */
  person(x,base,look,lit,t){
    const L=LOOKS[look]||LOOKS.nora,h=L.h,g=this.g;
    // La luz de las farolas viene de arriba: cada prenda lleva su sombra a un
    // lado y su brillo arriba, igual que el resto del pixel art del juego.
    const sombra=c=>hexMix(c,'#0a0d18',.34),brillo=c=>hexMix(c,'#fff6e2',.22);
    g.save();g.globalAlpha=lit?1:.5;
    const top=base-h,headH=Math.round(h*.25),chin=top+headH;
    const hip=base-Math.round(h*.4),torso=hip-chin;
    const hw=Math.max(3,Math.round(h*.12)),bw=Math.max(4,Math.round(h*.15));
    const sway=lit&&!this.soft?Math.round(Math.sin(t*1.5+x*.7)*.9):0;
    const y=v=>v+sway;
    // piernas, con la de atrás más oscura y un hueco de 1 píxel en medio
    const legW=Math.max(2,bw-2),legH=base-hip-2;
    this.r(x-bw+1,hip,legW,legH,sombra(L.leg));
    this.r(x+1,hip,legW,legH,L.leg);
    this.r(x-bw+1,hip,legW,1,sombra(L.top));
    this.r(x-bw,base-2,bw,2,sombra(L.shoe));
    this.r(x+1,base-2,bw,2,L.shoe);
    this.r(x+1,base-2,bw,1,brillo(L.shoe));
    // torso: sombra a la izquierda, cuello y cintura
    this.r(x-bw,y(chin),bw*2,torso,L.top);
    this.r(x-bw,y(chin),Math.max(2,Math.round(bw*.6)),torso,sombra(L.top));
    this.r(x-bw,y(chin),bw*2,1,brillo(L.top));
    this.r(x-2,y(chin),4,Math.max(2,Math.round(headH*.3)),brillo(L.top));
    this.r(x-bw,y(hip-2),bw*2,2,sombra(L.top));
    // brazos y manos
    const armH=Math.max(3,Math.round(torso*.74));
    this.r(x-bw-2,y(chin+2),2,armH,sombra(L.arm));
    this.r(x+bw,y(chin+2),2,armH,L.arm);
    this.r(x-bw-2,y(chin+2+armH),2,2,sombra(L.skin));
    this.r(x+bw,y(chin+2+armH),2,2,L.skin);
    // cabeza: cara, mandíbula, ojos y boca
    this.r(x-hw,y(top),hw*2,headH,L.skin);
    this.r(x-hw,y(top),Math.max(1,Math.round(hw*.5)),headH,sombra(L.skin));
    this.r(x-hw,y(top+headH-1),hw*2,1,sombra(L.skin));
    const eye=y(top+Math.round(headH*.56));
    this.r(x-2,eye,1,1,'#241d24');this.r(x+1,eye,1,1,'#241d24');
    this.r(x-2,eye-2,1,1,sombra(L.hair));this.r(x+1,eye-2,1,1,sombra(L.hair));
    this.r(x,eye+3,1,1,sombra(L.skin));
    // pelo: casco, volumen a los lados y un brillo arriba
    const hairH=Math.max(2,Math.round(headH*.38));
    this.r(x-hw,y(top),hw*2,hairH,L.hair);
    this.r(x-hw-1,y(top+1),1,Math.round(headH*.55),sombra(L.hair));
    this.r(x+hw,y(top+1),1,Math.round(headH*.55),L.hair);
    this.r(x-hw+1,y(top),Math.max(2,hw),1,brillo(L.hair));
    if(L.style==='mayor'){
      // Simón: el pelo ya blanco, la espalda un poco vencida y su bastón.
      this.r(x-hw-1,y(top),hw*2+2,2,brillo(L.hair));
      this.r(x+bw+2,y(chin+4),1,base-chin-4-sway,'#6d5540');
      this.r(x+bw+1,y(chin+3),3,1,'#8a6c4f');
    }else if(L.style==='mono'){
      // Nora: el moño recogido y la flor que le devuelve a Génesis.
      this.r(x-2,y(top-3),5,4,L.hair);
      this.r(x-2,y(top-3),5,1,brillo(L.hair));
      if(lit){this.r(x-bw-4,y(chin+4+armH),2,2,'#e8798f');this.r(x-bw-4,y(chin+6+armH),1,2,'#6f9a72');}
    }else if(L.style==='coletas'){
      // Lía: las dos coletas, que se mueven con ella.
      const cl=Math.round(headH*.9);
      this.r(x-hw-2,y(top+2),2,cl,L.hair);this.r(x+hw,y(top+2),2,cl,L.hair);
      this.r(x-hw-2,y(top+2+cl),2,1,brillo(L.hair));this.r(x+hw,y(top+2+cl),2,1,brillo(L.hair));
    }else if(L.style==='gorra'){
      // El guardián: la gorra con visera y la placa en el pecho.
      const cap=Math.max(2,Math.round(headH*.42));
      this.r(x-hw-1,y(top-1),hw*2+2,cap,L.cap);
      this.r(x-hw-1,y(top-1),hw*2+2,1,brillo(L.cap));
      this.r(x-hw-3,y(top-1+cap),hw*2+5,1,sombra(L.cap));
      this.r(x-bw+2,y(chin+4),2,2,'#d9c07a');
    }
    g.restore();
  }
  light(x,y,color,size=1,power=.85){
    this.glow(x,y,23*size,color,power);
    this.sp('brillo1',x,y+8,15*size);
  }
  sky(dawn,cam){
    const g=this.g,gradient=g.createLinearGradient(0,0,0,H);
    gradient.addColorStop(0,hexMix('#101c3c','#8f6f9e',dawn));
    gradient.addColorStop(.62,hexMix('#31446a','#f2a98f',dawn));
    gradient.addColorStop(1,hexMix('#3f5170','#ffd8ab',dawn));
    g.fillStyle=gradient;g.fillRect(0,0,W,H+LIFT_MAX);
    for(const s of this.stars){
      g.globalAlpha=Math.max(0,1-dawn*1.05)*(.45+Math.sin(this.t*.7+s.phase)*.25);
      this.r(positiveMod(s.x-cam*.035,W),s.y,s.size,s.size,'#f2dcd1');
    }
    g.globalAlpha=1;
    const mx=392-cam*.02,my=48,sol=dawn>.55;
    // De noche una luna con su sombra; al amanecer, un sol con halo y núcleo,
    // para que deje de leerse como un círculo pegado encima del cielo.
    this.glow(mx,my+3,sol?78:52,sol?'#ffd28a':'#cee2e1',sol?.3:.22);
    if(sol)this.glow(mx,my+2,34,'#ffe7b4',.34);
    g.fillStyle=sol?'#ffdb9e':'#e8e2c8';g.beginPath();g.arc(mx,my,10,0,Math.PI*2);g.fill();
    if(sol){g.fillStyle='#fff3d2';g.beginPath();g.arc(mx-2,my-2,6,0,Math.PI*2);g.fill();}
    if(dawn<.5){g.fillStyle=hexMix('#101c3c','#31446a',.3);g.beginPath();g.arc(mx-6,my-3,9,0,Math.PI*2);g.fill();}
    this.sp('nube0',positiveMod(70-cam*.05,W+180)-60,58,22,.28+dawn*.4);
    this.sp('nube1',positiveMod(290-cam*.035,W+220)-70,44,19,.24+dawn*.4);
  }
  skyline(cam,dawn){
    for(let layer=0;layer<2;layer++){
      const rng=seeded(912+layer*25);let x=-150;
      while(x<2200){
        const width=24+rng()*45,height=27+rng()*75,sx=x-cam*(layer===0?.13:.28),y=176+layer*12;
        this.r(sx,y-height,width,height,hexMix(layer?'#243f59':'#263852',layer?'#7c6f8e':'#94879f',dawn));
        if(layer)for(let wx=4;wx<width-3;wx+=8)for(let wy=6;wy<height-7;wy+=12)if(rng()>.4)this.r(sx+wx,y-height+wy,2,3,rng()>.5?'#cbab87':'#7a91a2');
        this.r(sx+5,y-height-4,width-10,4,hexMix('#2c415a','#7f7192',dawn));
        x+=width+5;
      }
    }
  }
  /** El suelo se dibuja por tramos: donde el acto tiene un hueco corre agua. */
  ground(scene,cam,dawn,solids){
    const green=scene.kind==='garden';
    const body=scene.kind==='room'?'#5e4455':green?'#2b4a48':hexMix('#3b4861','#b3907f',dawn);
    const edge=scene.kind==='room'?'#8f6c74':green?'#81a592':hexMix('#a5a0a5','#eec6a6',dawn);
    const under=scene.kind==='room'?'#6d4f5f':green?'#3f6b63':hexMix('#626c80','#997b8c',dawn);
    for(const [from,to] of scene.gaps||[])this.water(from-cam,to-from,dawn);
    for(const p of solids){
      if(p.kind!=='suelo')continue;
      const x=p.x-cam,w=p.w;
      if(x>W||x+w<0)continue;
      this.r(x,GROUND,w,H-GROUND+LIFT_MAX,body);
      this.r(x,GROUND,w,2,edge);
      this.r(x,GROUND+3,w,5,under);
      if(scene.kind==='room')for(let gx=x;gx<x+w;gx+=44)this.r(gx,GROUND+8,1,H-GROUND,'#4a3646');
    }
    if(scene.kind!=='room')for(let i=0;i<44;i++){
      const wx=i*61.3,x=positiveMod(wx-cam,scene.width);
      if((scene.gaps||[]).some(([a,b])=>wx>=a-6&&wx<=b+6))continue;
      this.r(x,GROUND+9+(i%4)*7,2+(i%3),1,green?'#659680':hexMix('#8f8b98','#c9a58f',dawn));
    }
    // Las juntas de las losas: sin ellas la acera era una franja lisa y muerta.
    if(!green&&scene.kind!=='room'){
      const junta=hexMix('#4d5568','#ad8d84',dawn);
      for(let i=0;i<26;i++){
        const wx=i*74+18,x=wx-cam;
        if(x<-4||x>W+4)continue;
        if((scene.gaps||[]).some(([a,b])=>wx>=a-8&&wx<=b+8))continue;
        this.r(x,GROUND+4,1,H-GROUND+LIFT_MAX,junta);
      }
    }
  }
  /** El arroyo del jardín: agua oscura con el cielo temblando encima. */
  water(x,w,dawn){
    if(x>W||x+w<0)return;
    this.r(x-3,GROUND,w+6,H-GROUND+LIFT_MAX,'#20313c');
    this.r(x-3,GROUND,3,7,'#33463f');this.r(x+w,GROUND,3,7,'#33463f');
    this.r(x,GROUND+7,w,H-GROUND+LIFT_MAX,hexMix('#1b3b52','#4a5878',dawn));
    this.r(x,GROUND+7,w,2,hexMix('#68b2c2','#d3a3a8',dawn));
    for(let i=0;i<5;i++){
      const wy=GROUND+13+i*9,offset=Math.sin(this.t*1.3+i*1.4)*4;
      this.r(x+5+offset,wy,Math.max(3,w-11),1,i%2?'#4d7f9a66':'#9fd2d966');
    }
  }
  /** Cajas, piedras, tablas y la tarima de la plaza: donde se puede pisar. */
  platform(p,cam,scene,dawn){
    const x=p.x-cam;
    if(x>W+20||x+p.w<-20)return;
    if(p.kind==='cama')return;
    if(p.kind==='piedra'){
      this.r(x,p.y,p.w,7,'#7b8895');this.r(x+1,p.y+1,p.w-2,2,'#a9b6bd');
      this.r(x+2,p.y+7,p.w-4,5,'#4e5c68');this.r(x+3,p.y,p.w-6,1,'#c9d6d8');
      return;
    }
    if(p.kind==='tarima'){
      this.r(x-3,p.y-3,p.w+6,4,'#9d7a62');
      this.r(x,p.y+1,p.w,GROUND-p.y,'#6d5348');
      for(let i=0;i<p.w;i+=11)this.r(x+i,p.y+1,1,GROUND-p.y,'#5a4239');
      this.r(x,p.y,p.w,2,'#c39a7c');
      for(let i=4;i<p.w-4;i+=14)this.r(x+i,p.y+5,9,2,'#8a6b58');
      return;
    }
    if(p.kind==='roca'){
      this.r(x+2,p.y,p.w-4,4,'#5f8a72');
      this.r(x,p.y+3,p.w,GROUND-p.y-3,'#3d5e58');
      this.r(x+1,p.y+5,p.w-2,2,'#4f7a6d');
      this.r(x,GROUND-5,p.w,5,'#2f4a46');
      for(let i=4;i<p.w-5;i+=10)this.r(x+i,p.y-3,5,3,'#7fb195');
      return;
    }
    if(p.kind==='tabla'){
      // Una pasarela de tablones sobre el jardín, con sus dos patas.
      for(const px of [x+4,x+p.w-8]){this.r(px,p.y+4,4,GROUND-p.y-4,'#6b4d36');this.r(px-1,GROUND-4,6,4,'#54402f');}
      this.r(x-3,p.y,p.w+6,3,'#c1936a');
      this.r(x-3,p.y+3,p.w+6,3,'#8a6444');
      for(let i=3;i<p.w;i+=9)this.r(x+i,p.y,1,3,'#9a7250');
      return;
    }
    if(p.kind==='escalon'){
      this.r(x,p.y,p.w,GROUND-p.y,hexMix('#5a5468','#a8877e',dawn));
      this.r(x,p.y,p.w,2,hexMix('#8d8698','#e0b79c',dawn));
      return;
    }
    // Cajas apiladas: se dibujan hasta el suelo para que no floten.
    for(let top=p.y;top<GROUND;top+=22){
      const h=Math.min(22,GROUND-top);
      this.r(x,top,p.w,h,'#7c5f48');this.r(x+1,top+1,p.w-2,h-2,'#96725275');
      this.r(x,top,p.w,2,'#a9825f');this.r(x,top+h-1,p.w,1,'#4d3a2c');
      this.r(x+p.w/2-1,top+3,2,h-6,'#5f4838');
    }
  }
  /**
   * El pastel de cumpleaños, dibujado punto a punto: dos pisos, crema que
   * gotea, confites y una vela. La llama sólo está encendida hasta que ella
   * sopla; a partir de ahí es la lucecita que la acompaña el resto del viaje.
   */
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
    this.r(x-1,base-43,3,10,'#f8f0f4');
    this.r(x-1,base-40,3,2,'#e0899f');this.r(x-1,base-36,3,2,'#e0899f');
    if(lit){
      this.glow(x,base-45,15,'#ffce8a',.45);
      this.r(x,base-46,1,4,'#ffe9bb');this.r(x-1,base-45,3,2,'#ffbf72');
    }
  }
  /** La puerta del cuarto: cerrada mientras no se pide el deseo. */
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
  /** La salida de cada escenario: una columna de luz que llama desde lejos. */
  exitLight(x,open){
    const g=this.g;
    g.save();g.globalAlpha=open?.5+Math.sin(this.t*2)*.12:.16;
    const gradient=g.createLinearGradient(0,GROUND-96,0,GROUND);
    gradient.addColorStop(0,'#ffd9a000');gradient.addColorStop(1,'#ffd9a0');
    g.fillStyle=gradient;g.fillRect(Math.round(x-11),GROUND-96,22,96);g.restore();
    if(open){
      this.glow(x,GROUND-14,30,'#ffe1ae',.35);
      for(let i=0;i<3;i++)this.r(x-4+i*4,GROUND-26-positiveMod(this.t*22+i*13,60),2,4,'#ffe6bd');
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
  room(scene,cam,state){
    this.r(0,0,W,GROUND,'#5b4358');
    for(let x=-positiveMod(cam,58)-58;x<W;x+=58){this.r(x,0,2,GROUND,'#8b647030');this.r(x+6,92,46,1,'#92697538');}
    this.r(0,16,W,7,'#b08789');this.r(0,206,W,18,'#996f77');this.r(0,209,W,2,'#d7ac9a');
    for(let x=10;x<scene.width;x+=34){
      const gx=x-cam,gy=34+Math.sin(x*.02)*7;
      this.r(gx,gy,2,2,'#e7c79c');this.glow(gx,gy,13,'#ffce95',.16);
    }
    const bed=40-cam;
    this.r(bed,182,116,42,'#6a4459');this.r(bed-5,160,9,64,'#93707c');
    this.r(bed,183,116,19,'#b6849a');this.r(bed+9,176,32,13,'#ead0c4');this.r(bed+47,190,62,15,'#8d769c');
    this.window(168-cam,58);
    // La mesa del cumpleaños, con sillas de sobra: se prepararon para más gente.
    const table=470-cam;
    this.chair(table-74,GROUND,1);
    this.chair(table-44,GROUND,1,'#7d5f7e');
    this.chair(table+52,GROUND,-1,'#7d5f7e');
    this.chair(table+82,GROUND,-1);
    this.r(table-52,190,104,7,'#c6977f');
    this.r(table-52,197,104,3,'#a57a6c');
    this.r(table-44,200,6,24,'#7a5567');this.r(table+38,200,6,24,'#7a5567');
    this.cake(table,190,!state.doorOpen);
    this.sp('regalo',table-36,190,22);
    this.sp('foto',table+34,190,20);
    this.sp('maceta',556-cam,GROUND,44);
    this.r(300-cam,74,38,50,'#c09582');this.r(303-cam,77,32,44,'#39405f');
    this.sp('corazon',319-cam,112,22);
    this.door(scene.exit.x-cam,state.doorOpen);
  }
  exterior(scene,cam,dawn){
    this.sky(dawn,cam);this.skyline(cam,dawn);
    if(scene.kind==='garden'){
      for(let i=0;i<18;i++)this.sp(i%2?'arbol':'palmera',i*112-cam*.62,GROUND+1,i%2?100:116,.92);
      for(let i=0;i<26;i++)this.sp('arbusto',positiveMod(i*73-cam*.85,scene.width+200)-100,GROUND+2,26,.9);
    }else{
      const rng=seeded(scene.kind==='dawn'?33:41);
      // A estos edificios también les llega el amanecer. Antes se quedaban de
      // noche con el cielo ya rosa y la escena se veía sucia.
      const caras=['#5c536b','#46566d','#625970'].map(c=>hexMix(c,'#c6a29f',dawn));
      const cornisa=hexMix('#262c46','#7c6270',dawn),marco=hexMix('#303851','#705d6b',dawn);
      const apagada=hexMix('#45566e','#93818b',dawn),encendida=hexMix('#d3ac82','#f2d3ad',dawn*.5);
      const cruz=hexMix('#7c6e78','#a48d8d',dawn);
      for(let x=-120;x<scene.width+200;x+=112){
        const height=62+rng()*42,sx=x-cam*.72;
        // Bajan hasta el suelo: antes flotaban por encima de la acera.
        this.r(sx,204-height,84,height+GROUND-204,caras[Math.floor(rng()*3)]);
        this.r(sx-4,197-height,92,7,cornisa);
        for(let row=0;row<Math.floor((height-14)/28);row++)for(let col=0;col<3;col++){
          const wx=sx+10+col*24,wy=204-height+15+row*28,lit=rng()>.35+dawn*.42;
          this.r(wx-2,wy-2,16,20,marco);this.r(wx,wy,12,15,lit?encendida:apagada);
          this.r(wx+5,wy,2,15,cruz);this.r(wx,wy+7,12,2,cruz);
          if(lit)this.glow(wx+6,wy+7,15,'#eac18d',.08*(1-dawn*.7));
        }
      }
    }
    for(let x=180;x<scene.width;x+=250){
      const lx=x-cam;this.sp('farola',lx,GROUND+2,58);
      this.glow(lx,GROUND-48,36,'#ffcb92',.16+(1-dawn)*.08);
    }
    if(scene.kind==='street'){
      this.sp('buzon',340-cam,GROUND+1,30);
      this.sp('banco',620-cam,GROUND+1,22);
      this.sp('maceta',900-cam,GROUND+1,40);
    }
    if(scene.kind==='plaza'){
      this.sp('guirnalda',720-cam,124,30);
      this.sp('banco',480-cam,GROUND+1,22);
      this.sp('maceta',1020-cam,GROUND+1,40);
    }
    if(scene.kind==='dawn'){
      for(let i=0;i<26;i++)this.sp('rosa',positiveMod(i*47-cam,scene.width),GROUND+1,15,.9);
      this.sp('guirnalda',430-cam,118,30);
    }
  }
  portrait(canvas,who){
    const g=canvas.getContext('2d');g.imageSmoothingEnabled=false;g.clearRect(0,0,70,78);
    if(who==='Luz'||who==='Narración'){
      const f=this.atlas[who==='Luz'?'brillo0':'luna0'];if(!f)return;
      g.drawImage(this.images.atlas,...f,10,8,50,62);return;
    }
    const look=PORTRAIT_LOOKS[who];
    if(look){
      // El mismo dibujo del escenario, ampliado: se reconoce a quien habla.
      const before=this.g,k=66/LOOKS[look].h;
      this.g=g;g.save();g.translate(35,74);g.scale(k,k);
      this.person(0,0,look,true,0);
      g.restore();this.g=before;return;
    }
    if(!['Génesis','Enmanuel'].includes(who)){
      const f=this.atlas.corazon;if(!f)return;
      g.drawImage(this.images.atlas,...f,17,10,36,58);return;
    }
    const key=who==='Enmanuel'?'enmanuel':'genesis',frames=this.meta[key];if(!frames)return;
    const f=frames[0];g.drawImage(this.images[key],f.x,f.y,f.w,Math.min(f.h,190),12,5,48,70);
  }
  render(state){
    const g=this.g,scene=state.scene,cam=state.camera||0,dawn=state.dawn??0;
    this.t=state.time||0;this.soft=state.reduced;
    g.imageSmoothingEnabled=false;g.globalAlpha=1;
    const lift=Math.round(clamp(state.lift||0,0,LIFT_MAX));
    g.save();g.translate(0,-lift);
    if(scene.kind==='room')this.room(scene,cam,state);else this.exterior(scene,cam,dawn);
    this.ground(scene,cam,dawn,state.solids||[]);
    for(const p of state.solids||[])if(p.kind!=='suelo')this.platform(p,cam,scene,dawn);
    if(scene.exit&&scene.kind!=='room')this.exitLight(scene.exit.x-cam,state.exitOpen);
    // La gente del acto IV: apagada hasta que Génesis les deja una luz.
    for(const person of state.people||[]){
      const px=person.x-cam;
      if(px<-50||px>W+50)continue;
      if(person.lit)this.glow(px,GROUND-26,44,'#ffd39a',.6);
      this.r(px-7,GROUND+1,15,2,'#10253755');
      this.person(px,GROUND,person.look,person.lit,this.t);
      if(person.lit)this.light(px+17,GROUND-46,'#ffd8a2',.7,.5);
    }
    for(const item of state.lights||[]){
      if(item.taken)continue;
      this.light(item.x-cam,item.y+Math.sin(this.t*1.4+item.x)*3,item.color,1.1);
    }
    // El chico que siempre va por delante. Solo al final se deja ver.
    if(state.ghost){
      const alpha=state.ghostSolid?1:.22+Math.abs(Math.sin(this.t*1.3))*.1;
      if(!state.ghostSolid)this.glow(state.ghost.x-cam,GROUND-28,30,'#9fe3c8',.3);
      this.actor('enmanuel',state.ghost.x-cam,GROUND,{walk:!state.ghostSolid,dir:state.ghost.dir||1,phase:state.ghost.phase||0,alpha});
      if(state.ghostSolid)this.sp('sobre',state.ghost.x-cam,GROUND-52,20);
    }
    // Lo que se puede tocar parpadea un poco cuando ella está al lado.
    if(state.prompt){
      const px=state.prompt.x-cam;
      this.glow(px,GROUND-22,26,'#ffe6bd',.22+Math.sin(this.t*4)*.07);
      this.sp('brillo1',px,state.prompt.y+Math.sin(this.t*3)*2,11);
    }
    const player=state.player;
    this.r(player.x-cam-10,GROUND+1,21,2,'#10253766');
    if(player.walking&&player.onGround&&!this.soft){
      const puff=positiveMod(player.phase,1);
      g.globalAlpha=(1-puff)*.5;
      this.r(player.x-cam-player.dir*(5+puff*11),player.y-1-puff*3,2,1,'#d7c3a4');
      g.globalAlpha=1;
    }
    this.actor('genesis',player.x-cam,player.y,{walk:player.walking,dir:player.dir,phase:player.phase,
      air:player.onGround?0:Math.sign(player.vy||0)||-1,cheer:state.cheer});
    for(let i=0;i<(state.carried||[]).length;i++){
      const item=state.carried[i];
      this.light(player.x-cam-player.dir*(20+i*7),player.y-64-Math.sin(this.t*1.5+i*.7)*4,item.color,.55,.5);
    }
    if(state.flame)this.light(state.flameX-cam,state.flameY,'#ffce8a',1.2);
    for(const p of state.particles||[]){
      g.globalAlpha=clamp(p.life,0,1);this.r(p.x-cam,p.y,2,2,p.color);g.globalAlpha=1;
    }
    if(!this.soft)for(let i=0;i<22;i++){
      const x=positiveMod(i*47+this.t*(2+i%3)-cam*.15,520)-20,y=positiveMod(i*39+Math.sin(this.t+i)*5,200);
      this.r(x,y,1,1,i%3===0?'#edd9a6':'#97c3bb6b');
    }
    g.restore();
    const veil=g.createLinearGradient(0,H-22,0,H);veil.addColorStop(0,'#10162b00');veil.addColorStop(1,'#10162b5c');
    g.fillStyle=veil;g.fillRect(0,H-22,W,22);
    if(state.fade>0){g.globalAlpha=clamp(state.fade,0,1);g.fillStyle='#101a32';g.fillRect(0,0,W,H);g.globalAlpha=1;}
  }
}
