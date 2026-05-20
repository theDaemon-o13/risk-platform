// Auth helpers: require login, require permission
import { prisma } from './db.js';

export async function requireAuth(req, reply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'Не авторизован' });
  }
  const user = await prisma.user.findUnique({
    where: { id: req.user.sub }, include: { role: true }
  });
  if (!user || !user.isActive) {
    return reply.code(401).send({ error: 'Пользователь отключён или не существует' });
  }
  req.currentUser = user;
}

export function can(user, perm) {
  if (!user) return false;
  if (user.isTechnical) return true;
  const granted = user.role?.permissions?.[perm] === true;
  if (granted) return true;
  // Авто-просмотр, если есть любое другое действие на тот же ресурс
  if (perm.endsWith('.view')) {
    const resource = perm.split('.')[0];
    return ['create', 'edit', 'delete'].some((a) => user.role?.permissions?.[`${resource}.${a}`] === true);
  }
  return false;
}

export function requirePerm(perm) {
  return async (req, reply) => {
    if (!can(req.currentUser, perm)) {
      return reply.code(403).send({ error: `Недостаточно прав: ${perm}` });
    }
  };
}

export function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id, username: u.username, fullName: u.fullName, email: u.email,
    isTechnical: u.isTechnical, isActive: u.isActive,
    mustChangePassword: u.mustChangePassword, roleId: u.roleId,
    lastLoginAt: u.lastLoginAt, createdAt: u.createdAt
  };
}
