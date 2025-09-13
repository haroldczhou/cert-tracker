'use client';

import { useState } from 'react';
import { FileUpload, FileDisplay } from '@/components/FileUpload';
import { EvidenceList } from '@/components/EvidenceList';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export default function Demo() {
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [certId, setCertId] = useState<string>('');
  const [useEvidenceFlow, setUseEvidenceFlow] = useState<boolean>(false);

  const handleUploadComplete = (blobName: string) => {
    setUploadedFile(blobName);
    setError(null);
    setSuccess('File uploaded successfully!');
    setTimeout(() => setSuccess(null), 5000);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setSuccess(null);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">File Upload Demo</h1>
          
          <div className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <p className="text-green-700 text-sm">{success}</p>
              </div>
            )}

            <div className="grid gap-3 mb-2">
              <label className="text-sm text-gray-700">Optional: Cert ID (uses evidence flow when provided)</label>
              <input value={certId} onChange={(e) => setCertId(e.target.value)} placeholder="cert UUID" className="w-full rounded border px-3 py-2 text-sm" />
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={useEvidenceFlow} onChange={(e) => setUseEvidenceFlow(e.target.checked)} />
                Use evidence flow (requires Cert ID)
              </label>
            </div>

            {!uploadedFile ? (
              <div>
                <FileUpload 
                  onUploadComplete={handleUploadComplete}
                  onError={handleError}
                  certId={useEvidenceFlow && certId ? certId : undefined}
                />
                <div className="mt-4 text-sm text-gray-600">
                  <h3 className="font-medium mb-2">File Upload Limits:</h3>
                  <ul className="space-y-1 text-xs">
                    <li>• Maximum file size: <strong>5MB</strong></li>
                    <li>• Allowed types: PDF, JPG, PNG, DOC, DOCX</li>
                    <li>• Files are uploaded to private Azure Blob Storage</li>
                    <li>• With a Cert ID, uploads create versioned evidence and auto-set current.</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Uploaded File:</h3>
                  <FileDisplay 
                    blobName={uploadedFile} 
                    showRemove={true}
                    onRemove={handleRemoveFile}
                  />
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Upload another file
                </button>
              </div>
            )}

            {useEvidenceFlow && certId && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Evidence for Cert</h3>
                <EvidenceList certId={certId} canManage={true} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
