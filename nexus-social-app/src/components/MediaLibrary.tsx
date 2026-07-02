// src/components/MediaLibrary.tsx
import React, { useEffect, useState } from 'react';
import { supabaseAdmin } from '@/lib/supabase/server';
import { useWorkspaceStore } from '@/store/workspace';

type MediaObject = {
  name: string;
  signedUrl: string;
};

interface MediaLibraryProps {
  /** Callback when a media item is selected; returns the signed URL */
  onSelect: (url: string) => void;
}

export default function MediaLibrary({ onSelect }: MediaLibraryProps) {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const [media, setMedia] = useState<MediaObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    const fetchMedia = async () => {
      setLoading(true);
      setError(null);
      try {
        // List objects under the workspace folder
        const { data, error: listError } = await supabaseAdmin.storage
          .from('media-assets')
          .list(`${workspaceId}/`, { limit: 100, offset: 0, sortBy: { column: 'created_at', order: 'desc' } });
        if (listError) throw listError;
        if (!data) return;
        // Generate signed URLs for each object (valid for 1 hour)
        const signedPromises = data.map(async (obj) => {
          const { data: urlData, error: urlError } = await supabaseAdmin.storage
            .from('media-assets')
            .createSignedUrl(`${workspaceId}/${obj.name}`, 60 * 60);
          if (urlError) throw urlError;
          return { name: obj.name, signedUrl: urlData?.signedUrl ?? '' } as MediaObject;
        });
        const mediaList = await Promise.all(signedPromises);
        setMedia(mediaList);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchMedia();
  }, [workspaceId]);

  if (!workspaceId) return <p className="text-gray-500">Workspace not selected.</p>;

  return (
    <div className="p-4">
      {loading && <p className="text-primary">Loading media...</p>}
      {error && <p className="text-red-500">{error}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-auto" style={{ maxHeight: '400px' }}>
        {media.slice(0, 10).map((item) => (
          <div key={item.name} className="border rounded overflow-hidden cursor-pointer" onClick={() => onSelect(item.signedUrl)}>
            {/* Assuming images; for other types you could add icons */}
            <img src={item.signedUrl} alt={item.name} className="w-full h-32 object-cover" />
          </div>
        ))}
        {media.length === 0 && !loading && <p className="text-gray-600 col-span-full">No media uploaded yet.</p>}
      </div>
    </div>
  );
}
