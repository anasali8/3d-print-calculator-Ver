import { handle } from '../../server/vercel-api';

export default {
  fetch(request: Request) { return handle(request, 'admin/materials'); }
};
