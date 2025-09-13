export type CertStatus = 'valid' | 'expiring' | 'expired';

export function daysToExpiry(expiryDateIso: string): number {
  const now = startOfDay(new Date());
  const expiry = startOfDay(new Date(expiryDateIso));
  const diffMs = expiry.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function computeStatus(expiryDateIso: string, expiringThresholdDays = 30): CertStatus {
  const days = daysToExpiry(expiryDateIso);
  if (days < 0) return 'expired';
  if (days < expiringThresholdDays) return 'expiring';
  return 'valid';
}

export function startOfDay(d: Date): Date {
  const nd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  return nd;
}

export function dayWindow(offsetDays: number) {
  const start = startOfDay(new Date());
  start.setUTCDate(start.getUTCDate() + offsetDays);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

