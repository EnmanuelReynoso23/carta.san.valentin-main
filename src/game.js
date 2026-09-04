import {ACTS,LIGHTS} from './story.js';
import {W,GROUND,clamp,lerp,platforms,stepBody,safeSpot,makeBody,
        Dialogue,validSave,SAVE_VERSION} from './logic.js';

export const SAVE_KEY='genesis-viaje-v5';
/** Cuánto ha avanzado la noche hacia el amanecer en cada acto. */
export const DAWN=[.02,.12,.3,.55,.95];
const REACH=26,LIGHT_REACH={x:22,y:30};

/**
 * El juego entero: el mundo, lo que se puede tocar y lo que se dice. No conoce
 * la pantalla ni el teclado; recibe un `input` ya interpretado y avisa de lo que
 * pasa con `emit`, así que la partida se puede jugar igual en Node que en el
 * navegador.
 */
export class Game{
  constructor({storage=null,emit=()=>{},acts=ACTS}={}){
    this.acts=acts;this.storage=storage;this.emit=()=>{};
    this.dialogue=new Dialogue();
    this.afterTalk=null;this.lockedAt=-9;
    this.state={mode:'cover',reduced:false,time:0,falls:0,auto:false};
    this.begin(null);
    this.state.mode='cover';
    this.emit=emit;
  }
  get scene(){return this.acts[this.state.actIndex];}
  get talking(){return this.dialogue.active;}
  get taken(){return this.state.taken;}

  // ---- montaje de un acto -------------------------------------------------
  enter(index,{silent=false,at=null}={}){
    const s=this.state,scene=this.acts[index];
    s.actIndex=index;s.scene=scene;
    this.solids=platforms(scene);
    this.bounds={min:14,max:scene.width-14};
    s.player=makeBody(at??scene.spawn);
    s.lights=(scene.lights||[]).map((light,index)=>({...light,index,...LIGHTS[index%LIGHTS.length],taken:(s.taken||[]).includes(index)}));
    s.people=(scene.people||[]).map((person,index)=>({...person,index,lit:(s.given||[]).includes(index)}));
    s.props=(scene.props||[]).map(prop=>({...prop,used:false}));
    s.ghost=scene.ghost?{x:scene.spawn+170,dir:1,phase:0}:scene.kind==='dawn'?{x:585,dir:-1,phase:0}:null;
    s.ghostSolid=scene.kind==='dawn';
    s.camera=clamp(s.player.x-W*.42,0,Math.max(0,scene.width-W));
    s.dawn=DAWN[index];s.doorOpen=false;s.prompt=null;s.note='';
    s.goal=scene.goal;s.lift=0;s.fade=0;
    s.flame=index>0&&index<4;s.flameX=s.player.x;s.flameY=GROUND-78;
    this.seen=new Set();this.dialogue.clear();this.afterTalk=null;
    if(!silent){this.emit('scene',scene);this.save();}
  }
  /** Empieza de cero o retoma el viaje guardado. */
  begin(saved=null){
    const s=this.state;
    s.carried=[];s.given=[];s.taken=[];s.finished=false;s.falls=0;s.particles=[];s.time=0;
    const target=saved?saved.act:0;
    if(saved){
      s.taken=[...saved.lights];s.given=[...saved.given];
      // Las luces se reparten en orden, así que las que quedan son las últimas.
      s.carried=s.taken.slice(s.given.length).map(index=>({index,...LIGHTS[index%LIGHTS.length]}));
    }
    this.enter(target,{silent:true});
    if(target>0)s.doorOpen=true;
    s.mode='play';
    this.emit('scene',this.scene);
    this.updateGoal();
    return s;
  }
  reset(){this.state.mode='cover';this.begin(null);this.state.mode='cover';}
  clearSave(){try{this.storage?.removeItem(SAVE_KEY);}catch{}}
  save(){
    if(!this.storage)return;
    const s=this.state;
    try{this.storage.setItem(SAVE_KEY,JSON.stringify({version:SAVE_VERSION,act:s.actIndex,lights:this.taken,given:s.given,finished:!!s.finished}));}catch{}
  }
  loadSave(){
    if(!this.storage)return null;
    try{return validSave(JSON.parse(this.storage.getItem(SAVE_KEY)||'null'),{acts:this.acts.length,lights:LIGHTS.length,people:4});}catch{return null;}
  }

  // ---- conversación -------------------------------------------------------
  say(lines,after=null){
    this.dialogue.instant=this.state.reduced;
    this.dialogue.play(lines);this.afterTalk=after;
    this.state.player.vx=0;
    this.emit('talk',this.dialogue.line);
  }
  advance(){
    if(!this.dialogue.active)return false;
    const before=this.dialogue.line;
    this.dialogue.advance();
    if(this.dialogue.line!==before)this.emit('talk',this.dialogue.line);
    if(!this.dialogue.active){const after=this.afterTalk;this.afterTalk=null;this.emit('talk',null);after?.();}
    return true;
  }

