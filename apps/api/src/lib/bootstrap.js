// Первый запуск: создаём системные роли, дефолтные справочники и админа из ENV.
import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { prisma } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PERMISSION_RESOURCES = ['incidents', 'risks', 'riskmap', 'users', 'roles', 'settings'];
const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete'];
const ALL_PERMISSIONS = PERMISSION_RESOURCES.flatMap((r) => PERMISSION_ACTIONS.map((a) => `${r}.${a}`));

const buildPerms = (granted) => Object.fromEntries(ALL_PERMISSIONS.map((p) => [p, granted.includes(p)]));
const allTrue = () => Object.fromEntries(ALL_PERMISSIONS.map((p) => [p, true]));

const DEFAULT_ROLES = [
  {
    id: 'role-super-admin', name: 'Супер-администратор',
    description: 'Полный доступ ко всем разделам платформы',
    isSystem: true, color: 'rose', permissions: allTrue()
  },
  {
    id: 'role-is-officer', name: 'Специалист ИБ',
    description: 'Управление инцидентами и рисками, просмотр пользователей',
    isSystem: false, color: 'amber',
    permissions: buildPerms([
      'incidents.view', 'incidents.create', 'incidents.edit', 'incidents.delete',
      'risks.view', 'risks.create', 'risks.edit', 'risks.delete',
      'riskmap.view', 'riskmap.create', 'riskmap.edit', 'riskmap.delete',
      'settings.view', 'settings.edit',
      'users.view', 'roles.view'
    ])
  },
  {
    id: 'role-it-specialist', name: 'ИТ-специалист',
    description: 'Регистрация и работа с ИТ-инцидентами, просмотр риск-регистра',
    isSystem: false, color: 'sky',
    permissions: buildPerms([
      'incidents.view', 'incidents.create', 'incidents.edit',
      'risks.view', 'riskmap.view'
    ])
  },
  {
    id: 'role-viewer', name: 'Аудитор / Наблюдатель',
    description: 'Только чтение всех данных',
    isSystem: false, color: 'emerald',
    permissions: buildPerms([
      'incidents.view', 'risks.view', 'riskmap.view',
      'users.view', 'roles.view', 'settings.view'
    ])
  }
];

export async function runBootstrap(logger) {
  // 1. Роли
  for (const r of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { id: r.id },
      create: r,
      update: {} // не перезаписываем существующие
    });
  }
  logger.info({ count: DEFAULT_ROLES.length }, 'Roles ensured');

  // 2. Справочники
  const settingsExists = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settingsExists) {
    const seedPath = path.join(__dirname, '..', 'seed', 'dictionaries.json');
    const seed = JSON.parse(await fs.readFile(seedPath, 'utf-8'));
    await prisma.settings.create({ data: { id: 1, data: seed } });
    logger.info('Default dictionaries seeded');
  }

  // 3. Counters
  for (const key of ['incident', 'risk', 'riskmap']) {
    await prisma.counter.upsert({
      where: { key }, create: { key, value: 0 }, update: {}
    });
  }

  // 4. Bootstrap admin из ENV (только если admin ещё не создан)
  const username = process.env.INITIAL_ADMIN_USERNAME || 'admin';
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!password) {
    logger.warn('INITIAL_ADMIN_PASSWORD не задан в окружении — пропускаем bootstrap admin. Создайте админа вручную через переменные окружения и перезапустите.');
    return;
  }

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) {
    logger.info({ username }, 'Admin user already exists, skip bootstrap');
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      username, fullName: 'Администратор', email: '',
      passwordHash: hash, isActive: true, mustChangePassword: false,
      isTechnical: false, roleId: 'role-super-admin'
    }
  });
  logger.info({ username }, 'Bootstrap admin created');
}
