import bcrypt from 'bcryptjs';
import { prisma } from '../lib/db.js';
import { requireAuth, publicUser } from '../lib/auth.js';

export default async function authRoutes(app) {
  app.post('/login', async (req, reply) => {
    const { username, password } = req.body || {};
    if (!username || !password) return reply.code(400).send({ error: 'username, password обязательны' });

    const u = await prisma.user.findUnique({ where: { username: String(username).trim() } });
    if (!u || !u.isActive) return reply.code(401).send({ error: 'Неверный логин или пароль' });

    const ok = await bcrypt.compare(password, u.passwordHash);
    if (!ok) return reply.code(401).send({ error: 'Неверный логин или пароль' });

    await prisma.user.update({ where: { id: u.id }, data: { lastLoginAt: new Date() } });

    const token = app.jwt.sign({ sub: u.id }, { expiresIn: '12h' });
    reply.setCookie('token', token, {
      httpOnly: true, sameSite: 'lax', secure: false, path: '/'
    });
    return { ok: true, user: publicUser(u) };
  });

  app.post('/logout', async (_req, reply) => {
    reply.clearCookie('token', { path: '/' });
    return { ok: true };
  });

  app.get('/me', { preHandler: requireAuth }, async (req) => {
    const u = await prisma.user.findUnique({
      where: { id: req.currentUser.id }, include: { role: true }
    });
    return { user: publicUser(u), role: u.role };
  });

  app.post('/change-password', { preHandler: requireAuth }, async (req, reply) => {
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) return reply.code(400).send({ error: 'oldPassword, newPassword обязательны' });
    if (String(newPassword).length < 8) return reply.code(400).send({ error: 'Минимум 8 символов' });

    const u = await prisma.user.findUnique({ where: { id: req.currentUser.id } });
    const ok = await bcrypt.compare(oldPassword, u.passwordHash);
    if (!ok) return reply.code(401).send({ error: 'Неверный текущий пароль' });

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: u.id }, data: { passwordHash: newHash, mustChangePassword: false }
    });
    return { ok: true };
  });
}
