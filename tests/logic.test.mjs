import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ACTS,LIGHTS,LETTER} from '../src/story.js';
import {Game} from '../src/game.js';
import {Director} from '../src/auto.js';
import {platforms,supportAt,stepBody,makeBody,safeSpot,validSave,Dialogue,gapAhead,
        GROUND,JUMP_HEIGHT,SAVE_VERSION,regularBeat} from '../src/logic.js';
import {VIDEO_ID} from '../src/audio.js';

const PICKUP=30,CENTRE=22;
/** Juega la aventura entera con el mismo mando virtual del modo historia. */
function jugarSola({pace=1.1,limite=1200}={}){
  const dicho=[],avisos=[];
  const game=new Game({emit:(kind,data)=>{if(kind==='talk'&&data)dicho.push(data.text);if(kind==='toast')avisos.push(data);}});
  game.begin();
  const director=new Director({pace});
  let segundos=0;
  const dt=1/60;
  while(game.state.mode!=='ending'&&segundos<limite){
    game.update(dt,director.intent(game,dt));
    segundos+=dt;
  }
  return {game,segundos,dicho,avisos,fin:game.snapshot()};
}

test('la canción enlazada es la que se incrusta',()=>assert.equal(VIDEO_ID,'gCS3ow7lSZA'));

test('el suelo sostiene cada cosa que hay que tocar, y las salidas también',()=>{
  for(const act of ACTS){
    const solids=platforms(act);
    const puntos=[act.spawn,...(act.triggers||[]).filter(t=>t.x!==undefined).map(t=>t.x),
      ...(act.props||[]).map(p=>p.x),...(act.people||[]).map(p=>p.x)];
    if(act.exit)puntos.push(act.exit.x);
    for(const x of puntos)assert.notEqual(supportAt(solids,x,GROUND,4),null,act.id+' sin suelo en '+x);
    for(const [from,to] of act.gaps||[]){
      assert.ok(to-from<=60,act.id+': el hueco de '+from+' mide más de lo que salta');
      assert.ok(!puntos.some(x=>x>from&&x<to),act.id+': hay algo que tocar sobre el vacío');
    }
  }
});

test('todas las luces del camino se alcanzan de un salto',()=>{
  const act=ACTS.find(a=>a.id==='garden'),solids=platforms(act);
  assert.equal(act.lights.length,LIGHTS.length);
  for(const light of act.lights){
    const apoyo=[GROUND,...solids.filter(p=>Math.abs(p.x+p.w/2-light.x)<90).map(p=>p.y)];
    const alcance=Math.min(...apoyo.map(y=>y-JUMP_HEIGHT-CENTRE-PICKUP));
    assert.ok(light.y>=alcance,'la luz de '+light.x+' queda demasiado alta ('+light.y+' < '+alcance.toFixed(1)+')');
  }
});

test('el salto sube lo prometido y aterriza sobre las plataformas',()=>{
  const solids=[{x:0,y:GROUND,w:400,kind:'suelo'},{x:200,y:GROUND-34,w:60,kind:'caja'}];
  const body=makeBody(150),bounds={min:10,max:390};
  let alto=GROUND,encimaDeLaCaja=false;
  stepBody(body,{jump:true,right:true},solids,1/60,bounds);
  for(let i=0;i<70;i++){
    stepBody(body,{right:true},solids,1/60,bounds);
    alto=Math.min(alto,body.y);
    if(body.onGround&&body.y===GROUND-34)encimaDeLaCaja=true;
  }
  assert.ok(Math.abs((GROUND-alto)-JUMP_HEIGHT)<3,'subió '+(GROUND-alto).toFixed(1)+' y esperaba '+JUMP_HEIGHT.toFixed(1));
  assert.ok(encimaDeLaCaja,'tenía que aterrizar sobre la caja');
  // Y al pasarse de largo vuelve al suelo, sin quedarse flotando.
  for(let i=0;i<120;i++)stepBody(body,{right:true},solids,1/60,bounds);
  assert.equal(body.y,GROUND);
  assert.equal(body.onGround,true);
});

test('caerse por un hueco se avisa y devuelve a suelo firme, sin castigo',()=>{
  const act={width:400,gaps:[[180,240]],platforms:[]};
  const solids=platforms(act);
  assert.ok(gapAhead(solids,170,1,GROUND),'el suelo se acaba delante de 170');
  assert.ok(!gapAhead(solids,100,1,GROUND),'a mitad del suelo no hay hueco');
  const body=makeBody(205);body.y=GROUND-2;
  let resultado=null;
  for(let i=0;i<200&&resultado!=='caida';i++)resultado=stepBody(body,{},solids,1/60,{min:10,max:390});
  assert.equal(resultado,'caida');
  const sitio=safeSpot(solids,body.x);
  assert.notEqual(supportAt(solids,sitio.x,sitio.y,2),null,'el sitio de vuelta tiene suelo');
});

test('el guardado sólo acepta viajes posibles',()=>{
  const bueno={version:SAVE_VERSION,act:3,lights:[0,1,2,3,4],given:[0,1]};
  assert.deepEqual(validSave(bueno).given,[0,1]);
  assert.equal(validSave({...bueno,version:3}),null,'otra versión no vale');
  assert.equal(validSave({...bueno,lights:[0,1]}),null,'no se sale del jardín sin todas las luces');
  assert.equal(validSave({version:SAVE_VERSION,act:1,lights:[0],given:[]}),null,'aún no había luces que recoger');
  assert.equal(validSave({version:SAVE_VERSION,act:0,lights:[],given:[],finished:true}),null,'no se termina en el primer acto');
  assert.deepEqual(validSave({...bueno,lights:[4,0,1,2,3,3]}).lights,[0,1,2,3,4],'sin repetidas y en orden');
});

