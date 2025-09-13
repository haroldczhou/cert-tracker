export type Evidence = {
  id: string;
  blobPath: string;
  sha256?: string | null;
  size?: number | null;
  status?: string;
  uploadedAt?: string | null;
  contentType?: string | null;
  fileName?: string | null;
};

export async function listCertEvidence(certId: string): Promise<{ currentEvidenceId: string | null; evidences: Evidence[] }> {
  const res = await fetch(`/api/listCertEvidence?certId=${encodeURIComponent(certId)}`);
  if (!res.ok) throw new Error((await safeJson(res))?.error?.message || 'Failed to list evidence');
  const data = await res.json();
  return { currentEvidenceId: data.currentEvidenceId ?? null, evidences: data.evidences ?? [] };
}

export async function setCurrentEvidence(certId: string, evidenceId: string): Promise<void> {
  const res = await fetch('/api/setCurrentEvidence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ certId, evidenceId }),
  });
  if (!res.ok) throw new Error((await safeJson(res))?.error?.message || 'Failed to set current evidence');
}

async function safeJson(res: Response) {
  try { return await res.json(); } catch { return null; }
}

