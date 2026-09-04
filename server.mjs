import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url,'http://localhost');
    let file = path.resolve(root,'.'+decodeURIComponent(url.pathname));
    if (file!==root && !file.startsWith(root+path.sep)) { res.writeHead(403); return res.end(); }
    if ((await stat(file)).isDirectory()) file=path.join(file,'index.html');
    const body = await readFile(file);
    res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream','Referrer-Policy':'strict-origin-when-cross-origin','Cache-Control':'no-cache'});
    res.end(body);
  } catch { res.writeHead(404); res.end('No encontrado'); }
}).listen(Number(process.env.PORT||4177),'127.0.0.1',()=>console.log('Génesis: http://127.0.0.1:'+(process.env.PORT||4177)));