  // ---- objetivos ----------------------------------------------------------
  updateGoal(){
    const s=this.state,scene=this.scene;
    if(scene.id==='room')s.goal=s.doorOpen?scene.exit.goal:scene.goal;
    else if(scene.id==='garden'){
      const left=s.lights.filter(l=>!l.taken).length;
      s.goal=left?'Recoge tus luces · '+(s.lights.length-left)+'/'+s.lights.length:scene.exit.goal;
    }else if(scene.id==='plaza'){
      const left=s.people.filter(p=>!p.lit).length;
      s.goal=left?'Reparte tu luz · '+(s.people.length-left)+'/'+s.people.length:scene.exit.goal;
    }else s.goal=scene.goal;
    this.emit('goal',s.goal);
  }
  /** Lo siguiente que hay que hacer. Lo usan la flecha guía y el modo historia. */
  objective(){
    const s=this.state,scene=this.scene;
    if(this.dialogue.active||s.mode!=='play')return null;
    if(scene.id==='room'&&!s.doorOpen){const cake=s.props.find(p=>p.key);return {x:cake.x,y:GROUND,action:true,reach:REACH-8};}
    if(scene.id==='garden'){
      const next=s.lights.filter(l=>!l.taken).sort((a,b)=>Math.abs(a.x-s.player.x)-Math.abs(b.x-s.player.x))[0];
      if(next)return {x:next.x,y:next.y,pickup:true,reach:6};
    }
    if(scene.id==='plaza'){
      const next=s.people.filter(p=>!p.lit).sort((a,b)=>a.x-b.x)[0];
      if(next)return {x:next.x,y:GROUND,action:true,reach:REACH-8};
    }
    if(scene.id==='dawn'){const him=s.props.find(p=>p.key);if(!him.used)return {x:him.x,y:GROUND,action:true,reach:REACH-8};return null;}
    return scene.exit?{x:scene.exit.x,y:GROUND,reach:4}:null;
  }
  /** Lo que se puede tocar desde donde está: sale como aviso en pantalla. */
  nearby(){
    const s=this.state,player=s.player;
    if(!player.onGround)return null;
    const options=[...s.props.filter(p=>!p.used),...s.people.filter(p=>!p.lit&&s.carried.length)];
    let best=null;
    for(const item of options){
      const distance=Math.abs(item.x-player.x);
      if(distance>REACH)continue;
      if(!best||distance<Math.abs(best.x-player.x))best=item;
    }
    return best;
  }
  interact(){
    const s=this.state,item=this.nearby();
    if(!item)return false;
    if(s.people.includes(item)){
      const given=s.carried.shift();
      item.lit=true;s.given.push(item.index);
      this.sparkle(item.x,GROUND-32,given?.color||'#ffd8a2',18);
      this.emit('give',{person:item,light:given});
      this.note('Le dejaste '+given.name+'.');
      this.say(item.talk,()=>{this.updateGoal();this.save();});
      this.updateGoal();
      return true;
    }
    item.used=true;
    if(item.key&&this.scene.id==='room')this.say(item.talk,()=>this.wish());
    else if(item.key&&this.scene.id==='dawn')this.say(item.talk,()=>this.finish());
    else this.say(item.talk);
    this.emit('interact',item);
    return true;
  }
  wish(){
    const s=this.state;
    s.doorOpen=true;s.flame=true;s.flameX=470;s.flameY=150;
    this.sparkle(470,150,'#ffce8a',26);
    this.emit('wish');this.note('La puerta se abrió sola.');
    this.updateGoal();this.save();
  }
  finish(){
    const s=this.state;
    s.finished=true;s.mode='ending';s.flame=false;
    this.save();this.emit('end');
  }
  note(text){this.state.note=text;this.emit('note',text);}
  toast(text){this.emit('toast',text);}
  sparkle(x,y,color,count=22){
    const list=this.state.particles;
    for(let i=0;i<count;i++)list.push({x,y,vx:(Math.random()-.5)*44,vy:-18-Math.random()*46,life:1.3,color});
  }

