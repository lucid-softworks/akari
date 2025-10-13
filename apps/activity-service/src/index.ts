import { serve } from '@hono/node-server';

import activityApp from './app.js';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);

console.log(`Activity service listening on http://0.0.0.0:${port}`);

serve({
  fetch: activityApp.fetch,
  port,
});
