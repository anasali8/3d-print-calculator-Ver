// Local-only API: runs on 127.0.0.1; no Netlify account or cloud required.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { defaultConfig, safeCatalog, calculate, validateMaterials, validateSettings } from '../server/pricing.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, '.local-data', 'config.json');
const port = Number(process.env.LOCAL_API_PORT || 3001);
const adminUser = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
const sessionKey = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
let configQueue = Promise.resolve();

function send(res, data, status = 200, headers = {}) {
  res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8','Cache-Control':'no-store',...headers});
  res.end(JSON.stringify(data));
}
async function getConfig() {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return structuredClone(defaultConfig); throw error; }
}
async function updateConfig(patch) {
  const action = configQueue.catch(()=>{}).then(async () => {
    const current = await getConfig();
    const updated = { ...current, ...patch };
    await fs.mkdir(path.dirname(file), { recursive: true });
    const tmp = file + '.tmp';
    await fs.writeFile(tmp, JSON.stringify(updated, null, 2));
    await fs.rename(tmp, file);
  });
  configQueue = action;
  return action;
}
function hmac(exp) { return crypto.createHmac('sha256', sessionKey).update(String(exp)).digest('hex'); }
function authed(req) {
  const cookie = /(?:^|;\s*)admin_session=([^;]+)/.exec(req.headers.cookie || '')?.[1];
  if (!cookie) return false;
  const [exp, sign] = cookie.split('.');
  if (!/^\d+$/.test(exp) || Number(exp) <= Date.now() || !/^[0-9a-f]{64}$/.test(sign || '')) return false;
  return crypto.timingSafeEqual(Buffer.from(sign,'hex'),Buffer.from(hmac(exp),'hex'));
}
async function body(req) {
  let data='';
  for await (const part of req) { data += part; if (data.length > 100000) throw Error('Request too large'); }
  try { return JSON.parse(data || '{}'); } catch { throw Error('Invalid JSON'); }
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  const pathname=url.pathname.replace(/\/$/, '') || '/';
  try {
    if (req.method === 'GET' && pathname === '/api/catalog') return send(res, safeCatalog(await getConfig()));
    if (req.method === 'POST' && pathname === '/api/calculate') {
      try { return send(res, calculate(await getConfig(), await body(req))); }
      catch (error) { return send(res, { error: error.message }, 400); }
    }
    if (req.method === 'POST' && pathname === '/api/login') {
      const input=await body(req);
      if (input.username !== adminUser || input.password !== adminPassword) return send(res,{error:'Wrong username or password'},401);
      const expiry=String(Date.now()+12*60*60*1000);
      return send(res,{ok:true},200,{'Set-Cookie':`admin_session=${expiry}.${hmac(expiry)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200`});
    }
    if (req.method === 'GET' && pathname === '/api/session') return send(res, { authenticated: authed(req) });
    if (req.method === 'POST' && pathname === '/api/logout') return send(res,{ok:true},200,{'Set-Cookie':'admin_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'});
    if (pathname.startsWith('/api/admin/')) {
      if (!authed(req)) return send(res,{error:'Please log in'},401);
      if (req.method === 'GET' && pathname === '/api/admin/config') return send(res,await getConfig());
      if (req.method === 'PUT' && pathname === '/api/admin/materials') {
        const value=validateMaterials((await body(req)).materials);
        await updateConfig({materials:value});return send(res,{ok:true});
      }
      if (req.method === 'PUT' && pathname === '/api/admin/settings') {
        const value=validateSettings((await body(req)).settings);
        await updateConfig({settings:value});return send(res,{ok:true});
      }
    }
    return send(res,{error:'Not found'},404);
  } catch(error) {
    console.error('[Local API]', error);
    return send(res,{error:error.name === 'ValidationError' || ['Invalid JSON','Request too large'].includes(error.message) ? error.message : 'Server error'},error.name === 'ValidationError' ? 400 : 500);
  }
});
server.listen(port,'127.0.0.1',()=>{
  console.log(`[Local API] http://127.0.0.1:${port}`);
  console.log(`[Admin] Local-only login: ${adminUser} / ${process.env.ADMIN_PASSWORD ? '(password from environment)' : 'admin123'}`);
});
