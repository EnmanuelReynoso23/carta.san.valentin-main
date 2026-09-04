import {clamp} from './timeline.js';
export const W=480,H=270,GROUND=224;
// El panel de conversación tapa la parte baja: el mundo sube un poco mientras
// alguien habla y por eso los fondos se dibujan más altos.
export const LIFT_MAX=90;
const seeded=(seed=7)=>()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
const positiveMod=(n,d)=>((n%d)+d)%d;
const hexMix=(a,b,t)=>{const aa=parseInt(a.slice(1),16),bb=parseInt(b.slice(1),16);return '#'+[16,8,0].map(s=>Math.round(((aa>>s)&255)*(1-t)+((bb>>s)&255)*t).toString(16).padStart(2,'0')).join('');};

/** Cuánto ha avanzado la noche hacia el amanecer en cada acto. */
export const DAWN=[.02,.12,.3,.55,.95];

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
   * Génesis y Enmanuel salen de sus hojas grandes. La fila 0 es de frente y la
   * fila 1 es el paso de perfil: el ciclo avanza con la distancia recorrida, así
   * que los pies no patinan por mucho que cambie la velocidad.
   */
  actor(name,x,y,{walk=false,dir=1,phase=0,alpha=1,scale=1}={}){
    const frames=this.meta[name];if(!frames)return;
    const g=this.g;
    const frame=walk?4+Math.floor(positiveMod(phase,4)):(positiveMod(this.t,5)<.16?3:0);
    const f=frames[frame],s=.168*scale;
    g.save();g.globalAlpha=alpha;g.translate(Math.round(x),Math.round(y));
    if(dir<0)g.scale(-1,1);
    const bob=this.soft?0:walk?Math.sin(phase*Math.PI)*.5:Math.sin(this.t*2)*.4;
    g.drawImage(this.images[name],f.x,f.y,f.w,f.h,Math.round(-f.pivotX*s),Math.round(-f.pivotY*s+bob),Math.round(f.w*s),Math.round(f.h*s));
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
    const mx=392-cam*.02,my=48;
    this.glow(mx,my+3,52,dawn>.55?'#ffe0a6':'#cee2e1',.22);
    g.fillStyle=dawn>.55?'#ffdb9e':'#e8e2c8';g.beginPath();g.arc(mx,my,10,0,Math.PI*2);g.fill();
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
  ground(scene,cam,dawn){
    const green=scene.kind==='garden';
    const body=scene.kind==='room'?'#5e4455':green?'#2b4a48':hexMix('#3b4861','#b3907f',dawn);
    this.r(0,GROUND,W,H-GROUND+LIFT_MAX,body);
    this.r(0,GROUND,W,2,scene.kind==='room'?'#8f6c74':green?'#81a592':hexMix('#a5a0a5','#eec6a6',dawn));
    this.r(0,GROUND+3,W,5,scene.kind==='room'?'#6d4f5f':green?'#3f6b63':hexMix('#626c80','#997b8c',dawn));
    if(scene.kind==='room'){for(let x=-positiveMod(cam,44);x<W;x+=44)this.r(x,GROUND+8,1,H-GROUND,'#4a3646');}
    else for(let i=0;i<44;i++){
      const x=positiveMod(i*61.3-cam,scene.width);
      this.r(x,GROUND+9+(i%4)*7,2+(i%3),1,green?'#659680':hexMix('#8f8b98','#c9a58f',dawn));
    }
  }
  /** La ventana del cuarto: marco, cuatro cristales, alféizar y la ciudad detrás. */
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
  room(scene,cam){
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
    this.sp('pastel',table,190,34);
    this.sp('regalo',table-36,190,22);
    this.sp('foto',table+34,190,20);
    this.sp('maceta',592-cam,GROUND,44);
    this.r(300-cam,74,38,50,'#c09582');this.r(303-cam,77,32,44,'#39405f');
    this.sp('corazon',319-cam,112,22);
  }
  exterior(scene,cam,dawn){
    this.sky(dawn,cam);this.skyline(cam,dawn);
    if(scene.kind==='garden'){
      for(let i=0;i<18;i++)this.sp(i%2?'arbol':'palmera',i*112-cam*.62,GROUND+1,i%2?100:116,.92);
      for(let i=0;i<26;i++)this.sp('arbusto',positiveMod(i*73-cam*.85,scene.width+200)-100,GROUND+2,26,.9);
    }else{
      const rng=seeded(scene.kind==='dawn'?33:41);
      for(let x=-120;x<scene.width+200;x+=112){
        const height=62+rng()*42,sx=x-cam*.72;
        this.r(sx,204-height,84,height,['#5c536b','#46566d','#625970'][Math.floor(rng()*3)]);
        this.r(sx-4,197-height,92,7,'#262c46');
        for(let row=0;row<Math.floor((height-14)/28);row++)for(let col=0;col<3;col++){
          const wx=sx+10+col*24,wy=204-height+15+row*28,lit=rng()>.35;
          this.r(wx-2,wy-2,16,20,'#303851');this.r(wx,wy,12,15,lit?'#d3ac82':'#45566e');
          this.r(wx+5,wy,2,15,'#7c6e78');this.r(wx,wy+7,12,2,'#7c6e78');
          if(lit)this.glow(wx+6,wy+7,15,'#eac18d',.08);
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
      this.sp('guirnalda',700-cam,120,30);
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
    const key=who==='Enmanuel'?'enmanuel':'genesis',frames=this.meta[key];if(!frames)return;
    const f=frames[0];g.drawImage(this.images[key],f.x,f.y,f.w,Math.min(f.h,190),12,5,48,70);
  }
  render(state){
    const g=this.g,scene=state.scene,cam=state.camera||0,dawn=state.dawn??0;
    this.t=state.time||0;this.soft=state.reduced;
    g.imageSmoothingEnabled=false;g.globalAlpha=1;
    const lift=Math.round(clamp(state.lift||0,0,LIFT_MAX));
    g.save();g.translate(0,-lift);
    if(scene.kind==='room')this.room(scene,cam);else this.exterior(scene,cam,dawn);
    this.ground(scene,cam,dawn);
    // La gente del acto IV: apagada hasta que Génesis les deja una luz.
    for(const person of (scene.kind==='plaza'?state.people||[]:[])){
      const px=person.x-cam;
      if(person.lit)this.glow(px,GROUND-26,44,'#ffd39a',.6);
      this.sp('sec'+String(person.sprite).padStart(2,'0'),px,GROUND+1,42,person.lit?1:.45);
      if(person.lit)this.light(px+16,GROUND-46,'#ffd8a2',.7,.5);
    }
    for(const item of (scene.kind==='garden'?state.lights||[]:[])){
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
    const player=state.player;
    this.r(player.x-cam-10,GROUND+1,21,2,'#10253766');
    this.actor('genesis',player.x-cam,GROUND,{walk:player.walking,dir:player.dir,phase:player.phase});
    for(let i=0;i<(state.carried||[]).length;i++){
      const item=state.carried[i];
      this.light(player.x-cam-player.dir*(20+i*7),GROUND-64-Math.sin(this.t*1.5+i*.7)*4,item.color,.55,.5);
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
