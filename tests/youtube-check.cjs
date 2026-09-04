// Comprueba que la canción de YouTube se conecta sola al empezar, sin botones.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
  const out=path.join(__dirname,'..','artifacts');fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.GENESIS_BROWSER||undefined});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errores=[];page.on('pageerror',error=>errores.push(error.message));
  await page.goto('http://127.0.0.1:4177/?test=1');
  await page.waitForFunction(()=>window.__genesis);
  await page.getByRole('button',{name:'Empezar mi aventura',exact:true}).click();
  await page.waitForTimeout(14000);
  const resultado=await page.evaluate(()=>{
    const music=window.__genesis.music;
    return {estado:document.getElementById('audioStatus').textContent,
      conectada:music.ready,fallo:music.failed,sonando:music.youtubePlaying,
      respaldo:music.fallback,duracion:music.player?.getDuration?.(),
      video:music.player?.getVideoData?.()?.video_id,
      iframe:!!document.querySelector('#youtube iframe')};
  });
  await page.screenshot({path:path.join(out,'13-youtube.png'),fullPage:true});
  fs.writeFileSync(path.join(out,'youtube-result.json'),JSON.stringify({...resultado,errores},null,2));
  console.log(JSON.stringify({...resultado,errores},null,2));
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
