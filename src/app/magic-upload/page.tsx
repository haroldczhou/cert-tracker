'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function MagicUploadInner() {
  const sp = useSearchParams();
  const token = sp.get('token') || '';
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const disabled = !token || busy;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!file || !token) return;
    try {
      setBusy(true);
      // Step 1: create evidence + SAS
      const res1 = await fetch('/api/magicUploadCreateEvidence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, fileName: file.name, contentType: file.type }),
      });
      if (!res1.ok) throw new Error((await safeJson(res1))?.error?.message || 'Failed to create evidence');
      const { evidenceId, uploadUrl } = await res1.json();

      // Step 2: upload blob
      const res2 = await fetch(uploadUrl, { method: 'PUT', headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': file.type }, body: file });
      if (!res2.ok) throw new Error(await res2.text());

      // Step 3: finalize with checksum
      const sha256 = await sha256Hex(file);
      const res3 = await fetch('/api/magicUploadFinalizeEvidence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, evidenceId, sha256, size: file.size, contentType: file.type }),
      });
      if (!res3.ok) throw new Error((await safeJson(res3))?.error?.message || 'Failed to finalize evidence');

      setSuccess('Upload complete. Your document was submitted for review.');
      setFile(null);
    } catch (e: any) {
      setError(e?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-xl font-semibold mb-4">Secure Evidence Upload</h1>
          {!token && <p className="text-sm text-red-600">Missing token.</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={disabled} />
            <button disabled={disabled || !file} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">{busy ? 'Uploading…' : 'Upload'}</button>
          </form>
          <p className="text-xs text-gray-500 mt-4">This link is single-use and may expire. Your upload is auditable and will be reviewed by an administrator.</p>
        </div>
      </div>
    </div>
  );
}
export default function MagicUploadPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <MagicUploadInner />
    </Suspense>
  );
}

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function safeJson(res: Response) {
  try { return await res.json(); } catch { return null; }
}
