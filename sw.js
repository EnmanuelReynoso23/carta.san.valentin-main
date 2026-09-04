// Para que el viaje también funcione sin internet: una vez visto, se queda.
const CACHE='genesis-odisea-v1';
const SHELL=['./','index.html','styles.css','manifest.webmanifest',
  'src/main.js','src/game.js','src/logic.js','src/story.js','src/render.js','src/audio.js','src/input.js','src/auto.js',
  'assets/atlas.json','assets/characters.json','assets/atlas.png','assets/genesis.png','assets/enmanuel.png',
  'assets/icon-192.png','assets/icon-512.png'];
const guardar=async(request,response)=>{try{const cache=await caches.open(CACHE);await cache.put(request,response);}catch{}};

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()).catch(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys()
    .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
    .then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==location.origin)return;
  // El arte no cambia: se sirve de la caché. Lo demás se pide primero a la red,
  // así una versión nueva llega sola en cuanto hay conexión.
  if(/\.(png|json|woff2)$/.test(url.pathname)){
    event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{
      guardar(event.request,response.clone());return response;})));
    return;
  }
  event.respondWith(fetch(event.request).then(response=>{
    guardar(event.request,response.clone());return response;
  }).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('index.html'))));
});
