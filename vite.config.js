import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function apiDevBridge() {
  const routeToModule = {
    '/api/chat': '/api/chat.ts',
    '/api/judge': '/api/judge.ts',
    '/api/save': '/api/save.ts',
    '/api/share': '/api/share.ts',
    '/api/usage': '/api/usage.ts',
  };

  return {
    name: 'api-dev-bridge',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const reqUrl = req.url || '';
        const url = new URL(reqUrl, 'http://localhost');
        const modulePath = routeToModule[url.pathname];

        if (!modulePath) {
          return next();
        }

        try {
          const mod = await server.ssrLoadModule(modulePath);
          const handler = mod?.default;

          if (typeof handler !== 'function') {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `No default handler exported in ${modulePath}` }));
            return;
          }

          const chunks = [];
          for await (const chunk of req) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }

          const method = req.method || 'GET';
          const bodyBuffer = chunks.length ? Buffer.concat(chunks) : null;

          const request = new Request(new URL(reqUrl, 'http://localhost:5174').toString(), {
            method,
            headers: req.headers,
            body: method === 'GET' || method === 'HEAD' ? undefined : bodyBuffer,
          });

          const response = await handler(request);

          res.statusCode = response.status;
          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });

          const arrayBuffer = await response.arrayBuffer();
          res.end(Buffer.from(arrayBuffer));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: String(error?.message || 'Local API bridge failed') }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  if (env.GROQ_API_KEY && !process.env.GROQ_API_KEY) {
    process.env.GROQ_API_KEY = env.GROQ_API_KEY;
  }

  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith('GROQ_KEY_')) {
      continue;
    }

    if (value && !process.env[key]) {
      process.env[key] = value;
    }
  }

  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith('HUGGINGFACE_KEY_')) {
      continue;
    }

    if (value && !process.env[key]) {
      process.env[key] = value;
    }
  }

  if (env.HUGGINGFACE_API_KEY && !process.env.HUGGINGFACE_API_KEY) {
    process.env.HUGGINGFACE_API_KEY = env.HUGGINGFACE_API_KEY;
  }

  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith('NVIDIA_KEY_')) {
      continue;
    }

    if (value && !process.env[key]) {
      process.env[key] = value;
    }
  }

  if (env.NVIDIA_API_KEY && !process.env.NVIDIA_API_KEY) {
    process.env.NVIDIA_API_KEY = env.NVIDIA_API_KEY;
  }

  if (env.VITE_FIREBASE_CONFIG) {
    process.env.VITE_FIREBASE_CONFIG = env.VITE_FIREBASE_CONFIG;
  }

  return {
    plugins: [apiDevBridge(), react()],
  };
});
