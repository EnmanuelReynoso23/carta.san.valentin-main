const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const base=process.env.GENESIS_BASE_URL||'http://127.0.0.1:4177';

(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.GENESIS_BROWSER||undefined});
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await context.newPage();
  const failures=[];
  page.on('pageerror',error=>failures.push(error.message));
  await page.addInitScript(()=>{
    localStorage.setItem('genesis-musica-v6',JSON.stringify({source:'local',volume:.2,muted:true,reduced:false}));
  });

  const output=path.join(__dirname,'..','artifacts');
  fs.mkdirSync(output,{recursive:true});
  await page.goto(base+'/?test=1');
  await page.waitForFunction(()=>window.__genesis);
  await page.screenshot({path:path.join(output,'01-portada.png')});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),true);

  await page.getByRole('button',{name:'Empezar la historia',exact:true}).click();
  await page.evaluate(()=>window.__genesis.advance(7,true));
  await page.screenshot({path:path.join(output,'02-habitacion.png')});

  const seen=new Set();
  const guideVisibility=[];
  const guestOrder={};
  const guests=['Simón','Nora','Lía','Mateo','Abril','Joel'];
  let final=null;
  for(let elapsed=7;elapsed<=205;elapsed+=2){
    const snapshot=await page.evaluate(()=>window.__genesis.advance(2,true));
    seen.add(snapshot.scene);
    if(snapshot.scene!=='dawn')guideVisibility.push(snapshot.guideVisible);
    if(snapshot.line&&guests.includes(snapshot.speaker)&&guestOrder[snapshot.speaker]===undefined){
      guestOrder[snapshot.speaker]=snapshot.people;
    }
    if(['alley','street','garden','bridge','plaza','dawn'].includes(snapshot.scene)&&
      !fs.existsSync(path.join(output,'scene-'+snapshot.scene+'.png'))){
      await page.screenshot({path:path.join(output,'scene-'+snapshot.scene+'.png')});
    }
    if(snapshot.mode==='ending'){final=snapshot;break;}
  }
  assert.deepEqual([...seen].sort(),['alley','bridge','dawn','garden','plaza','room','street']);
  assert.ok(guideVisibility.every(value=>value===false),'the guide must remain invisible before dawn');
  assert.ok(final,'the automatic story must reach the letter');
  assert.equal(final.lights,7);
  assert.equal(final.people,6);
  assert.deepEqual(guestOrder,{Simón:0,Nora:1,Lía:2,Mateo:3,Abril:4,Joel:5});
  assert.deepEqual(final.gifts,[
    ['Simón','Amabilidad'],['Nora','Justicia'],['Lía','Valentía'],
    ['Mateo','Perseverancia'],['Abril','Integridad'],['Joel','Paciencia'],
  ]);
  assert.equal(final.musicPaused,false,'music must continue under the final letter');
  assert.equal(final.musicSource,'local');
  assert.equal(final.musicLoop,true,'the bundled soundtrack must loop while the letter is open');
  await page.screenshot({path:path.join(output,'09-carta.png')});

  await page.getByRole('button',{name:'Volver a caminar'}).click();
  await page.evaluate(()=>window.__genesis.advance(12,true));
  await page.keyboard.press('Escape');
  const paused=await page.evaluate(()=>window.__genesis.snapshot());
  await page.evaluate(()=>window.__genesis.advance(20));
  assert.deepEqual(await page.evaluate(()=>window.__genesis.snapshot()),paused);
  await page.keyboard.press('Escape');

  await page.getByRole('button',{name:'Abrir ajustes de música'}).click();
  assert.equal(await page.locator('#musicPanel').evaluate(dialog=>dialog.open),true);
  await page.screenshot({path:path.join(output,'10-musica.png')});
  await page.getByRole('button',{name:'Cerrar ajustes'}).click();

  const mobile=await context.newPage();
  await mobile.setViewportSize({width:390,height:844});
  await mobile.goto(base+'/?test=1');
  await mobile.waitForFunction(()=>window.__genesis);
  await mobile.screenshot({path:path.join(output,'11-movil.png')});
  assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await mobile.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),true);
  await mobile.getByRole('button',{name:'Empezar la historia',exact:true}).click();
  await mobile.evaluate(()=>window.__genesis.advance(8,true));
  await mobile.screenshot({path:path.join(output,'12-movil-dialogo.png')});

  assert.deepEqual(failures,[]);
  fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify({
    status:'PASS',
    locations:[...seen],
    durationSeconds:192,
    bundledSoundtrack:true,
    automatic:true,
    guideInvisibleBeforeDawn:true,
    lights:final.lights,
    peopleHelped:final.people,
    fullscreenLayout:true,
    mobileNoOverflow:true,
    pageErrors:failures,
  },null,2));
  console.log(JSON.stringify({status:'PASS',locations:seen.size,lights:final.lights,pageErrors:failures}));
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
