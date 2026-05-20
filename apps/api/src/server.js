// Risk Platform API — Fastify entrypoint
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import { prisma, disconnect } from './lib/db.js';
import { runBootstrap } from './lib/bootstrap.js';
import authRoutes from './routes/auth.js';
import incidentsRoutes from './routes/incidents.js';
import risksRoutes from './routes/risks.js';
import riskmapRoutes from './routes/riskmap.js';
import usersRoutes from './routes/users.js';
import rolesRoutes from './routes/roles.js';
import settingsRoutes from './routes/settings.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty' } : undefined
  },
  bodyLimit: 10 * 1024 * 1024 // 10 MB для импорта Excel
});

await app.register(cookie);
await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION',
  cookie: { cookieName: 'token', signed: false }
});

app.get('/api/health', async () => ({ ok: true, ts: new Date().toISOString() }));

// Все защищённые ручки — под /api/*
await app.register(async (api) => {
  await api.register(authRoutes, { prefix: '/auth' });
  await api.register(incidentsRoutes, { prefix: '/incidents' });
  await api.register(risksRoutes, { prefix: '/risks' });
  await api.register(riskmapRoutes, { prefix: '/riskmap' });
  await api.register(usersRoutes, { prefix: '/users' });
  await api.register(rolesRoutes, { prefix: '/roles' });
  await api.register(settingsRoutes, { prefix: '/settings' });
}, { prefix: '/api' });

// Graceful shutdown
const shutdown = async () => {
  app.log.info('Shutting down...');
  await app.close();
  await disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

try {
  await runBootstrap(app.log);
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`API listening on http://${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  await disconnect();
  process.exit(1);
}
