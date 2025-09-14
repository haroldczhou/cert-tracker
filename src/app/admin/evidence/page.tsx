'use client';

import { useEffect, useState } from 'react';

type EvidenceItem = {
  id: string;
  certId: string;
  personId?: string;
  schoolId?: string;
  fileName?: string;
  blobPath: string;
  status?: string;
  uploadedAt?: string;
  size?: number;
};

export default function EvidenceAdminPage() {
  const [schoolId, setSchoolId] = useState<string>('');
  const [status, setStatus] = useState<'pending' | 'complete' | 'approved' | 'rejected' | 'all'>('pending');
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      if (schoolId) qs.set('schoolId', schoolId);
      if (status) qs.set('status', status);
      const res = await fetch(`/api/listEvidenceQueue?${qs.toString()}`);
      if (!res.ok) throw new Error((await safeJson(res))?.error?.message || 'Failed to load evidence');
      setItems((await res.json()).items || []);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const loadSchools = async () => {
    try {
      const res = await fetch('/api/getSchools');
      if (res.ok) setSchools(await res.json());
    } catch {}
  };

  useEffect(() => {
    loadSchools();
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, status]);

  const approve = async (certId: string, evidenceId: string) => {
    try {
      setBusy(evidenceId);
      const res = await fetch('/api/approveEvidence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ certId, evidenceId }) });
      if (!res.ok) throw new Error((await safeJson(res))?.error?.message || 'Approve failed');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Approve failed');
    } finally {
      setBusy(null);
    }
  };

  const reject = async (certId: string, evidenceId: string) => {
    const reason = prompt('Reason for rejection (optional)') || undefined;
    try {
      setBusy(evidenceId);
      const res = await fetch('/api/rejectEvidence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ certId, evidenceId, reason }) });
      if (!res.ok) throw new Error((await safeJson(res))?.error?.message || 'Reject failed');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Reject failed');
    } finally {
      setBusy(null);
    }
  };

  const sendReminder = async (certId: string) => {
    try {
      setBusy(certId);
      const res = await fetch('/api/sendReminderLink', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ certId }) });
      if (!res.ok) throw new Error((await safeJson(res))?.error?.message || 'Send reminder failed');
      alert('Reminder link sent.');
    } catch (e: any) {
      setError(e?.message || 'Send reminder failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Evidence Review</h1>
      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
      <div className="flex gap-3 items-center mb-4">
        <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="border rounded px-2 py-1 text-sm">
          <option value="pending">Pending</option>
          <option value="complete">Complete</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
        <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="border rounded px-2 py-1 text-sm">
          <option value="">All Schools</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button onClick={load} className="text-sm px-3 py-1 rounded border">Refresh</button>
      </div>
      {loading ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between border rounded p-2">
              <div className="min-w-0">
                <div className="text-sm text-gray-900 truncate">{it.fileName || it.blobPath.split('/').slice(-1)[0]}</div>
                <div className="text-xs text-gray-500">Status: {it.status} • {it.uploadedAt ? new Date(it.uploadedAt).toLocaleString() : 'Not finalized'} • {(it.size ? (it.size/1024/1024).toFixed(2)+' MB' : '')}</div>
              </div>
              <div className="flex items-center gap-2">
                <button disabled={busy===it.id} onClick={() => approve(it.certId, it.id)} className="text-xs px-2 py-1 rounded border text-green-700 hover:bg-green-50 disabled:opacity-50">Approve</button>
                <button disabled={busy===it.id} onClick={() => reject(it.certId, it.id)} className="text-xs px-2 py-1 rounded border text-red-700 hover:bg-red-50 disabled:opacity-50">Reject</button>
                <button disabled={busy===it.certId} onClick={() => sendReminder(it.certId)} className="text-xs px-2 py-1 rounded border text-blue-700 hover:bg-blue-50 disabled:opacity-50">Send reminder</button>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="text-sm text-gray-600">No evidence found for the selected filters.</div>}
        </div>
      )}
    </div>
  );
}

async function safeJson(res: Response) { try { return await res.json(); } catch { return null; } }
