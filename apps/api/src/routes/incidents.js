import { prisma } from '../lib/db.js';
import { requirePerm } from '../lib/auth.js';

const nextId = async (key, prefix) => {
  // Атомарный инкремент через транзакцию
  const r = await prisma.counter.update({ where: { key }, data: { value: { increment: 1 } } });
  return `${prefix}-${new Date().getFullYear()}-${String(r.value).padStart(3, '0')}`;
};

export default async function incidentsRoutes(app) {
  app.get('/', { preHandler: requirePerm('incidents.view') }, async () => {
    const items = await prisma.incident.findMany({ orderBy: { createdAt: 'desc' } });
    return { items };
  });

  app.post('/', { preHandler: requirePerm('incidents.create') }, async (req, reply) => {
    const data = req.body || {};
    if (!data.title || !data.type || !data.category) {
      return reply.code(400).send({ error: 'title, type, category обязательны' });
    }
    const id = await nextId('incident', 'INC');
    const created = await prisma.incident.create({
      data: {
        id,
        date: data.date || new Date().toISOString().split('T')[0],
        type: data.type, category: data.category, title: data.title,
        description: data.description || '', source: data.source || '',
        severity: data.severity || '', status: data.status || 'Открыт',
        responsible: data.responsible || '', resolutionDate: data.resolutionDate || '',
        damage: Number(data.damage) || 0, notes: data.notes || '',
        linkedIncidents: Array.isArray(data.linkedIncidents) ? data.linkedIncidents : []
      }
    });
    return { item: created };
  });

  app.patch('/:id', { preHandler: requirePerm('incidents.edit') }, async (req, reply) => {
    const { id } = req.params;
    const data = req.body || {};
    const existing = await prisma.incident.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Инцидент не найден' });
    const updated = await prisma.incident.update({
      where: { id },
      data: {
        date: data.date ?? existing.date,
        type: data.type ?? existing.type,
        category: data.category ?? existing.category,
        title: data.title ?? existing.title,
        description: data.description ?? existing.description,
        source: data.source ?? existing.source,
        severity: data.severity ?? existing.severity,
        status: data.status ?? existing.status,
        responsible: data.responsible ?? existing.responsible,
        resolutionDate: data.resolutionDate ?? existing.resolutionDate,
        damage: data.damage !== undefined ? Number(data.damage) : existing.damage,
        notes: data.notes ?? existing.notes,
        linkedIncidents: Array.isArray(data.linkedIncidents) ? data.linkedIncidents : existing.linkedIncidents
      }
    });
    return { item: updated };
  });

  app.delete('/:id', { preHandler: requirePerm('incidents.delete') }, async (req) => {
    const { id } = req.params;
    // Чистим обратные ссылки в других инцидентах и рисках
    const all = await prisma.incident.findMany();
    for (const i of all) {
      const linked = Array.isArray(i.linkedIncidents) ? i.linkedIncidents : [];
      if (linked.includes(id)) {
        await prisma.incident.update({
          where: { id: i.id },
          data: { linkedIncidents: linked.filter((x) => x !== id) }
        });
      }
    }
    const allRisks = await prisma.risk.findMany();
    for (const r of allRisks) {
      const linked = Array.isArray(r.linkedIncidents) ? r.linkedIncidents : [];
      if (linked.includes(id)) {
        await prisma.risk.update({
          where: { id: r.id },
          data: { linkedIncidents: linked.filter((x) => x !== id) }
        });
      }
    }
    await prisma.incident.delete({ where: { id } });
    return { ok: true };
  });
}
