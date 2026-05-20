import { prisma } from '../lib/db.js';
import { requirePerm } from '../lib/auth.js';

export default async function settingsRoutes(app) {
  app.get('/', { preHandler: requirePerm('settings.view') }, async () => {
    const s = await prisma.settings.findUnique({ where: { id: 1 } });
    return { settings: s?.data || {} };
  });

  app.put('/', { preHandler: requirePerm('settings.edit') }, async (req) => {
    const data = req.body || {};
    const updated = await prisma.settings.upsert({
      where: { id: 1 }, create: { id: 1, data }, update: { data }
    });
    return { settings: updated.data };
  });
}
