import { get, put } from '@vercel/blob';
import {
  defaultConfig,
  validateMaterials,
  validateSettings
} from './pricing.ts';

import type {
  Config,
  Material,
  PricingSettings
} from './types.ts';

// Separate objects prevent a materials save from overwriting pricing settings.
const MATERIALS = 'layerprice/materials.json';
const SETTINGS = 'layerprice/settings.json';
async function read(pathname: string): Promise<unknown> {
  if (!process.env['BLOB_READ_WRITE_TOKEN']) throw new Error('Blob storage is not configured');
  const result = await get(pathname, { access: 'private', useCache: false });
  if (!result) return undefined;
  if (result.statusCode !== 200 || !result.stream) throw new Error('Blob read failed');
  return new Response(result.stream).json();
}
async function write(pathname: string, value: unknown) {
  if (!process.env['BLOB_READ_WRITE_TOKEN']) throw new Error('Blob storage is not configured');
  await put(pathname, JSON.stringify(value), {
    access: 'private', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'application/json', cacheControlMaxAge: 60
  });
}
export async function getConfig(): Promise<Config> {
  const [materials, settings] = await Promise.all([read(MATERIALS), read(SETTINGS)]);
  return {
    materials: materials === undefined ? structuredClone(defaultConfig.materials) : validateMaterials(materials),
    settings: settings === undefined ? structuredClone(defaultConfig.settings) : validateSettings(settings)
  };
}
export const saveMaterials = (value: Material[]) => write(MATERIALS, value);
export const saveSettings = (value: PricingSettings) => write(SETTINGS, value);
