'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useWorkspaceStore } from '@/store/workspace';

export default function MigrationHub() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceSystem, setSourceSystem] = useState('sprout');
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);

  const handleUpload = async () => {
    if (!file || !workspaceId) return;
    setIsUploading(true);
    setMessage('');

    try {
      // 1. Upload file securely to Supabase Storage
      const filePath = `${workspaceId}/migrations/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('enterprise-migrations')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      // 2. Create tracking record in DB
      const { error: dbError } = await supabase
        .from('migration_status')
        .insert({
          workspace_id: workspaceId,
          file_path: filePath,
          source_system: sourceSystem,
          status: 'pending'
        });

      if (dbError) throw dbError;

      setMessage('Migration file uploaded successfully! Processing will begin in the background.');
      setFile(null);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Enterprise Data Migration Hub</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Bulk-import your historical social data from legacy platforms to prevent data loss and ensure continuity.
      </p>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Legacy Platform Source
          </label>
          <select 
            value={sourceSystem} 
            onChange={(e) => setSourceSystem(e.target.value)}
            className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="sprout">Sprout Social</option>
            <option value="hootsuite">Hootsuite</option>
            <option value="buffer">Buffer</option>
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Upload Export File (CSV / JSON)
          </label>
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 border-gray-300 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                </svg>
                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">CSV or JSON (MAX. 500MB)</p>
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept=".csv,.json"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
          {file && (
            <p className="mt-2 text-sm text-green-600 dark:text-green-400 font-medium">Selected: {file.name}</p>
          )}
        </div>

        {message && (
          <div className={`p-4 mb-6 rounded-md ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || isUploading || !workspaceId}
          className="w-full text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 font-medium rounded-lg text-sm px-5 py-3 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isUploading ? 'Uploading & Queuing...' : 'Start Migration'}
        </button>
      </div>
    </div>
  );
}
