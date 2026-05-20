import { prisma } from '../lib/db.js';
import { requirePerm } from '../lib/auth.js';

const nextId = async () => {
  const r = await prisma.counter.update({ where: { key: 'riskmap' }, data: { value: { increment: 1 } } });
  return `RM-${new Date().getFullYear()}-${String(r.value).padStart(3, '0')}`;
};

const cleanRecord = (d, existing = {}) => {
  const num = (v, fb) => v === undefined ? fb : Number(v) || 0;
  const str = (v, fb) => v === undefined ? fb : String(v ?? '');
  return {
    process: str(d.process, existing.process),
    subProcess: str(d.subProcess, existing.subProcess),
    processOwner: str(d.processOwner, existing.processOwner),
    asset: str(d.asset, existing.asset),
    assetCriticality: num(d.assetCriticality, existing.assetCriticality),
    ciaProperty: str(d.ciaProperty, existing.ciaProperty),
    threat: str(d.threat, existing.threat),
    vulnerability: str(d.vulnerability, existing.vulnerability),
    description: str(d.description, existing.description),
    riskType: str(d.riskType, existing.riskType),
    source: str(d.source, existing.source),
    probability: num(d.probability, existing.probability),
    impact: num(d.impact, existing.impact),
    controls: str(d.controls, existing.controls),
    isoControls: str(d.isoControls, existing.isoControls),
    nistFunction: str(d.nistFunction, existing.nistFunction),
    controlEffectiveness: str(d.controlEffectiveness, existing.controlEffectiveness),
    residualProbability: num(d.residualProbability, existing.residualProbability),
    residualImpact: num(d.residualImpact, existing.residualImpact),
    riskAppetite: str(d.riskAppetite, existing.riskAppetite),
    treatmentDecision: str(d.treatmentDecision, existing.treatmentDecision),
    treatmentPlan: str(d.treatmentPlan, existing.treatmentPlan),
    treatmentOwner: str(d.treatmentOwner, existing.treatmentOwner),
    deadline: str(d.deadline, existing.deadline),
    kri: str(d.kri, existing.kri),
    identifiedAt: str(d.identifiedAt, existing.identifiedAt),
    lastReviewedAt: str(d.lastReviewedAt, existing.lastReviewedAt),
    nextReviewAt: str(d.nextReviewAt, existing.nextReviewAt),
    status: str(d.status, existing.status || 'Открыт'),
    comments: str(d.comments, existing.comments)
  };
};

export default async function riskmapRoutes(app) {
  app.get('/', { preHandler: requirePerm('riskmap.view') }, async () => {
    const items = await prisma.riskMap.findMany({ orderBy: { createdAt: 'desc' } });
    return { items };
  });

  app.post('/', { preHandler: requirePerm('riskmap.create') }, async (req, reply) => {
    const d = req.body || {};
    if (!d.process || !d.threat || !d.description) {
      return reply.code(400).send({ error: 'process, threat, description обязательны' });
    }
    const id = d.id && String(d.id).trim() ? String(d.id).trim() : await nextId();
    const exists = await prisma.riskMap.findUnique({ where: { id } });
    if (exists) return reply.code(409).send({ error: `Запись с ID ${id} уже существует` });
    const created = await prisma.riskMap.create({ data: { id, ...cleanRecord(d) } });
    return { item: created };
  });

  app.patch('/:id', { preHandler: requirePerm('riskmap.edit') }, async (req, reply) => {
    const { id } = req.params;
    const existing = await prisma.riskMap.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Запись не найдена' });
    const updated = await prisma.riskMap.update({
      where: { id }, data: cleanRecord(req.body || {}, existing)
    });
    return { item: updated };
  });

  app.delete('/:id', { preHandler: requirePerm('riskmap.delete') }, async (req) => {
    await prisma.riskMap.delete({ where: { id: req.params.id } });
    return { ok: true };
  });

  // Bulk-импорт (import xlsx с фронта)
  app.post('/import', { preHandler: requirePerm('riskmap.create') }, async (req, reply) => {
    const { records, replace } = req.body || {};
    if (!Array.isArray(records)) return reply.code(400).send({ error: 'records — массив' });
    if (replace) await prisma.riskMap.deleteMany({});
    const results = [];
    for (const r of records) {
      if (!r.id) continue;
      const data = { id: String(r.id), ...cleanRecord(r) };
      const item = await prisma.riskMap.upsert({
        where: { id: data.id }, create: data, update: data
      });
      results.push(item.id);
    }
    return { imported: results.length, ids: results };
  });
}
