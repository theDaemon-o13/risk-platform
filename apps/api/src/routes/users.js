import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '../lib/db.js';
import { requirePerm, publicUser } from '../lib/auth.js';

const tempPassword = () => crypto.randomBytes(6).toString('base64').replace(/[+/=]/g, '').slice(0, 10);

export default async function usersRoutes(app) {
  app.get('/', { preHandler: requirePerm('users.view') }, async () => {
    const items = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    return { items: items.map(publicUser) };
  });

  app.post('/', { preHandler: requirePerm('users.create') }, async (req, reply) => {
    const d = req.body || {};
    if (!d.username || !d.fullName || !d.roleId) {
      return reply.code(400).send({ error: 'username, fullName, roleId обязательны' });
    }
    const exists = await prisma.user.findUnique({ where: { username: d.username } });
    if (exists) return reply.code(409).send({ error: 'Логин уже занят' });
    const role = await prisma.role.findUnique({ where: { id: d.roleId } });
    if (!role) return reply.code(400).send({ error: 'Роль не найдена' });

    const tmp = tempPassword();
    const hash = await bcrypt.hash(tmp, 12);
    const created = await prisma.user.create({
      data: {
        username: d.username, fullName: d.fullName, email: d.email || '',
        passwordHash: hash, isActive: d.isActive !== false,
        mustChangePassword: true,
        isTechnical: !!d.isTechnical && req.currentUser.isTechnical,
        roleId: d.roleId
      }
    });
    return { user: publicUser(created), tempPassword: tmp };
  });

  app.patch('/:id', { preHandler: requirePerm('users.edit') }, async (req, reply) => {
    const { id } = req.params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Пользователь не найден' });
    const d = req.body || {};
    if (d.username && d.username !== existing.username) {
      const dup = await prisma.user.findUnique({ where: { username: d.username } });
      if (dup) return reply.code(409).send({ error: 'Логин уже занят' });
    }
    const updated = await prisma.user.update({
      where: { id }, data: {
        username: d.username ?? existing.username,
        fullName: d.fullName ?? existing.fullName,
        email: d.email ?? existing.email,
        roleId: d.roleId ?? existing.roleId,
        isActive: d.isActive ?? existing.isActive
      }
    });
    return { user: publicUser(updated) };
  });

  app.delete('/:id', { preHandler: requirePerm('users.delete') }, async (req, reply) => {
    const { id } = req.params;
    if (id === req.currentUser.id) return reply.code(400).send({ error: 'Нельзя удалить себя' });
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return reply.code(404).send({ error: 'Не найден' });
    if (target.isTechnical && !req.currentUser.isTechnical) {
      return reply.code(403).send({ error: 'Только техническая УЗ может удалять технические УЗ' });
    }
    await prisma.user.delete({ where: { id } });
    return { ok: true };
  });

  app.post('/:id/reset-password', { preHandler: requirePerm('users.edit') }, async (req) => {
    const tmp = tempPassword();
    const hash = await bcrypt.hash(tmp, 12);
    await prisma.user.update({
      where: { id: req.params.id },
      data: { passwordHash: hash, mustChangePassword: true }
    });
    return { tempPassword: tmp };
  });
}