test('el texto se escribe solo y un toque lo completa antes de pasar',()=>{
  const dialogo=new Dialogue(40).play([{who:'Luz',text:'Hola Génesis'},{who:'Génesis',text:'Hola'}]);
  dialogo.update(.1);
  assert.ok(dialogo.visible.length<12&&!dialogo.done);
  dialogo.advance();
  assert.equal(dialogo.visible,'Hola Génesis','el primer toque enseña la frase entera');
  dialogo.advance();
  assert.equal(dialogo.line.who,'Génesis','el segundo pasa a la siguiente');
  dialogo.advance();dialogo.advance();
  assert.equal(dialogo.active,false);
});

test('la puerta cerrada no deja pasar y el deseo la abre',()=>{
  const game=new Game();game.begin();
  for(let i=0;i<600;i++)game.update(1/60,{right:true,action:i%20===0});
  assert.equal(game.state.actIndex,0,'sin pedir el deseo no se sale del cuarto');
  assert.ok(game.state.player.x<=ACTS[0].exit.x+6,'la puerta la detiene');
  const deseo=game.state.props.find(p=>p.key);
  game.state.player.x=deseo.x;
  game.interact();
  while(game.dialogue.active)game.update(1/60,{action:true});
  assert.equal(game.state.doorOpen,true);
  for(let i=0;i<400&&game.state.actIndex===0;i++)game.update(1/60,{right:true});
  assert.equal(game.state.actIndex,1,'con la puerta abierta sale a la calle');
});

test('del jardín no se sale sin las cinco luces, pero saltando se recogen todas',()=>{
  const game=new Game();game.begin({version:SAVE_VERSION,act:2,lights:[],given:[],finished:false});
  // Andando en línea recta sólo caen las que están a la altura de la mano.
  for(let i=0;i<3600;i++)game.update(1/60,{right:true,action:i%12===0});
  assert.equal(game.state.actIndex,2,'la salida no se abre a medias');
  assert.ok(game.state.taken.length<5,'las luces del aire piden un salto');
  assert.ok(game.state.player.x<=ACTS[2].exit.x+6,'la salida la detiene');
  // Con saltos, las cinco.
  const director=new Director();
  for(let i=0;i<7200&&game.state.actIndex===2;i++)game.update(1/60,director.intent(game,1/60));
  assert.equal(game.state.taken.length,5,'saltando se recogen las cinco');
  assert.equal(game.state.actIndex,3,'y entonces sí se sale hacia la plaza');
});

test('la historia se cuenta sola de principio a fin, sin saltarse una frase',()=>{
  const {game,segundos,dicho,fin}=jugarSola();
  const guion=[];
  for(const act of ACTS){
    for(const trigger of act.triggers||[])guion.push(...trigger.talk.map(l=>l.text));
    for(const prop of act.props||[])guion.push(...prop.talk.map(l=>l.text));
    for(const person of act.people||[])guion.push(...person.talk.map(l=>l.text));
  }
  assert.equal(fin.mode,'ending','tiene que llegar a la carta: '+JSON.stringify(fin));
  assert.equal(fin.lights,5);
  assert.equal(fin.given,4);
  assert.equal(fin.carried,1,'se guarda una luz para mañana, como prometió');
  assert.equal(game.state.falls,0,'nadie se cae por el arroyo');
  assert.deepEqual(guion.filter(text=>!dicho.includes(text)),[],'quedaron frases sin decir');
  assert.ok(segundos>150&&segundos<270,'dura como la canción, y midió '+segundos.toFixed(0)+'s');
});

test('continuar un viaje guardado devuelve las luces que quedaban',()=>{
  const game=new Game();
  game.begin({version:SAVE_VERSION,act:3,lights:[0,1,2,3,4],given:[0,1],finished:false});
  assert.equal(game.state.actIndex,3);
  assert.equal(game.state.carried.length,3,'quedan tres luces por repartir');
  assert.deepEqual(game.state.people.filter(p=>p.lit).map(p=>p.index),[0,1]);
  assert.equal(game.state.doorOpen,true,'la puerta del cuarto ya estaba abierta');
});

test('la carta llega entera y cada luz tiene nombre y color propios',()=>{
  assert.equal(LETTER.length,5);
  for(const parrafo of LETTER)assert.ok(parrafo.trim().length>60);
  assert.equal(new Set(LIGHTS.map(l=>l.color)).size,LIGHTS.length);
  assert.equal(new Set(LIGHTS.map(l=>l.name)).size,LIGHTS.length);
  assert.match(LETTER.at(-1),/Feliz cumpleaños/);
});

test('los recortes de los personajes aíslan la figura y anclan los pies',async()=>{
  const atlas=JSON.parse(await readFile(new URL('../assets/characters.json',import.meta.url),'utf8'));
  for(const name of ['genesis','enmanuel']){
    assert.equal(atlas[name].length,16);
    for(const f of atlas[name]){
      assert.ok(f.x>=0&&f.y>=0&&f.x+f.w<=1254&&f.y+f.h<=1254);
      assert.ok(f.pivotX>0&&f.pivotX<f.w);
      assert.equal(f.pivotY,f.h);
    }
  }
  assert.ok(atlas.genesis[0].h>314,'la pose quieta conserva los pies');
});

test('el compás de la melodía de respaldo cuenta bien los segundos',()=>{
  assert.equal(regularBeat(1.25,120,.25),2);
  assert.equal(regularBeat(0,120,0),0);
  assert.equal(regularBeat(30,120),60);
});
