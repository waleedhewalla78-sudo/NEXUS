'use client';

import React, { useEffect, useState } from 'react';
import { MessageSquare, Briefcase, Camera, Users, Play, Music2 } from 'lucide-react';

const PREVIEW_PLATFORMS = ['Twitter', 'LinkedIn', 'Instagram', 'Facebook', 'YouTube', 'TikTok'] as const;

interface SocialPreviewProps {
  text: string;
  mediaUrl: string | null;
  platforms: string[];
  deviceView?: 'desktop' | 'mobile';
}

export default function SocialPreview({ text, mediaUrl, platforms, deviceView = 'desktop' }: SocialPreviewProps) {
  const [activePlatform, setActivePlatform] = useState<string>(platforms[0] || 'Twitter');

  useEffect(() => {
    if (platforms.length === 0) return;
    if (!platforms.includes(activePlatform)) {
      setActivePlatform(platforms[0]);
    }
  }, [platforms, activePlatform]);

  const displayPlatform = platforms.length > 0
    ? (platforms.includes(activePlatform) ? activePlatform : platforms[0])
    : 'Twitter';

  const isMobile = deviceView === 'mobile';
  const cardWidth = isMobile ? 'max-w-[350px]' : 'max-w-full w-full';

  const limitText = (str: string, limit: number) => {
    if (str.length <= limit) return str;
    return str.slice(0, limit) + '...';
  };

  return (
    <div
      className={`flex flex-col h-full bg-white/5 border border-white/10 overflow-hidden transition-all duration-300 ${
        isMobile
          ? 'w-[320px] rounded-[3rem] border-[8px] border-black shadow-2xl relative'
          : 'w-full min-w-[480px] rounded-xl'
      }`}
    >
      {isMobile && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-3xl z-10" />
      )}
      <div className={`flex items-center space-x-2 p-3 border-b border-white/10 bg-black/20 ${isMobile ? 'pt-6' : 'pt-3'}`}>
        {PREVIEW_PLATFORMS.map((p) => {
          const isSelected = platforms.includes(p);
          const isActive = displayPlatform === p;
          if (!isSelected && platforms.length > 0) return null;

          return (
            <button
              key={p}
              type="button"
              onClick={() => setActivePlatform(p)}
              className={`p-2 rounded-lg transition ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/10'}`}
              title={p}
            >
              {p === 'Twitter' && <MessageSquare size={18} />}
              {p === 'LinkedIn' && <Briefcase size={18} />}
              {p === 'Instagram' && <Camera size={18} />}
              {p === 'Facebook' && <Users size={18} />}
              {p === 'YouTube' && <Play size={18} />}
              {p === 'TikTok' && <Music2 size={18} />}
            </button>
          );
        })}
        {platforms.length === 0 && (
          <span className="text-sm text-gray-500 ml-2">Select a platform to preview</span>
        )}
      </div>

      <div className="p-4 md:p-6 flex-1 flex justify-center items-start overflow-y-auto bg-gray-100 dark:bg-black/50">
        {displayPlatform === 'Twitter' && (
          <div className={`${cardWidth} bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm`}>
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1">
                  <span className="font-bold text-gray-900 dark:text-white text-sm">Nexus User</span>
                  <span className="text-gray-500 text-sm">@nexus_user</span>
                  <span className="text-gray-500 text-sm">· 1m</span>
                </div>
                <p className="mt-1 text-[15px] text-gray-900 dark:text-white whitespace-pre-wrap break-words">
                  {text ? limitText(text, 280) : <span className="text-gray-400">What is happening?!</span>}
                </p>
                {mediaUrl && (
                  <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
                    <img src={mediaUrl} alt="Preview" className="w-full h-auto object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {displayPlatform === 'LinkedIn' && (
          <div className={`${cardWidth} bg-white dark:bg-[#1b1f23] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden`}>
            <div className="p-4 flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-700 flex-shrink-0" />
              <div>
                <div className="font-bold text-gray-900 dark:text-white text-sm">Nexus User</div>
                <div className="text-gray-500 text-xs">Growth Marketing Expert</div>
                <div className="text-gray-500 text-xs flex items-center">Just now • 🌐</div>
              </div>
            </div>
            <div className="px-4 pb-2">
              <p className="text-[14px] text-gray-900 dark:text-white whitespace-pre-wrap break-words">
                {text ? limitText(text, 3000) : <span className="text-gray-400">What do you want to talk about?</span>}
              </p>
            </div>
            {mediaUrl && (
              <div className="w-full border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                <img src={mediaUrl} alt="Preview" className="w-full h-auto object-cover" />
              </div>
            )}
          </div>
        )}

        {displayPlatform === 'Instagram' && (
          <div className={`${cardWidth} bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden pb-4`}>
            <div className="p-3 flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 bg-gradient-to-tr from-yellow-400 to-fuchsia-600 p-[2px]">
                <div className="w-full h-full bg-white dark:bg-black rounded-full border-2 border-white dark:border-black" />
              </div>
              <div className="font-semibold text-gray-900 dark:text-white text-sm flex-1">nexus_user</div>
            </div>
            <div className={`w-full ${isMobile ? 'aspect-square' : 'aspect-[16/10]'} bg-gray-100 dark:bg-gray-900 flex items-center justify-center`}>
              {mediaUrl ? (
                <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-gray-400 text-sm">Image required for Instagram</div>
              )}
            </div>
            <div className="px-3 pt-3">
              <div className="flex space-x-3 mb-2 text-gray-900 dark:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              </div>
              <p className="text-[14px] text-gray-900 dark:text-white whitespace-pre-wrap break-words">
                <span className="font-semibold mr-2">nexus_user</span>
                {text ? limitText(text, 2200) : <span className="text-gray-400">Write a caption...</span>}
              </p>
            </div>
          </div>
        )}

        {displayPlatform === 'Facebook' && (
          <div className={`${cardWidth} bg-white dark:bg-[#242526] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden pb-2`}>
            <div className="p-3 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex-shrink-0" />
              <div>
                <div className="font-bold text-gray-900 dark:text-white text-[15px]">Nexus User</div>
                <div className="text-gray-500 text-xs flex items-center space-x-1">
                  <span>1 min</span>
                  <span>·</span>
                  <span>🌎</span>
                </div>
              </div>
            </div>
            <div className="px-3 pb-3">
              <p className="text-[15px] text-gray-900 dark:text-white whitespace-pre-wrap break-words">
                {text ? limitText(text, 63206) : <span className="text-gray-400">What&apos;s on your mind?</span>}
              </p>
            </div>
            {mediaUrl && (
              <div className="w-full bg-gray-100 dark:bg-gray-900">
                <img src={mediaUrl} alt="Preview" className="w-full h-auto object-cover" />
              </div>
            )}
            <div className="mx-3 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between text-gray-500 font-semibold text-sm">
              <div className="flex items-center space-x-2 py-1 px-4 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg cursor-pointer">
                <span>👍</span> <span>Like</span>
              </div>
              <div className="flex items-center space-x-2 py-1 px-4 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg cursor-pointer">
                <span>💬</span> <span>Comment</span>
              </div>
            </div>
          </div>
        )}

        {displayPlatform === 'YouTube' && (
          <div className={`${cardWidth} bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden pb-3`}>
            <div className="p-3 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-red-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                N
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white text-sm">Nexus Social</div>
                <div className="text-gray-500 text-xs">Community post · Just now</div>
              </div>
            </div>
            <div className="px-3 pb-3">
              <p className="text-[14px] text-gray-900 dark:text-white whitespace-pre-wrap break-words">
                {text ? limitText(text, 5000) : <span className="text-gray-400">Share an update with your subscribers…</span>}
              </p>
            </div>
            {mediaUrl && (
              <div className="w-full bg-gray-100 dark:bg-gray-900">
                <img src={mediaUrl} alt="Preview" className="w-full h-auto object-cover" />
              </div>
            )}
          </div>
        )}

        {displayPlatform === 'TikTok' && (
          <div className={`${isMobile ? 'max-w-[280px]' : 'max-w-[320px]'} bg-black border border-gray-800 rounded-xl shadow-sm overflow-hidden`}>
            <div className={`relative w-full ${isMobile ? 'aspect-[9/16]' : 'aspect-[9/14]'} bg-gray-900 flex items-center justify-center`}>
              {mediaUrl ? (
                <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-gray-500 text-sm px-4 text-center">Video required for TikTok</div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                <div className="font-semibold text-white text-sm mb-1">@nexus_social</div>
                <p className="text-[13px] text-white whitespace-pre-wrap break-words">
                  {text ? limitText(text, 2200) : <span className="text-gray-300">Add a caption…</span>}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
