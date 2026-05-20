import { prisma } from '../lib/db.js';
import { requirePerm } from '../lib/auth.js';
import crypto from 'node:crypto';

const newId = () => 'role-' + crypto.randomBytes(6).toString('hex');

export default async function rolesRoutes(app) {
  app.get('/', { preHandler: requirePerm('roles.view') }, async () => {
    const items = await prisma.role.findMany({ orderBy: { createdAt: 'asc' } });
    return { items };
  });

  app.post('/', { preHandler: requirePerm('roles.create') }, async (req, reply) => {
    const d = req.body || {};
    if (!d.name || !d.permissions) return reply.code(400).send({ error: 'name, permissions обязательны' });
    const created = await prisma.role.create({
      data: {
        id: newId(), name: d.name, description: d.description || '',
        color: d.color || 'zinc', isSystem: false, permissions: d.permissions
      }
    });
    return { item: created };
  });

  app.patch('/:id', { preHandler: requirePerm('roles.edit') }, async (req, reply) => {
    const { id } = req.params;
    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Роль не найдена' });
    if (existing.isSystem) return reply.code(403).send({ error: 'Системную роль изменять нельзя' });
    const d = req.body || {};
    const updated = await prisma.role.update({
      where: { id }, data: {
        name: d.name ?? existing.name,
        description: d.description ?? existing.description,
        color: d.color ?? existing.color,
        permissions: d.permissions ?? existing.permissions
      }
    });
    return { item: updated };
  });

  app.delete('/:id', { preHandler: requirePerm('roles.delete') }, async (req, reply) => {
    const existing = await prisma.role.findUnique({ where: { id: req.params.id } });
    if (!existing) return reply.code(404).send({ error: 'Не найдена' });
    if (existing.isSystem) return reply.code(403).send({ error: 'Системную роль удалить нельзя' });
    // Проверяем, не используется ли роль
    const userCount = await prisma.user.count({ where: { roleId: req.params.id } });
    if (userCount > 0) return reply.code(409).send({ error: `Роль используется (${userCount} польз.). Сначала перенесите пользователей на другую роль.` });
    await prisma.role.delete({ where: { id: req.params.id } });
    return { ok: true };
  });
}
