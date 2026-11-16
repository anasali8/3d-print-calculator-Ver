
import { createHandler } from './cloud-handler.ts';

export const handle = createHandler({
  async getConfig() {
    const storage = await import('./vercel-storage.ts');
    return storage.getConfig();
  },

  async saveMaterials(value) {
    const storage = await import('./vercel-storage.ts');
    return storage.saveMaterials(value);
  },

  async saveSettings(value) {
    const storage = await import('./vercel-storage.ts');
    return storage.saveSettings(value);
  }
});
