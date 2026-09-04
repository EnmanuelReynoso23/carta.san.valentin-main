// Las reglas del juego sin pantalla: matemáticas, la física del salto, el mapa
// sólido de cada acto y el guardado. Nada de aquí toca el DOM, así que la
// partida entera se puede jugar y comprobar en Node.
export const W=480,H=270,GROUND=224;
// El panel de conversación tapa la parte baja: el mundo sube un poco mientras
// alguien habla y por eso los fondos se dibujan más altos.
export const LIFT_MAX=90;

export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const positiveMod=(n,d)=>((n%d)+d)%d;
export const approach=(value,target,step)=>value<target?Math.min(target,value+step):Math.max(target,value-step);
export function seeded(seed=7){return ()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};}
export function regularBeat(seconds,bpm=120,offset=0){return (seconds-offset)*bpm/60;}

// Génesis corre, salta y cae con estos números. El salto sube 45 píxeles: todas
// las plataformas del juego están por debajo de esa altura, siempre alcanzables.
export const PHYSICS={speed:112,accel:900,friction:1150,gravity:620,jump:236,fallMax:300,coyote:.12,buffer:.15,half:9,reach:24};
export const JUMP_HEIGHT=PHYSICS.jump**2/(2*PHYSICS.gravity);

/** Suelo y plataformas de un acto: el suelo se parte donde el acto tiene huecos. */
export function platforms(act){
  const solids=[];let x=0;
  for(const [from,to] of [...(act.gaps||[])].sort((a,b)=>a[0]-b[0])){
    if(from>x)solids.push({x,y:GROUND,w:from-x,kind:'suelo'});
    x=Math.max(x,to);
  }
  if(x<act.width)solids.push({x,y:GROUND,w:act.width-x,kind:'suelo'});
  for(const p of act.platforms||[])solids.push({kind:'tabla',...p});
  return solids;
}
/** Plataforma que se cruza al bajar de fromY a toY en esa columna. */
export function landingUnder(solids,x,fromY,toY){
  let top=null;
  for(const p of solids){
    if(x<p.x||x>p.x+p.w||p.y<fromY-1.5||p.y>toY)continue;
    if(top===null||p.y<top)top=p.y;
  }
  return top;
}
/** Altura del apoyo bajo unos pies, si lo hay a menos de `tolerance`. */
export function supportAt(solids,x,feetY,tolerance=4){
  let top=null;
  for(const p of solids){
    if(x<p.x||x>p.x+p.w||p.y<feetY-tolerance||p.y>feetY+tolerance)continue;
    if(top===null||p.y<top)top=p.y;
  }
  return top;
}
/** ¿Se acaba el suelo justo delante? Sirve para saltar los arroyos a tiempo. */
export function gapAhead(solids,x,dir,feetY,reach=22){
  return supportAt(solids,x+dir*reach,feetY,10)===null;
}

export function makeBody(x,y=GROUND){return {x,y,vx:0,vy:0,dir:1,phase:0,onGround:true,coyote:0,buffer:0,walking:false,jumping:false};}

/**
 * Un paso de física. `intent` es {left,right,jump}: `jump` sólo va en true el
 * fotograma en que se pulsa, y el juego lo recuerda un instante (buffer) y
 * perdona un instante tras salir de un borde (coyote). Devuelve 'caida' si se
 * salió del mundo, para devolverla al último suelo firme sin castigo.
 */
