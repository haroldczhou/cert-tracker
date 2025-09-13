'use client';

import { useState, useRef } from 'react';
import { Upload, File, X } from 'lucide-react';
import { uploadFile, uploadCertEvidence, validateFile } from '@/lib/upload';

interface FileUploadProps {
  onUploadComplete: (blobName: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  certId?: string; // if provided, uses evidence flow
}

export function FileUpload({ onUploadComplete, onError, disabled, certId }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      onError(error);
      return;
    }

    setUploading(true);
    try {
      const blobName = certId
        ? (await uploadCertEvidence(certId, file)).blobName
        : await uploadFile(file);
      onUploadComplete(blobName);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (disabled || uploading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const openFileDialog = () => {
    if (!disabled && !uploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        onChange={handleFileInputChange}
      />
      
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={openFileDialog}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${dragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled || uploading 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:bg-gray-50'
          }
        `}
      >
        {uploading ? (
          <div className="space-y-2">
            <div className="mx-auto h-12 w-12 text-blue-600">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
            <p className="text-sm text-gray-600">Uploading...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">
                <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">
                PDF, JPG, PNG, DOC, or DOCX (max 5MB)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface FileDisplayProps {
  fileName?: string;
  blobName?: string;
  onRemove?: () => void;
  showRemove?: boolean;
}

export function FileDisplay({ fileName, blobName, onRemove, showRemove = false }: FileDisplayProps) {
  if (!fileName && !blobName) return null;

  const displayName = fileName || blobName?.split('_').slice(-1)[0] || 'Unknown file';

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
      <div className="flex items-center space-x-3">
        <File className="h-5 w-5 text-gray-400" />
        <span className="text-sm text-gray-900 truncate">{displayName}</span>
      </div>
      {showRemove && onRemove && (
        <button
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
