import { EmailClient } from '@azure/communication-email';

let client: EmailClient | null = null;

function getClient() {
  if (!client) {
    const connection = process.env.ACS_CONNECTION_STRING || process.env.COMMUNICATION_CONNECTION_STRING;
    if (!connection) throw new Error('Missing ACS connection string (ACS_CONNECTION_STRING)');
    client = new EmailClient(connection);
  }
  return client!;
}

export async function sendEmail(to: string, subject: string, html: string, plainText?: string) {
  const sender = process.env.REMINDER_FROM_EMAIL || process.env.ACS_FROM_EMAIL || process.env.EMAIL_SENDER;
  if (!sender) throw new Error('Missing sender email (REMINDER_FROM_EMAIL or ACS_FROM_EMAIL)');
  const ec = getClient();
  const message = {
    senderAddress: sender,
    recipients: { to: [{ address: to }] },
    content: { subject, html, plainText: plainText ?? html.replace(/<[^>]+>/g, '') },
  } as any;
  const poller = await ec.beginSend(message);
  const res = await poller.pollUntilDone();
  const providerId = (res as any)?.id ?? (res as any)?.messageId ?? 'unknown';
  return providerId as string;
}
