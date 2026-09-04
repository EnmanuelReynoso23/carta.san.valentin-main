import {clamp} from './timeline.js';

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

export class Renderer{
  constructor(canvas){
    this.canvas=canvas;
    this.g=canvas.getContext('2d',{alpha:false});
    this.g.imageSmoothingEnabled=false;
    this.images={};
    this.meta={};
    this.atlas={};
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

  sp(name,x,y,height,alpha=1){
    const frame=this.atlas[name];
    if(!frame)return;
    const scale=height/frame[3];
    const g=this.g;
    g.save();
    g.globalAlpha=alpha;
    g.drawImage(
      this.images.atlas,
      ...frame,
      Math.round(x-frame[2]*scale/2),
      Math.round(y-height),
      Math.round(frame[2]*scale),
      Math.round(height),
    );
    g.restore();
  }

  actor(name,x,y,{walk=false,dir=1,phase=0,alpha=1,scale=1}={}){
    const frames=this.meta[name];
    if(!frames)return;
    // La hoja original apoya correctamente los pies en este orden.
    const walkingFrame=[5,6,7,4][Math.floor(positiveMod(phase,4))];
    const idleFrame=positiveMod(this.t+name.length*.37,5.4)<.16?3:0;
    const frame=frames[walk?walkingFrame:idleFrame];
    const size=.172*scale;
    const g=this.g;
    g.save();
    g.globalAlpha=alpha;
    g.translate(Math.round(x),Math.round(y));
    if(dir<0)g.scale(-1,1);
    const breathe=this.soft?0:walk?Math.sin(phase*Math.PI)*.55:Math.sin(this.t*2)*.45;
    g.drawImage(
      this.images[name],
      frame.x,frame.y,frame.w,frame.h,
      Math.round(-frame.pivotX*size),
      Math.round(-frame.pivotY*size+breathe),
      Math.round(frame.w*size),
      Math.round(frame.h*size),
    );
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

  cityBackdrop(cam,dawn,groundY=205){
    const names=['bg_ciudad0','bg_ciudad1','bg_ciudad2'];
    for(let index=-1;index<5;index++){
      const x=index*132-positiveMod(cam*.18,132)+65;
      this.sp(names[positiveMod(index,3)],x,groundY,102,.72-dawn*.18);
    }
  }

  buildingRow(scene,cam,names,spacing=118,height=93,offset=20){
    for(let index=0,x=offset;x<scene.width+180;index++,x+=spacing){
      const name=names[index%names.length];
      this.sp(name,x-cam*.72,GROUND+1,height+(index%3)*5,.96);
    }
  }

  ground(scene,cam,dawn){
    const garden=scene.kind==='garden';
    const room=scene.kind==='room';
    const color=room?'#604458':garden?'#294a45':hexMix('#35455e','#aa8177',dawn);
    this.r(0,GROUND,W,H-GROUND+LIFT_MAX,color);
    this.r(0,GROUND,W,2,room?'#b88690':garden?'#79a38b':hexMix('#9ba3b0','#efbea0',dawn));
    this.r(0,GROUND+3,W,5,room?'#745163':garden?'#3d685d':hexMix('#5c687d','#9d7580',dawn));
    if(room){
      for(let x=-positiveMod(cam,44);x<W;x+=44)this.r(x,GROUND+8,1,H-GROUND,'#4a3446');
    }else{
      for(let index=0;index<48;index++){
        const x=positiveMod(index*61.3-cam,scene.width);
        this.r(x,GROUND+9+(index%4)*7,2+(index%3),1,garden?'#64947c':hexMix('#87909f','#c49a88',dawn));
      }
    }
  }

  chair(x,y,cam){
    const sx=x-cam;
    this.r(sx-8,y-25,16,3,'#8a5c55');
    this.r(sx-8,y-22,3,16,'#65434b');
    this.r(sx+5,y-22,3,16,'#65434b');
    this.r(sx-7,y-9,14,4,'#a67568');
    this.r(sx-6,y-5,3,9,'#513747');
    this.r(sx+3,y-5,3,9,'#513747');
  }

  room(scene,cam){
    this.r(0,0,W,GROUND,'#513a50');
    this.r(0,18,W,8,'#a6747e');
    this.r(0,205,W,19,'#91636f');
    for(let x=-positiveMod(cam,58)-58;x<W;x+=58){
      this.r(x,0,2,GROUND,'#8b647025');
      this.r(x+7,91,44,1,'#c18c9130');
    }

    this.sp('bg_cuarto',108-cam,GROUND,194,1);
    this.sp('bg_sala',332-cam,GROUND,194,.96);

    this.chair(480,200,cam);
    this.chair(540,200,cam);
    this.chair(450,214,cam);
    this.chair(570,214,cam);

    const table=510-cam;
    this.r(table-57,190,114,7,'#c99a81');
    this.r(table-53,197,106,3,'#9a6d63');
    this.r(table-47,200,6,24,'#70495b');
    this.r(table+41,200,6,24,'#70495b');
    this.sp('pastel',table,190,34);
    this.sp('regalo',table-42,190,23);
    this.sp('foto',table+40,190,20);
    this.chair(480,224,cam);
    this.chair(540,224,cam);
    this.sp('maceta',682-cam,GROUND,45);

    for(let index=0;index<5;index++){
      const x=438+index*33-cam,y=43+Math.sin(index*1.7)*7;
      this.line([[x,y],[x+33,y+Math.sin((index+1)*1.7)*7]],'#6e4b61',1);
      this.r(x,y,2,2,'#ffd99a');
      this.glow(x,y,13,'#ffce95',.15);
    }
  }

  alley(scene,cam,dawn){
    this.sky(dawn,cam);
    this.hills(cam,dawn);
    this.cityBackdrop(cam,dawn,199);
    this.buildingRow(scene,cam,['edif00','edif02','edif03','edif07','edif09'],132,91,-25);
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
    this.cityBackdrop(cam,dawn,196);
    this.buildingRow(scene,cam,['edif04','edif05','edif06','edif08','edif10','edif11'],119,92,-30);
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
    this.cityBackdrop(cam,dawn,201);
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
    this.sp('edif09',690-cam*.8,GROUND+1,96,.9);
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
    this.cityBackdrop(cam,dawn,194);

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
    this.cityBackdrop(cam,dawn,197);
    this.sp('edif08',118-cam*.72,GROUND+1,101,.95);
    this.sp('edif10',1340-cam*.72,GROUND+1,99,.95);
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
    this.cityBackdrop(cam,dawn,200);
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
    this.cityBackdrop(0,.12,204);
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
    const secondary={Simón:'sec00',Nora:'sec04',Lía:'sec08',Mateo:'sec12',Abril:'sec16',Joel:'sec20'};
    if(secondary[who]){
      const frame=this.atlas[secondary[who]];
      g.drawImage(this.images.atlas,...frame,17,8,36,64);
      return;
    }
    const key=who==='Enmanuel'?'enmanuel':'genesis';
    const frame=this.meta[key]?.[0];
    if(frame)g.drawImage(this.images[key],frame.x,frame.y,frame.w,Math.min(frame.h,210),12,4,48,72);
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

    if(scene.kind==='room')this.room(scene,camera);
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
      this.sp('sec'+String(person.sprite+reaction).padStart(2,'0'),x,GROUND+1,52,person.lit?1:.66);
      if(person.lit)this.light(x+15,GROUND-47,colour,.65,.45);
    }

    for(const item of (scene.kind==='garden'?state.lights||[]:[])){
      if(item.taken)continue;
      this.light(item.x-camera,item.y+Math.sin(this.t*1.45+item.x)*3,item.color,1.08);
    }

    // Enmanuel permanece completamente invisible durante el trayecto. La luz
    // y pequeñas alteraciones del entorno marcan que pasó por allí.
    if(state.guide&&!state.guideSolid){
      const x=state.guide.x-camera;
      const flicker=.15+Math.sin(this.t*2.2)*.05;
      this.glow(x,GROUND-15,31,'#9fe3c8',flicker);
      for(let step=0;step<3;step++){
        const sx=x-step*14-6;
        const alpha=clamp(1-step*.27,0,1)*(.2+this.pulse*.1);
        g.globalAlpha=alpha;
        this.r(sx,GROUND-2-(step%2),4,1,'#bcebd8');
      }
      g.globalAlpha=1;
    }

    if(state.guideSolid&&state.guide){
      const x=state.guide.x-camera;
      this.glow(x,GROUND-30,55,'#ffd7a0',.22);
      this.r(x-9,GROUND+1,19,2,'#1a253866');
      this.actor('enmanuel',x,GROUND,{walk:false,dir:state.guide.dir||-1,phase:0});
      this.sp('sobre',x-15,GROUND-51,19);
    }

    const player=state.player;
    this.r(player.x-camera-11,GROUND+1,23,2,'#0b172766');
    this.actor('genesis',player.x-camera,GROUND,{
      walk:player.walking,
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
    if(state.flame)this.light(state.flameX-camera,state.flameY,'#ffd18d',1.16);

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
