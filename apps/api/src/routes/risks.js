import { prisma } from '../lib/db.js';
import { requirePerm } from '../lib/auth.js';

const nextId = async (key, prefix) => {
  const r = await prisma.counter.update({ where: { key }, data: { value: { increment: 1 } } });
  return `${prefix}-${new Date().getFullYear()}-${String(r.value).padStart(3, '0')}`;
};

export default async function risksRoutes(app) {
  app.get('/', { preHandler: requirePerm('risks.view') }, async () => {
    const items = await prisma.risk.findMany({ orderBy: { createdAt: 'desc' } });
    return { items };
  });

  app.post('/', { preHandler: requirePerm('risks.create') }, async (req, reply) => {
    const data = req.body || {};
    if (!data.process || !data.category || !data.riskEvent) {
      return reply.code(400).send({ error: 'process, category, riskEvent обязательны' });
    }
    const id = await nextId('risk', 'RSK');
    const created = await prisma.risk.create({
      data: {
        id,
        process: data.process, category: data.category, riskEvent: data.riskEvent,
        causes: data.causes || '', impact: data.impact || '',
        probability: Number(data.probability) || 0,
        influence: Number(data.influence) || 0,
        businessLoss: Number(data.businessLoss) || 0,
        businessImpact: Number(data.businessImpact) || 0,
        totalLoss: Number(data.totalLoss) || 0,
        responseStrategy: data.responseStrategy || '',
        measures: data.measures || '',
        responsible: data.responsible || '',
        monitoringFrequency: data.monitoringFrequency || '',
        status: data.status || 'Не исполняется',
        comments: data.comments || '',
        linkedIncidents: Array.isArray(data.linkedIncidents) ? data.linkedIncidents : []
      }
    });
    return { item: created };
  });

  app.patch('/:id', { preHandler: requirePerm('risks.edit') }, async (req, reply) => {
    const { id } = req.params;
    const existing = await prisma.risk.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Риск не найден' });
    const d = req.body || {};
    const num = (v, fb) => v === undefined ? fb : Number(v);
    const updated = await prisma.risk.update({
      where: { id },
      data: {
        process: d.process ?? existing.process,
        category: d.category ?? existing.category,
        riskEvent: d.riskEvent ?? existing.riskEvent,
        causes: d.causes ?? existing.causes,
        impact: d.impact ?? existing.impact,
        probability: num(d.probability, existing.probability),
        influence: num(d.influence, existing.influence),
        businessLoss: num(d.businessLoss, existing.businessLoss),
        businessImpact: num(d.businessImpact, existing.businessImpact),
        totalLoss: num(d.totalLoss, existing.totalLoss),
        responseStrategy: d.responseStrategy ?? existing.responseStrategy,
        measures: d.measures ?? existing.measures,
        responsible: d.responsible ?? existing.responsible,
        monitoringFrequency: d.monitoringFrequency ?? existing.monitoringFrequency,
        status: d.status ?? existing.status,
        comments: d.comments ?? existing.comments,
        linkedIncidents: Array.isArray(d.linkedIncidents) ? d.linkedIncidents : existing.linkedIncidents
      }
    });
    return { item: updated };
  });

  app.delete('/:id', { preHandler: requirePerm('risks.delete') }, async (req) => {
    await prisma.risk.delete({ where: { id: req.params.id } });
    return { ok: true };
  });
}
