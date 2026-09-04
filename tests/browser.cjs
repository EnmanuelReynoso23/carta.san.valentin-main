const {chromium}=require('playwright');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.GENESIS_BROWSER||undefined});const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();const failures=[];page.on('pageerror',err=>failures.push(err.message));
  await page.addInitScript(()=>{localStorage.setItem('genesis-music-v3',JSON.stringify({source:'original',volume:.2}));});
  const out=path.join(__dirname,'..','artifacts');fs.mkdirSync(out,{recursive:true});
  await page.goto('http://127.0.0.1:4177/?test=1');await page.waitForFunction(()=>window.__genesis);await page.screenshot({path:path.join(out,'01-portada.png'),fullPage:true});
  await page.getByRole('button',{name:'Empezar mi aventura',exact:true}).click();
  await page.evaluate(()=>window.__genesis.advance(10,true));await page.screenshot({path:path.join(out,'02-habitacion.png'),fullPage:true});
  // Complete introductory conversations using the real interaction action.
  await page.evaluate(()=>{for(let i=0;i<5;i++){window.__genesis.advance(10);window.__genesis.interact();}});
  const before=await page.evaluate(()=>window.__genesis.snapshot());
  await page.keyboard.down('a');await page.waitForTimeout(250);await page.keyboard.up('a');
  const after=await page.evaluate(()=>window.__genesis.snapshot());assert.equal(after.auto,false);assert.ok(after.x<before.x,'A must move left without toggling auto');
  await page.getByRole('button',{name:'Ver la historia',exact:true}).first().click();
  // Ten-second steps keep the story readable to the test: every scene change, every
  // fall and every screenshot lands where it belongs. Screenshots are always rewritten.
  const trail=[],falls=[];let final=null,shotChallenge=false,shotBridge=false,seconds=0;
  for(let i=0;i<220;i++){
    const s=await page.evaluate(()=>window.__genesis.advance(10,true));seconds+=10;
    const last=trail.at(-1);
    if(!last||last.mode!==s.mode||last.scene!==s.scene)trail.push({at:seconds,mode:s.mode,scene:s.scene,hearts:s.hearts.length,x:Math.round(s.x)});
    const toast=await page.evaluate(()=>{const t=document.getElementById('toast');return t.hidden?null:t.textContent;});
    if(toast&&toast.includes('Otro intento'))falls.push({scene:s.scene,x:Math.round(s.x)});
    if(s.mode==='challenge'&&!shotChallenge){shotChallenge=true;await page.screenshot({path:path.join(out,'03-corazones.png'),fullPage:true});}
    if(s.scene===3&&s.mode==='explore'&&!shotBridge){shotBridge=true;await page.screenshot({path:path.join(out,'04-puente.png'),fullPage:true});}
    if(s.mode==='ending'){final=s;break;}
  }
  if(!shotBridge)await page.screenshot({path:path.join(out,'04-puente.png'),fullPage:true});
  assert.deepEqual(falls,[],'story mode must never fall off a platform');
  assert.ok(seconds>=11*60&&seconds<=17*60,'story mode should last around 12-15 minutes, measured '+seconds+'s');
  assert.ok(final,'automatic play must reach the letter: '+JSON.stringify(trail));assert.deepEqual(final.hearts,[0,1,2,3,4,5,6]);
  await page.screenshot({path:path.join(out,'05-carta.png'),fullPage:true});
  await page.getByRole('button',{name:'Volver a mirar el cielo'}).click();await page.screenshot({path:path.join(out,'06-amanecer.png'),fullPage:true});
  await page.keyboard.press('e');await page.reload();await page.waitForFunction(()=>window.__genesis);await page.getByRole('button',{name:'Continuar mi viaje'}).click();assert.equal(await page.evaluate(()=>window.__genesis.state.mode),'ending');
  await page.getByRole('button',{name:'Empezar otra aventura'}).click();await page.getByRole('button',{name:'Ver la historia',exact:true}).last().click();
  await page.evaluate(()=>window.__genesis.advance(20));await page.keyboard.press('Escape');const paused=await page.evaluate(()=>window.__genesis.snapshot());await page.evaluate(()=>window.__genesis.advance(50));assert.deepEqual(await page.evaluate(()=>window.__genesis.snapshot()),paused);await page.keyboard.press('Escape');
  const mobile=await context.newPage();await mobile.setViewportSize({width:390,height:844});await mobile.goto('http://127.0.0.1:4177/?test=1');await mobile.waitForFunction(()=>window.__genesis);await mobile.screenshot({path:path.join(out,'07-movil.png'),fullPage:true});
  assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile layout must not overflow');
  await mobile.getByRole('button',{name:'Empezar mi aventura',exact:true}).click();await mobile.evaluate(()=>window.__genesis.advance(10,true));await mobile.screenshot({path:path.join(out,'08-movil-dialogo.png'),fullPage:true});
  const speakerVisible=await mobile.evaluate(()=>{
    const g=window.__genesis;g.advance(3,true);
    const stage=document.getElementById('stage').getBoundingClientRect(),panel=document.getElementById('dialogue').getBoundingClientRect();
    const feetInWorld=g.state.player.y-g.state.lift;
    const panelTopInWorld=(panel.top-stage.top)/stage.height*270;
    return {mode:g.state.mode,feetInWorld:Math.round(feetInWorld),panelTopInWorld:Math.round(panelTopInWorld),lift:Math.round(g.state.lift)};
  });
  assert.equal(speakerVisible.mode,'dialogue');
  assert.ok(speakerVisible.feetInWorld<=speakerVisible.panelTopInWorld,'Génesis must stand above the dialogue panel: '+JSON.stringify(speakerVisible));
  assert.deepEqual(failures,[]);fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({storyModeSeconds:seconds,automaticTrail:trail,allSevenHearts:true,reloadRestoresEnding:true,pauseFreezes:true,aDoesNotToggleAuto:true,mobileNoOverflow:true,storyModeFalls:falls,speakerVisibleAboveDialogue:speakerVisible,pageErrors:failures},null,2));
  console.log(JSON.stringify({status:'PASS',storyMinutes:+(seconds/60).toFixed(1),heartCount:final.hearts.length,pageErrors:failures,screenshots:out}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
