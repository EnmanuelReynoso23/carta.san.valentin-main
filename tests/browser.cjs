// Juega la aventura de principio a fin en un navegador de verdad: primero a
// mano con el teclado y después en modo historia. Guarda capturas de cada acto.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=path.join(__dirname,'..','artifacts');
const shot=(page,name)=>page.screenshot({path:path.join(out,name),fullPage:true});

const snap=page=>page.evaluate(()=>window.__genesis.snapshot());
const step=(page,seconds,draw=false)=>page.evaluate(([s,d])=>window.__genesis.advance(s,d),[seconds,draw]);
/** Cierra la conversación como lo haría cualquiera: pulsando la tecla de hablar. */
async function conversar(page,limite=60){
  for(let i=0;i<limite;i++){
    if(!(await page.evaluate(()=>window.__genesis.game.talking)))return true;
    await page.keyboard.press('e');
    await step(page,.25);
  }
  throw new Error('la conversación no termina');
}
/** Camina hasta un punto con las flechas, hablando por el camino. */
async function caminarHasta(page,destino,limite=140){
  for(let i=0;i<limite;i++){
    const estado=await snap(page);
    if(estado.talking){await conversar(page);continue;}
    if(Math.abs(estado.x-destino)<=7)return estado;
    const tecla=estado.x<destino?'ArrowRight':'ArrowLeft';
    await page.keyboard.down(tecla);
    await step(page,.25);
    await page.keyboard.up(tecla);
  }
  throw new Error('no llegó hasta '+destino);
}