export function stepBody(body,intent,solids,dt,bounds){
  const p=PHYSICS,dir=(intent.right?1:0)-(intent.left?1:0);
  if(dir)body.vx=approach(body.vx,dir*p.speed,p.accel*dt);
  else body.vx=approach(body.vx,0,p.friction*dt);
  body.coyote=body.onGround?p.coyote:Math.max(0,body.coyote-dt);
  body.buffer=intent.jump?p.buffer:Math.max(0,body.buffer-dt);
  let jumped=false;
  if(body.buffer>0&&body.coyote>0){body.vy=-p.jump;body.onGround=false;body.coyote=0;body.buffer=0;jumped=true;}
  body.vy=Math.min(p.fallMax,body.vy+p.gravity*dt);
  const beforeX=body.x,beforeY=body.y;
  body.x=clamp(body.x+body.vx*dt,bounds.min,bounds.max);
  if(body.x===beforeX)body.vx=0;
  body.y+=body.vy*dt;
  body.onGround=false;
  if(body.vy>=0){
    const landing=landingUnder(solids,body.x,beforeY,body.y);
    if(landing!==null){body.y=landing;body.vy=0;body.onGround=true;}
  }
  if(dir)body.dir=dir;
  body.walking=body.onGround&&Math.abs(body.vx)>6;
  body.jumping=!body.onGround;
  body.phase+=Math.abs(body.x-beforeX)/9;
  return body.y>H+70?'caida':jumped?'salto':null;
}
/** Suelo firme más cercano donde volver a dejarla si se cae por un hueco. */
export function safeSpot(solids,x){
  const floors=solids.filter(p=>p.kind==='suelo'&&p.w>40);
  if(!floors.length)return {x,y:GROUND};
  let best=floors[0],bestDistance=Infinity;
  for(const p of floors){
    const cx=clamp(x,p.x+14,p.x+p.w-14),d=Math.abs(cx-x);
    if(d<bestDistance){bestDistance=d;best=p;}
  }
  return {x:clamp(x,best.x+14,best.x+best.w-14),y:best.y};
}

export const SAVE_VERSION=4;
/**
 * Un guardado sólo vale si describe un viaje posible: no se sale del jardín sin
 * las cinco luces ni se reparte más luz de la que se lleva encima.
 */
export function validSave(raw,{acts=5,lights=5,people=4}={}){
  if(!raw||raw.version!==SAVE_VERSION)return null;
  if(!Number.isInteger(raw.act)||raw.act<0||raw.act>=acts)return null;
  if(!Array.isArray(raw.lights)||!Array.isArray(raw.given))return null;
  if(raw.lights.some(i=>!Number.isInteger(i)||i<0||i>=lights))return null;
  if(raw.given.some(i=>!Number.isInteger(i)||i<0||i>=people))return null;
  const taken=[...new Set(raw.lights)].sort((a,b)=>a-b),given=[...new Set(raw.given)].sort((a,b)=>a-b);
  if(raw.act<2&&taken.length)return null;
  if(raw.act<3&&given.length)return null;
  if(raw.act>2&&taken.length!==lights)return null;
  if(raw.act>3&&given.length!==people)return null;
  if(given.length>taken.length)return null;
  if(raw.finished&&raw.act!==acts-1)return null;
  return {version:SAVE_VERSION,act:raw.act,lights:taken,given,finished:!!raw.finished};
}

/** El texto se escribe solo; con movimiento suave aparece entero de una vez. */
export class Dialogue{
  constructor(speed=44){this.speed=speed;this.queue=[];this.line=null;this.chars=0;this.held=0;this.instant=false;}
  get active(){return this.line!==null;}
  get done(){return !this.line||this.chars>=this.line.text.length;}
  get visible(){return this.line?this.line.text.slice(0,Math.ceil(this.chars)):'';}
  play(lines){this.queue=[...lines];this.shift();return this;}
  shift(){this.line=this.queue.shift()||null;this.chars=this.instant&&this.line?this.line.text.length:0;this.held=0;return this.line;}
  update(dt){
    if(!this.line)return;
    if(this.instant)this.chars=this.line.text.length;else this.chars=Math.min(this.line.text.length,this.chars+this.speed*dt);
    if(this.done)this.held+=dt;
  }
  /** Un toque completa la frase; el siguiente pasa a la que viene. */
  advance(){
    if(!this.line)return false;
    if(!this.done){this.chars=this.line.text.length;return true;}
    this.shift();return true;
  }
  clear(){this.queue=[];this.line=null;this.chars=0;this.held=0;}
}
/** Cuánto se queda una frase en pantalla cuando la historia se cuenta sola. */
export function readSeconds(text,speed=44){return text.length/speed+.95+text.length*.021;}
