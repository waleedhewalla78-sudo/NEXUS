'use client';

import React, { useState } from 'react';
import MediaUploader from '@/components/MediaUploader';
import { generateCaption } from '@/actions/generateCaption';
import { createPost } from '@/actions/createPost';
import { updatePost } from '@/actions/updatePost';
import { useRouter } from 'next/navigation';
import SocialPreview from '@/components/SocialPreview';
import { AiVerifyBanner } from '@/components/ai/AiVerifyBanner';
import { platformLimitsUtils } from '@/lib/publishers/platform-limits';

const PLATFORM_OPTIONS = ['Twitter', 'LinkedIn', 'Instagram', 'Facebook', 'YouTube', 'TikTok'];

interface PostFormContentProps {
  workspaceId: string;
  existingPost?: {
    id: string;
    content: { text: string; media_urls?: string[] };
    platforms: string[];
    status: 'draft' | 'scheduled' | 'published' | 'failed';
    scheduled_at: string;
  };
  scheduledAt?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function PostFormContent({ workspaceId, existingPost, scheduledAt, onSuccess, onCancel }: PostFormContentProps) {
  const router = useRouter();
  const [content, setContent] = useState(existingPost?.content.text || '');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(existingPost?.platforms || []);
  const [mediaUrl, setMediaUrl] = useState<string | null>(existingPost?.content.media_urls?.[0] || null);
  const [scheduledAtState, setScheduledAtState] = useState<string>(
    existingPost?.scheduled_at || scheduledAt || new Date().toISOString().slice(0, 16)
  );
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const mediaCount = mediaUrl ? 1 : 0;

  const runValidation = () => {
    const errors = platformLimitsUtils.validatePlatforms({
      platforms: selectedPlatforms,
      textLength: content.length,
      mediaCount,
    });
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const handleGenerateCaption = async () => {
    if (!content) return;
    setLoading(true);
    setError(null);
    try {
      const caption = await generateCaption({
        workspaceId,
        content,
      });
      setContent(caption);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedPlatforms.length === 0) {
      setError('Select at least one platform');
      return;
    }
    if (!runValidation()) {
      setError('Fix platform validation errors before saving');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (existingPost) {
        await updatePost({
          postId: existingPost.id,
          workspaceId,
          payload: {
            content: { text: content, media_urls: mediaUrl ? [mediaUrl] : [] },
            platforms: selectedPlatforms,
            status: existingPost.status,
            scheduled_at: scheduledAtState,
          },
        });
      } else {
        await createPost({
          workspaceId,
          content: { text: content, media_urls: mediaUrl ? [mediaUrl] : [] },
          platforms: selectedPlatforms,
          status: 'draft',
          scheduledAt: scheduledAtState,
        });
      }
      onSuccess?.();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full max-h-[85vh] overflow-y-auto pr-2">
      {/* LEFT COL: Form */}
      <div className="flex flex-col gap-4 flex-1">
        <AiVerifyBanner />
        <h2 className="text-2xl font-semibold text-white mb-2">
          {existingPost ? 'Edit Social Media Post' : 'Draft New Post'}
        </h2>
        
        <div>
          <label className="block font-medium mb-2 text-gray-300">Platforms</label>
          <div className="flex flex-wrap gap-3">
            {PLATFORM_OPTIONS.map((platform) => (
              <label key={platform} className="flex items-center space-x-2 cursor-pointer bg-white/5 px-4 py-2 rounded-xl border border-white/10 hover:bg-white/10 transition">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes(platform)}
                  onChange={() => togglePlatform(platform)}
                  className="form-checkbox h-4 w-4 text-indigo-500 rounded border-gray-500 bg-transparent focus:ring-indigo-500 focus:ring-offset-gray-900"
                />
                <span className="text-gray-200">{platform}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block font-medium mb-2 text-gray-300 mt-2">Content</label>
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setValidationErrors([]);
            }}
            placeholder="What do you want to share?"
            className="w-full h-32 p-3 border border-white/20 bg-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-400 transition"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleGenerateCaption}
              disabled={loading}
              className="ai-caption-btn px-4 py-1.5 text-sm bg-indigo-600/50 hover:bg-indigo-600 border border-indigo-500/50 text-white rounded-lg transition"
            >
              {loading ? 'Generating...' : '✨ Generate with AI'}
            </button>
          </div>
        </div>

        <div>
          <label className="block font-medium mb-2 text-gray-300">Media</label>
          <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
            <MediaUploader workspaceId={workspaceId} onUploadComplete={setMediaUrl} />
          </div>
        </div>
        
        <div>
          <label className="block font-medium mb-2 text-gray-300 mt-2">Scheduled At</label>
          <input
            type="datetime-local"
            value={scheduledAtState}
            onChange={(e) => setScheduledAtState(e.target.value)}
            className="date-picker-input w-full p-3 border border-white/20 bg-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white transition"
          />
        </div>

        {validationErrors.length > 0 && (
          <ul className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {validationErrors.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        )}

        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl mt-2">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/10">
          {onCancel && (
            <button
              onClick={onCancel}
              type="button"
              className="px-5 py-2.5 bg-white/5 text-gray-300 border border-white/10 rounded-xl hover:bg-white/10 transition"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50"
          >
            {loading ? 'Saving...' : (existingPost ? 'Update Post' : 'Save Post')}
          </button>
        </div>
      </div>

      {/* RIGHT COL: Preview */}
      <div className="flex flex-col w-full lg:w-[560px] xl:w-[620px] flex-shrink-0">
         <div className="flex items-center justify-between mb-4">
           <h3 className="text-lg font-medium text-gray-300">Live Preview</h3>
           <div className="flex items-center space-x-1 bg-white/5 border border-white/10 rounded-lg p-1">
             <button
               type="button"
               onClick={() => setDeviceView('desktop')}
               className={`px-3 py-1 text-xs font-medium rounded-md transition ${deviceView === 'desktop' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
             >
               Desktop
             </button>
             <button
               type="button"
               onClick={() => setDeviceView('mobile')}
               className={`px-3 py-1 text-xs font-medium rounded-md transition ${deviceView === 'mobile' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
             >
               Mobile
             </button>
           </div>
         </div>
         <div className={`flex-1 flex justify-center ${deviceView === 'desktop' ? 'min-h-[420px]' : 'min-h-[500px]'}`}>
           <SocialPreview text={content} mediaUrl={mediaUrl} platforms={selectedPlatforms} deviceView={deviceView} />
         </div>
      </div>
    </div>
  );
}
