import { entities } from './cosmos';

export async function auditLog(districtId: string, actorUid: string | null, action: string, entityType: string, entityId: string, meta: any = {}) {
  const doc = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: 'audit',
    districtId,
    actorUid,
    action,
    entityType,
    entityId,
    meta,
    createdAt: new Date().toISOString(),
  };
  await entities.items.create(doc);
}

