import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { handleClaimsApi, announceDashboardToken } from './server/claims-api.mjs';

function claimsApi() {
  const middleware = (server: { middlewares: { use: Function } }) => {
    announceDashboardToken();
    server.middlewares.use(async (req: any, res: any, next: Function) => {
      // Vite serves project files in development. Keep local evidence outside its file routes.
      let pathname = req.url || '';
      try { pathname = decodeURIComponent(pathname); } catch { /* Keep the raw path. */ }
      if (/(^|[\\/])(\.demo-data|server)([\\/]|$)/i.test(pathname)) {
        res.statusCode = 404;
        res.end();
        return;
      }
      const handled = await handleClaimsApi(req, res);
      if (!handled && pathname.startsWith('/api/')) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: 'not_found' }));
      } else if (!handled) next();
    });
  };
  return {
    name: 'local-claims-api',
    configureServer: middleware,
    configurePreviewServer: middleware,
  };
}

export default defineConfig({
  plugins: [react(), claimsApi()],
  base: '/',
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    sourcemap: false,
  },
});
