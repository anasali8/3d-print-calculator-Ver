import { createHandler } from './cloud-handler';
import { getConfig, saveMaterials, saveSettings } from './vercel-storage';
export const handle = createHandler({ getConfig, saveMaterials, saveSettings });
