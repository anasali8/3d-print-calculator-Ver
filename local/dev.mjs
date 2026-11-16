import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ng=path.join(root,'node_modules','@angular','cli','bin','ng.js');
if(!existsSync(ng)) { console.error('Dependencies missing. Run: npm.cmd install'); process.exit(1); }
const processes=[];
function start(args,label) {
  const p=spawn(process.execPath,args,{cwd:root,env:process.env,stdio:'inherit'});
  processes.push(p);
  p.on('error',e=>console.error(label,e));
  p.on('exit',(code)=>{if(!shuttingDown){console.error(`${label} exited (${code}).`);shutdown();}});
}
let shuttingDown=false;
function shutdown(){if(shuttingDown)return;shuttingDown=true;for(const p of processes)if(p.pid)p.kill();setTimeout(()=>process.exit(0),300).unref();}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
console.log('\nLayerPrice local development - open http://localhost:4200');
console.log('Admin URL: http://localhost:4200/admin/login\n');
start(['--experimental-strip-types','local/api.mjs'],'Local API');
start([ng,'serve','--host','127.0.0.1','--port','4200'],'Angular');
