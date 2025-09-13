export interface SASResponse {
  uploadUrl: string;
  blobName: string;
  expiresOn: string;
}

export async function getSASToken(fileName: string, contentType?: string): Promise<SASResponse> {
  const response = await fetch('/api/issueSAS', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileName, contentType }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get SAS token');
  }

  return response.json();
}

export async function uploadFile(file: File): Promise<string> {
  try {
    // Get SAS token
    const sasResponse = await getSASToken(file.name, file.type);
    
    // Upload file to blob storage
    const uploadResponse = await fetch(sasResponse.uploadUrl, {
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': file.type,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file');
    }

    return sasResponse.blobName;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

// Evidence flow: create SAS, upload, then finalize with SHA-256
export interface CreateEvidenceResponse {
  evidenceId: string;
  uploadUrl: string;
  blobName: string;
  expiresOn: string;
}

async function createEvidence(certId: string, fileName: string, contentType?: string): Promise<CreateEvidenceResponse> {
  const res = await fetch('/api/createCertEvidence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ certId, fileName, contentType }),
  });
  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.error?.message || 'Failed to create evidence');
  }
  return res.json();
}

async function finalizeEvidence(params: { certId: string; evidenceId: string; sha256: string; size: number; contentType?: string; setCurrent?: boolean }) {
  const res = await fetch('/api/finalizeCertEvidence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.error?.message || 'Failed to finalize evidence');
  }
  return res.json();
}

export async function uploadCertEvidence(certId: string, file: File): Promise<{ blobName: string; evidenceId: string }> {
  const { evidenceId, uploadUrl, blobName } = await createEvidence(certId, file.name, file.type);
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': file.type,
    },
    body: file,
  });
  if (!uploadResponse.ok) {
    const text = await uploadResponse.text();
    throw new Error(`Failed to upload file: ${text}`);
  }
  const sha256 = await sha256Hex(file);
  await finalizeEvidence({ certId, evidenceId, sha256, size: file.size, contentType: file.type, setCurrent: true });
  return { blobName, evidenceId };
}

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function validateFile(file: File): string | null {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (file.size > maxSize) {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return `File size (${fileSizeMB}MB) exceeds the 5MB limit. Please choose a smaller file.`;
  }

  if (!allowedTypes.includes(file.type)) {
    return 'File type not allowed. Please upload PDF, JPG, PNG, DOC, or DOCX files.';
  }

  return null;
}