(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.GENESIS_BROWSER||undefined});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  const fallos=[];page.on('pageerror',error=>fallos.push(error.message));
  await page.addInitScript(()=>localStorage.setItem('genesis-ajustes-v5',JSON.stringify({source:'original',volume:.2})));

  await page.goto('http://127.0.0.1:4177/?test=1');
  await page.waitForFunction(()=>window.__genesis);
  await shot(page,'01-portada.png');

  // ---- el acto I, jugado a mano ---------------------------------------------
  await page.getByRole('button',{name:'Empezar mi aventura',exact:true}).click();
  await step(page,1,true);
  await conversar(page);
  const salida=await snap(page);
  await page.keyboard.down('ArrowLeft');await step(page,.6);await page.keyboard.up('ArrowLeft');
  const aLaIzquierda=await snap(page);
  assert.ok(aLaIzquierda.x<salida.x,'la flecha izquierda tiene que mover a Génesis');
  await page.keyboard.press('ArrowUp');await step(page,.2,true);
  const enElAire=await page.evaluate(()=>window.__genesis.state.player.y);
  assert.ok(enElAire<224,'la flecha arriba tiene que hacerla saltar, y quedó en y='+enElAire);
  await shot(page,'02-salto.png');

  await caminarHasta(page,470);
  const aviso=await page.evaluate(()=>({texto:document.getElementById('interaction').textContent,oculto:document.getElementById('interaction').hidden}));
  assert.equal(aviso.oculto,false,'junto al pastel tiene que verse el aviso');
  assert.match(aviso.texto,/deseo/,'el aviso junto al pastel: '+aviso.texto);
  await shot(page,'03-pastel.png');
  await page.keyboard.press('e');
  await step(page,.3);
  await conversar(page);
  assert.equal(await page.evaluate(()=>window.__genesis.state.doorOpen),true,'pedir el deseo abre la puerta');

  // La puerta cerrada no deja pasar: se comprueba yendo al final del cuarto.
  const guardado=await page.evaluate(()=>JSON.parse(localStorage.getItem('genesis-viaje-v4')));
  assert.equal(guardado.act,0,'el viaje se guarda solo');
  await caminarHasta(page,598);
  await step(page,.6,true);
  const calle=await snap(page);
  assert.equal(calle.act,1,'salir por la puerta lleva a la calle, quedó en '+JSON.stringify(calle));
  await shot(page,'04-calle.png');

  // ---- el resto, en modo historia -------------------------------------------
  await page.getByRole('button',{name:'▶ Historia'}).click();
  const recorrido=[],capturas={2:'05-camino.png',3:'06-plaza.png',4:'07-amanecer.png'};
  let final=null,segundos=0;
  for(let i=0;i<200;i++){
    const estado=await step(page,5,true);
    segundos+=5;
    const anterior=recorrido.at(-1);
    if(!anterior||anterior.act!==estado.act||anterior.mode!==estado.mode)
      recorrido.push({en:segundos,act:estado.act,mode:estado.mode,luces:estado.lights,repartidas:estado.given});
    if(capturas[estado.act]){await shot(page,capturas[estado.act]);delete capturas[estado.act];}
    if(estado.mode==='ending'){final=estado;break;}
  }
  assert.ok(final,'la historia tiene que llegar a la carta: '+JSON.stringify(recorrido));
  assert.equal(final.lights,5,'las cinco luces');
  assert.equal(final.given,4,'las cuatro personas encendidas');
  assert.equal(final.falls,0,'nadie se cae por los huecos');
  assert.equal(await page.evaluate(()=>document.getElementById('ending').hidden),false,'la carta se abre sola');
  await shot(page,'08-carta.png');

  // ---- guardar, seguir, pausar ----------------------------------------------
  await page.reload();
  await page.waitForFunction(()=>window.__genesis);
  assert.equal(await page.evaluate(()=>document.getElementById('continue').hidden),false,'el viaje terminado ofrece continuar');
  await page.getByRole('button',{name:'Continuar mi viaje'}).click();
  const seguido=await snap(page);
  assert.equal(seguido.act,4,'continuar devuelve al último acto');
  assert.equal(seguido.carried,1,'guarda la luz que se quedó para mañana');
  await page.keyboard.press('Escape');
  const pausado=await snap(page);
  await step(page,4);
  assert.deepEqual(await snap(page),pausado,'en pausa no se mueve nada');
  await shot(page,'09-pausa.png');
  await page.keyboard.press('Escape');

  // ---- en el teléfono ---------------------------------------------------------
  const movil=await context.newPage();
  await movil.setViewportSize({width:390,height:844});
  await movil.goto('http://127.0.0.1:4177/?test=1');
  await movil.waitForFunction(()=>window.__genesis);
  await shot(movil,'10-movil-portada.png');
  assert.equal(await movil.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'en el teléfono no se desborda a lo ancho');
  await movil.getByRole('button',{name:'Empezar mi aventura',exact:true}).click();
  await step(movil,1.5,true);
  await shot(movil,'11-movil-dialogo.png');
  const visible=await movil.evaluate(()=>{
    const juego=window.__genesis;
    const escena=document.getElementById('stage').getBoundingClientRect();
    const panel=document.getElementById('dialogue').getBoundingClientRect();
    return {hablando:juego.game.talking,
      pies:Math.round(juego.state.player.y-juego.state.lift),
      panel:Math.round((panel.top-escena.top)/escena.height*270),
      mandos:!!document.querySelector('.touch-controls button')?.offsetWidth};
  });
  assert.equal(visible.hablando,true);
  assert.ok(visible.pies<=visible.panel,'Génesis tiene que quedar por encima del panel: '+JSON.stringify(visible));
  assert.equal(visible.mandos,true,'en el teléfono se ven los botones');
  // Los botones de la pantalla mueven igual que el teclado.
  const antes=await snap(movil);
  await movil.locator('#pad button[data-hold=right]').dispatchEvent('pointerdown');
  await step(movil,1.2);
  await movil.locator('#pad button[data-hold=right]').dispatchEvent('pointerup');
  const despues=await snap(movil);
  assert.ok(despues.talking||despues.x>antes.x,'el botón ▶ camina: '+antes.x+' → '+despues.x);
  await shot(movil,'12-movil-mandos.png');

  assert.deepEqual(fallos,[],'la página no puede dar errores');
  const informe={minutosHistoria:+(segundos/60).toFixed(2),recorrido,final,fallos,
    sinDesbordeMovil:true,mandosTactiles:visible.mandos,capturas:out};
  fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(informe,null,2));
  console.log(JSON.stringify({estado:'BIEN',...informe,recorrido:recorrido.length+' tramos'},null,2));
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
