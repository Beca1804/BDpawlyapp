import http from 'node:http';
import fs from 'node:fs/promises';
const html = await fs.readFile(new URL('../public/index.html',import.meta.url));
http.createServer(async (req,res)=>{
  if (req.method==='GET' && req.url==='/') {
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','content-security-policy':"default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'"});res.end(html);return;
  }
  if(req.method==='POST' && req.url==='/graphql') {
    try {
      const chunks=[];let size=0;
      for await(const chunk of req) {size+=chunk.length;if(size>65536){res.writeHead(413);res.end();return;}chunks.push(chunk);}
      const result=await fetch(process.env.API_URL||'http://api:4000',{
        method:'POST',headers:{'content-type':'application/json',authorization:req.headers.authorization||''},body:Buffer.concat(chunks),signal:AbortSignal.timeout(10000)});
      res.writeHead(result.status,{'content-type':'application/json','cache-control':'no-store'});res.end(await result.text());
    }catch{res.writeHead(502,{'content-type':'application/json'});res.end(JSON.stringify({errors:[{message:'No se pudo conectar con el servicio'}]}));}return;
  }
  res.writeHead(404);res.end();
}).listen(8080,'0.0.0.0',()=>console.log('PawlyApp disponible en el puerto 8080'));
