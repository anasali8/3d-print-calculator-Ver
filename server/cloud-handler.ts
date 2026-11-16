import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Config, Material, PricingSettings } from './types.ts';
import { safeCatalog, calculate, validateMaterials, validateSettings } from './pricing.ts';

type Storage = {
  getConfig(): Promise<Config>;
  saveMaterials(value: Material[]): Promise<unknown>;
  saveSettings(value: PricingSettings): Promise<unknown>;
};
const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
const secret = () => process.env['SESSION_SECRET'] ?? '';
const signature = (expiry: string) => createHmac('sha256', secret()).update(expiry).digest('hex');
const equal = (a: string, b: string) => timingSafeEqual(createHmac('sha256', 'login').update(a).digest(), createHmac('sha256', 'login').update(b).digest());
function authenticated(request: Request) {
  if (secret().length < 32) return false;
  const cookie = /(?:^|;\s*)admin_session=([^;]+)/.exec(request.headers.get('cookie') ?? '')?.[1];
  if (!cookie) return false;
  const parts = cookie.split('.');
  if (parts.length !== 2) return false;
  const [expiry, sig] = parts;
  if (!/^\d+$/.test(expiry) || !Number.isSafeInteger(Number(expiry)) || Number(expiry) <= Date.now() || !/^[a-f0-9]{64}$/.test(sig)) return false;
  return timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(signature(expiry), 'hex'));
}
const body = async (request: Request) => { try { return await request.json(); } catch { return null; } };
const cookie = (value: string, age: number) => `admin_session=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${age}`;

export function createHandler(storage: Storage) {
  return async function handle(request: Request, route: string): Promise<Response> {
    const method = request.method;
    try {
      if (route === 'catalog' && method === 'GET') return json(safeCatalog(await storage.getConfig()));
      if (route === 'calculate' && method === 'POST') return json(calculate(await storage.getConfig(), await body(request)));
      if (route === 'login' && method === 'POST') {
        const username = process.env['ADMIN_USERNAME'] ?? '';
        const password = process.env['ADMIN_PASSWORD'] ?? '';
        if (!username || !password || password === 'admin123' || secret().length < 32) return json({error:'Admin credentials are not configured.'}, 503);
        const input = await body(request);
        if (typeof input?.username !== 'string' || typeof input?.password !== 'string' || !equal(input.username, username) || !equal(input.password, password)) return json({error:'Invalid credentials.'}, 401);
        const expiry = String(Date.now() + 43200000);
        return json({ok:true}, 200, {'Set-Cookie':cookie(`${expiry}.${signature(expiry)}`, 43200)});
      }
      if (route === 'session' && method === 'GET') return json({authenticated:authenticated(request)});
      if (route === 'logout' && method === 'POST') return json({ok:true}, 200, {'Set-Cookie':cookie('', 0)});
      if (route.startsWith('admin/')) {
        if (!authenticated(request)) return json({error:'Unauthorized'}, 401);
        if (route === 'admin/config' && method === 'GET') return json(await storage.getConfig());
        if (route === 'admin/materials' && method === 'PUT') {
          await storage.saveMaterials(validateMaterials((await body(request))?.materials));
          return json({ok:true});
        }
        if (route === 'admin/settings' && method === 'PUT') {
          await storage.saveSettings(validateSettings((await body(request))?.settings));
          return json({ok:true});
        }
      }
      return json({error:'Not found'}, 404);
    } catch (error) {
      if (error instanceof Error && error.name === 'ValidationError') return json({error:error.message}, 400);
      console.error('LayerPrice API:', {
        route,
        name: error instanceof Error
          ? error.name
          : 'UnknownError',
        message: error instanceof Error
          ? error.message
          : String(error),
        stack: error instanceof Error
          ? error.stack
          : undefined
      });
      return json({error:'Server error. Please retry.'}, 500);
    }
  };
}
