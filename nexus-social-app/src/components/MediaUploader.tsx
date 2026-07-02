// src/components/MediaUploader.tsx
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadMedia } from '@/actions/uploadMedia';

interface MediaUploaderProps {
  workspaceId: string;
  onUploadComplete?: (url: string) => void;
}

export default function MediaUploader({ workspaceId, onUploadComplete }: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      setUploading(true);
      setError(null);
      const file = acceptedFiles[0];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workspace_id', workspaceId);
      try {
        const url = await uploadMedia(formData);
        if (onUploadComplete) onUploadComplete(url);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setUploading(false);
      }
    },
    [workspaceId, onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 ${
        isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-primary'
      }`}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <p className="text-primary">Uploading…</p>
      ) : (
        <p className="text-gray-600">{isDragActive ? 'Drop the file here …' : 'Drag & drop an image, or click to select'}</p>
      )}
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}
