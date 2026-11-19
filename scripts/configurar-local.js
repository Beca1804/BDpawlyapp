import fs from 'node:fs';
import {randomBytes} from 'node:crypto';
const path=new URL('../.env',import.meta.url);
let content=fs.existsSync(path)?fs.readFileSync(path,'utf8'):'';
const values=Object.fromEntries(content.split(/\r?\n/).filter(l=>l&&!l.startsWith('#')&&l.includes('=')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1)]));
const defaults={REDIS_PASSWORD:randomBytes(24).toString('hex'),NEO4J_PASSWORD:randomBytes(24).toString('hex'),JWT_SECRET:randomBytes(32).toString('hex'),RABBITMQ_USER:'pawly',RABBITMQ_PASSWORD:randomBytes(24).toString('hex'),DEMO_PASSWORD:randomBytes(12).toString('hex')+'!'};
for(const [key,value] of Object.entries(defaults)){
 if(!values[key]){content=content.replace(new RegExp('^'+key+'=.*$','m'),'');content+='\n'+key+'='+value;values[key]=value;}
}
fs.writeFileSync(path,content+'\n',{mode:0o600});fs.chmodSync(path,0o600);
const dir=new URL('../.local/',import.meta.url);fs.mkdirSync(dir,{recursive:true,mode:0o700});
fs.writeFileSync(new URL('cuentas-demo.txt',dir),`Cuentas locales de demostración\nTutor: tutor@pawly.local\nAdmin: admin@pawly.local\nSuperadmin: superadmin@pawly.local\nContraseña de estas tres cuentas: ${values.DEMO_PASSWORD}\n\nNeo4j Browser\nUsuario: neo4j\nContraseña: ${values.NEO4J_PASSWORD}\n\nRabbitMQ\nUsuario: ${values.RABBITMQ_USER}\nContraseña: ${values.RABBITMQ_PASSWORD}\n`,{mode:0o600});
console.log('Configuración lista. Las cuentas están en .local/cuentas-demo.txt y no se versionan.');
