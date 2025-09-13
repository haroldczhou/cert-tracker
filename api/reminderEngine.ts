import { app, InvocationContext, Timer } from '@azure/functions';
import { randomUUID } from 'node:crypto';
import { entities, queryAll } from './utils/cosmos';
import { dayWindow, computeStatus } from './utils/status';
import { sendEmail } from './utils/email';
import { queryDistrictConfig } from './utils/reminderConfig';

type Cert = {
  id: string;
  type: 'cert';
  districtId: string;
  schoolId?: string;
  personId: string;
  certTypeKey: string;
  expiryDate: string; // ISO string
};

type Person = {
  id: string;
  type: 'person';
  districtId: string;
  fullName: string;
  email: string;
};

const DEFAULT_OFFSETS = [60, 30, 7, 1, 0]; // days before expiry

export async function reminderEngine(timer: Timer, context: InvocationContext): Promise<void> {
  const now = new Date().toISOString();
  context.log(`Reminder engine tick at ${now}`);

  for (const offset of DEFAULT_OFFSETS) {
    const { start, end } = dayWindow(offset);
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    context.log(`Scanning certs expiring between ${startIso} and ${endIso} (T+${offset})`);

    const certs = await queryAll<Cert>({
      query:
        'SELECT c.id, c.type, c.districtId, c.schoolId, c.personId, c.certTypeKey, c.expiryDate FROM c WHERE c.type = @t AND c.expiryDate >= @s AND c.expiryDate < @e',
      parameters: [
        { name: '@t', value: 'cert' },
        { name: '@s', value: startIso },
        { name: '@e', value: endIso },
      ],
    });

    for (const cert of certs) {
      // fetch district config and check if this offset is enabled
      const cfg = await queryDistrictConfig(cert.districtId, context);
      const offsets = cfg?.reminderOffsets ?? DEFAULT_OFFSETS;
      if (!offsets.includes(offset)) {
        continue;
      }
      try {
        // Idempotency: has a reminder already been created for this cert + offset?
        const existing = await queryAll<{ id: string }>({
          query:
            'SELECT TOP 1 c.id FROM c WHERE c.type = @type AND c.certId = @cid AND c.windowOffsetDays = @off AND c.channel = @ch',
          parameters: [
            { name: '@type', value: 'reminder' },
            { name: '@cid', value: cert.id },
            { name: '@off', value: offset },
            { name: '@ch', value: 'email' },
          ],
        });
        if (existing.length > 0) {
          context.log(`Reminder already exists for cert ${cert.id} T+${offset}`);
          continue;
        }

        // Load person email
        const people = await queryAll<Person>({
          query: 'SELECT TOP 1 c.id, c.type, c.districtId, c.fullName, c.email FROM c WHERE c.type = @t AND c.id = @pid',
          parameters: [
            { name: '@t', value: 'person' },
            { name: '@pid', value: cert.personId },
          ],
        });
        if (people.length === 0) {
          context.log(`No person found for cert ${cert.id} personId=${cert.personId}`);
          continue;
        }
        const person = people[0];

        const status = computeStatus(cert.expiryDate);
        const subject = `Reminder: ${cert.certTypeKey} expires in ${offset} day${offset === 1 ? '' : 's'}`;
        const expDate = new Date(cert.expiryDate).toISOString().slice(0, 10);
        const html = `
          <p>Hello ${person.fullName},</p>
          <p>Your certification <strong>${cert.certTypeKey}</strong> is ${status} and is due on <strong>${expDate}</strong>.</p>
          <p>This is an automated reminder (${offset} day${offset === 1 ? '' : 's'} before expiry).</p>
        `;

        const providerId = await sendEmail(person.email, subject, html);

        const reminderDoc = {
          id: randomUUID(),
          type: 'reminder',
          districtId: cert.districtId,
          certId: cert.id,
          windowOffsetDays: offset,
          channel: 'email',
          to: person.email,
          status: 'sent',
          providerId,
          sendAt: new Date().toISOString(),
          meta: { certTypeKey: cert.certTypeKey },
          createdAt: new Date().toISOString(),
        };

        await entities.items.create(reminderDoc);
        context.log(`Reminder sent for cert ${cert.id} to ${person.email} (offset ${offset})`);
      } catch (err) {
        context.error(`Failed processing cert ${cert.id}:`, err);
      }
    }
  }
}

app.timer('reminderEngine', {
  // NCRONTAB: sec min hour day month day-of-week
  schedule: '0 0 * * * *', // hourly at minute 0
  runOnStartup: false,
  handler: reminderEngine,
});
