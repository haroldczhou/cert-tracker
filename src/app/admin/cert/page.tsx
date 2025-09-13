'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { EvidenceList } from '@/components/EvidenceList';
import { FileUpload } from '@/components/FileUpload';

type Cert = { id: string; certTypeKey: string; personId: string; expiryDate?: string; status?: string };
type Person = { id: string; fullName: string; email: string };

function CertInner() {
  const sp = useSearchParams();
  const certId = sp.get('id') || '';
  const [cert, setCert] = useState<Cert | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const cRes = await fetch(`/api/getCerts?id=${encodeURIComponent(certId)}`);
        if (!cRes.ok) throw new Error((await cRes.json()).error?.message || 'Failed to load cert');
        const arr: Cert[] = await cRes.json();
        const c = arr[0] || null;
        setCert(c);
        if (c?.personId) {
          const pRes = await fetch('/api/getPeople');
          if (pRes.ok) {
            const people: Person[] = await pRes.json();
            setPerson(people.find((x) => x.id === c.personId) || null);
          }
        }
        setError(null);
      } catch (e: any) {
        setError(e?.message || 'Failed to load');
      }
    };
    if (certId) load();
  }, [certId]);

  const sendReminder = async () => {
    try { const res = await fetch('/api/sendReminderLink', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ certId }) }); if (!res.ok) throw new Error((await res.json()).error?.message || 'Send reminder failed'); alert('Reminder link sent'); } catch (e: any) { alert(e?.message || 'Send reminder failed'); }
  };

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!cert) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{cert.certTypeKey}</h1>
          <div className="text-sm text-gray-600">Status: {cert.status} • Due: {cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString() : '—'}</div>
          {person && <div className="text-sm text-gray-600">{person.fullName} • {person.email}</div>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={sendReminder} className="text-sm px-3 py-1 rounded border text-blue-700 hover:bg-blue-50">Send reminder</button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium mb-2">Evidence</h2>
        <EvidenceList certId={certId} canManage={true} />
        <div className="mt-3">
          <FileUpload onUploadComplete={() => {}} onError={() => {}} certId={certId} />
        </div>
      </div>
    </div>
  );
}

export default function CertPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <CertInner />
    </Suspense>
  );
}
