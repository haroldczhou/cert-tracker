import { app, InvocationContext, Timer } from '@azure/functions';
import { queryAll, entities } from './utils/cosmos';
import { computeStatus } from './utils/status';
import { queryDistrictConfig } from './utils/reminderConfig';

type Cert = {
  id: string;
  type: 'cert';
  districtId: string;
  expiryDate?: string | null;
  status?: string;
  statusComputedAt?: string;
};

export async function statusSweeper(timer: Timer, context: InvocationContext): Promise<void> {
  const runAt = new Date().toISOString();
  context.log(`Status sweeper started at ${runAt}`);

  try {
    const certs = await queryAll<Cert>({
      query: 'SELECT * FROM c WHERE c.type = @t',
      parameters: [{ name: '@t', value: 'cert' }],
    });

    let updates = 0;
    for (const cert of certs) {
      if (!cert.expiryDate) continue;
      const cfg = await queryDistrictConfig(cert.districtId, context);
      const threshold = cfg?.expiringThresholdDays ?? 30;
      const newStatus = computeStatus(cert.expiryDate, threshold);
      if (cert.status !== newStatus) {
        (cert as any).status = newStatus;
        (cert as any).statusComputedAt = runAt;
        (cert as any).updatedAt = runAt;
        await entities.items.upsert(cert as any);
        updates++;
      }
    }
    context.log(`Status sweeper completed. Updated ${updates} cert(s).`);
  } catch (err) {
    context.error('Status sweeper error', err);
  }
}

app.timer('statusSweeper', {
  // Run daily at 02:00 UTC
  schedule: '0 0 2 * * *',
  runOnStartup: false,
  handler: statusSweeper,
});

