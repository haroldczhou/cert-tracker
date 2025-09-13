'use client';

import { useEffect, useState } from 'react';
import { listCertEvidence, setCurrentEvidence, Evidence } from '@/lib/evidence';

type Props = {
  certId: string;
  canManage?: boolean;
};

export function EvidenceList({ certId, canManage = false }: Props) {
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await listCertEvidence(certId);
      setEvidences(res.evidences);
      setCurrentId(res.currentEvidenceId);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load evidence');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certId]);

  const makeCurrent = async (id: string) => {
    try {
      setBusy(id);
      await setCurrentEvidence(certId, id);
      setCurrentId(id);
    } catch (e: any) {
      setError(e?.message || 'Failed to set current evidence');
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="text-sm text-gray-600">Loading evidence…</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  if (!evidences.length) return <div className="text-sm text-gray-600">No evidence uploaded yet.</div>;

  return (
    <div className="space-y-2">
      {evidences.map((e) => {
        const name = e.fileName || e.blobPath.split('/').slice(-1)[0];
        const isCurrent = e.id === currentId;
        return (
          <div key={e.id} className="flex items-center justify-between rounded border p-2">
            <div className="min-w-0">
              <div className="text-sm text-gray-900 truncate">{name}</div>
              <div className="text-xs text-gray-500">
                {e.size ? `${(e.size / (1024 * 1024)).toFixed(2)} MB` : 'Pending size'} • {e.uploadedAt ? new Date(e.uploadedAt).toLocaleString() : 'Pending upload'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isCurrent && <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">Current</span>}
              {canManage && !isCurrent && (
                <button
                  disabled={busy === e.id}
                  onClick={() => makeCurrent(e.id)}
                  className="text-xs px-2 py-1 rounded border text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {busy === e.id ? 'Setting…' : 'Make current'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