  // ---- vida del mundo -----------------------------------------------------
  update(dt,input={}){
    const s=this.state;
    s.time+=dt;
    for(const p of s.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=52*dt;p.life-=dt;}
    if(s.particles.length)s.particles=s.particles.filter(p=>p.life>0);
    if(s.mode!=='play'){s.prompt=null;return;}
    if(s.fade>0)s.fade=Math.max(0,s.fade-dt*1.6);

    const scene=this.scene,player=s.player;
    if(this.dialogue.active){
      this.dialogue.update(dt);
      if(input.action)this.advance();
      stepBody(player,{},this.solids,dt,this.bounds);
      s.prompt=null;
    }else{
      const locked=scene.exit&&!this.exitOpen();
      const bounds=locked?{min:this.bounds.min,max:Math.min(this.bounds.max,scene.exit.x+4)}:this.bounds;
      const result=stepBody(player,input,this.solids,dt,bounds);
      if(result==='caida')this.recover();
      if(result==='salto')this.emit('jump');
      this.pickups();
      this.checkTriggers();
      const item=this.nearby();
      s.prompt=item?{text:item.prompt,x:item.x,y:GROUND-60}:null;
      if(input.action&&item)this.interact();
      this.checkExit(locked);
    }
    this.follow(dt);
  }
  recover(){
    const s=this.state,spot=safeSpot(this.solids,s.player.x);
    s.player.x=spot.x;s.player.y=spot.y-1;s.player.vx=0;s.player.vy=0;s.falls++;
    this.toast('Otra vez, sin prisa.');
  }
  pickups(){
    const s=this.state,player=s.player,centre=player.y-22;
    for(const light of s.lights){
      if(light.taken||Math.abs(light.x-player.x)>LIGHT_REACH.x||Math.abs(light.y-centre)>LIGHT_REACH.y)continue;
      light.taken=true;s.taken.push(light.index);s.carried.push({...light});
      this.sparkle(light.x,light.y,light.color);
      this.emit('pickup',light);
      this.note('Recogiste '+light.name+'.');
      this.updateGoal();this.save();
    }
  }
  checkTriggers(){
    const s=this.state;
    for(const trigger of this.scene.triggers||[]){
      if(this.seen.has(trigger.id))continue;
      const hit=trigger.x!==undefined?s.player.x>=trigger.x
        :trigger.lights!==undefined?this.taken.length>=trigger.lights
        :trigger.given!==undefined?s.given.length>=trigger.given:false;
      if(!hit)continue;
      this.seen.add(trigger.id);this.say(trigger.talk);return;
    }
  }
  exitOpen(){
    const s=this.state,exit=this.scene.exit;
    if(!exit?.needs)return true;
    if(exit.needs==='pastel')return s.doorOpen;
    if(exit.needs==='lights')return s.lights.every(l=>l.taken);
    if(exit.needs==='people')return s.people.every(p=>p.lit);
    return true;
  }
  checkExit(locked){
    const s=this.state,exit=this.scene.exit;
    if(!exit||s.player.x<exit.x-2)return;
    if(locked){
      if(s.time-this.lockedAt>3){this.lockedAt=s.time;this.toast(exit.locked||'Todavía no.');}
      return;
    }
    if(s.actIndex>=this.acts.length-1)return;
    const next=s.actIndex+1;
    this.enter(next);
    s.fade=1;
    this.updateGoal();
  }
  /** Cámara, cielo, la lucecita y el chico que va siempre por delante. */
  follow(dt){
    const s=this.state,scene=this.scene,player=s.player;
    const target=clamp(player.x-W*.42,0,Math.max(0,scene.width-W));
    s.camera=lerp(s.camera,target,1-Math.exp(-dt*6));
    const inside=clamp(player.x/Math.max(1,scene.width),0,1);
    s.dawn=lerp(DAWN[s.actIndex],DAWN[Math.min(s.actIndex+1,DAWN.length-1)],inside);
    s.progress=(s.actIndex+inside)/this.acts.length;
    if(scene.ghost&&s.ghost){
      const ahead=clamp(player.x+164,scene.spawn+150,scene.width-36);
      const next=Math.max(s.ghost.x,ahead);
      s.ghost.phase+=Math.abs(next-s.ghost.x)/9+dt*1.4;
      s.ghost.x=next;s.ghost.dir=1;
    }
    if(s.flame){
      const goal=scene.id==='room'&&!this.dialogue.active&&s.doorOpen?{x:player.x+player.dir*24,y:player.y-84}:
        scene.id==='room'?{x:s.flameX,y:s.flameY}:{x:player.x+player.dir*26,y:player.y-78+Math.sin(s.time*1.6)*4};
      s.flameX=lerp(s.flameX,goal.x,1-Math.exp(-dt*4));
      s.flameY=lerp(s.flameY,goal.y,1-Math.exp(-dt*4));
    }
  }
  snapshot(){
    const s=this.state;
    return {mode:s.mode,act:s.actIndex,id:this.scene.id,x:Math.round(s.player.x),y:Math.round(s.player.y),
      lights:this.taken.length,carried:s.carried.length,given:s.given.length,falls:s.falls,
      talking:this.dialogue.active,speaker:this.dialogue.line?.who||'',line:this.dialogue.visible,
      goal:s.goal,progress:+(s.progress||0).toFixed(3)};
  }
}
