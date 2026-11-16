import { handle } from '../../server/vercel-api.ts';

export default {
  fetch(request: Request) { return handle(request, 'admin/settings'); }
};
