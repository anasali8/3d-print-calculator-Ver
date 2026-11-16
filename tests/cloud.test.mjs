import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../server/cloud-handler.ts';
import { defaultConfig } from '../server/pricing.ts';

test('production API: guest, auth, persistence adapter, calculation, logout', async () => {
  process.env.ADMIN_USERNAME = 'test-admin';
  process.env.ADMIN_PASSWORD = 'test-only-password';
  process.env.SESSION_SECRET = 'a'.repeat(64);
  let config = structuredClone(defaultConfig);
  const handler = createHandler({
    getConfig: async () => structuredClone(config),
    saveMaterials: async materials => { config.materials = structuredClone(materials); },
    saveSettings: async settings => { config.settings = structuredClone(settings); }
  });
  const call = (route, method='GET', payload, cookie) => handler(new Request('https://example.test/api/'+route, {
    method, headers: {'Content-Type':'application/json', ...(cookie ? {Cookie:cookie} : {})},
    ...(payload === undefined ? {} : {body:JSON.stringify(payload)})
  }), route);
  const catalog = await (await call('catalog')).json();
  assert.equal(catalog.materials.length,3);
  assert.equal('costPerGram' in catalog.materials[0],false);
  assert.equal((await call('admin/config')).status,401);
  assert.equal((await call('admin/settings','PUT',{settings:config.settings})).status,401);
  assert.equal((await call('login','POST',{username:'admin',password:'admin123'})).status,401);
  const login=await call('login','POST',{username:'test-admin',password:'test-only-password'});
  assert.equal(login.status,200);
  const header=login.headers.get('set-cookie');
  assert.match(header,/HttpOnly; Secure; SameSite=Lax/);
  const cookie=header.split(';')[0];
  assert.deepEqual(await (await call('session','GET',undefined,cookie)).json(),{authenticated:true});
  assert.equal((await call('admin/config','GET',undefined,cookie)).status,200);
  const input={items:[{materialId:'pla',color:'Black',weightGrams:100}],printTimeMinutes:120,quantity:2};
  assert.equal((await (await call('calculate','POST',input)).json()).total,340);
  assert.equal((await call('calculate','POST',{...input,quantity:0})).status,400);
  assert.equal((await call('admin/materials','PUT',{materials:[]},cookie)).status,200);
  assert.equal((await (await call('catalog')).json()).materials.length,0);
  await call('admin/materials','PUT',{materials:defaultConfig.materials},cookie);
  assert.equal((await call('admin/settings','PUT',{settings:{mode:'markup',hourlyRate:10,markupPercent:30}},cookie)).status,200);
  assert.equal((await (await call('calculate','POST',input)).json()).total,182);
  assert.equal((await call('admin/config','GET',undefined,cookie+'x')).status,401);
  assert.match((await call('logout','POST',{},cookie)).headers.get('set-cookie'),/Max-Age=0/);
  delete process.env.SESSION_SECRET;
  assert.equal((await call('login','POST',{username:'test-admin',password:'test-only-password'})).status,503);
});
