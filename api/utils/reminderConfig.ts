import { InvocationContext } from '@azure/functions';
import { queryAll } from './cosmos';

type DistrictConfig = {
  id: string;
  type: 'config';
  districtId: string;
  reminderOffsets?: number[];
  expiringThresholdDays?: number;
  emailFrom?: string | null;
  timezone?: string | null;
};

const cache = new Map<string, DistrictConfig | null>();

export async function queryDistrictConfig(districtId: string, context?: InvocationContext): Promise<DistrictConfig | null> {
  if (cache.has(districtId)) return cache.get(districtId)!;
  try {
    const docs = await queryAll<DistrictConfig>({
      query: 'SELECT TOP 1 * FROM c WHERE c.type = @t AND c.id = @id AND c.districtId = @did',
      parameters: [
        { name: '@t', value: 'config' },
        { name: '@id', value: `config:${districtId}` },
        { name: '@did', value: districtId },
      ],
    });
    const cfg = docs[0] ?? null;
    cache.set(districtId, cfg);
    return cfg;
  } catch (e) {
    context?.log?.('Failed to load district config', e);
    cache.set(districtId, null);
    return null;
  }
}

