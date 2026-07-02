'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { oauthReconnectPath } from '@/lib/oauth/reconnect-path';
import { retryFailedPost, reschedulePost } from '@/actions/calendar-posts';

export interface CalendarPost {
  id: string;
  scheduled_at: string | null;
  content: { text: string } | null;
  platforms: string[] | null;
  status: string;
  publish_error: string | null;
}

interface FullCalendarClientProps {
  posts: CalendarPost[];
  workspaceId: string;
}

function platformColor(platforms: string[] | null): string {
  if (platforms?.includes('Twitter')) return '#1DA1F2';
  if (platforms?.includes('LinkedIn')) return '#0A66C2';
  if (platforms?.includes('Instagram')) return '#E1306C';
  if (platforms?.includes('Facebook')) return '#1877F2';
  if (platforms?.includes('YouTube')) return '#FF0000';
  if (platforms?.includes('TikTok')) return '#010101';
  return '#6366f1';
}

export default function FullCalendarClient({ posts, workspaceId }: FullCalendarClientProps) {
  const t = useTranslations('Calendar');
  const [selectedPost, setSelectedPost] = useState<CalendarPost | null>(null);
  const [isRetrying, startRetry] = useTransition();

  const events = posts
    .filter((post) => post.scheduled_at)
    .map((post) => {
      const failed = post.status === 'failed';
      const baseColor = failed ? '#dc2626' : platformColor(post.platforms);
      const text = post.content?.text ?? t('untitledPost');
      const platformLabel = post.platforms?.join(', ') ?? t('unknownPlatform');

      return {
        id: post.id,
        title: failed ? t('failedTitle', { platforms: platformLabel }) : `${platformLabel}: ${text}`,
        start: post.scheduled_at!,
        backgroundColor: baseColor,
        borderColor: failed ? '#fca5a5' : 'rgba(255,255,255,0.2)',
        textColor: '#ffffff',
        extendedProps: { post },
      };
    });

  const reconnectPath =
    selectedPost?.platforms?.[0]
      ? oauthReconnectPath({ platform: selectedPost.platforms[0], workspaceId })
      : null;

  const handleRetry = () => {
    if (!selectedPost) return;
    startRetry(async () => {
      try {
        await retryFailedPost(selectedPost.id);
        toast.success(t('retryQueued'));
        setSelectedPost(null);
        window.location.reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('retryFailed'));
      }
    });
  };

  return (
    <>
      <div className="bg-white/5 backdrop-filter backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl w-full h-[700px] overflow-hidden calendar-container">
        <style>{`
          .fc-theme-standard .fc-scrollgrid {
            border: 1px solid rgba(255,255,255,0.1);
          }
          .fc-theme-standard td, .fc-theme-standard th {
            border: 1px solid rgba(255,255,255,0.1);
          }
          .fc .fc-toolbar-title {
            color: #f3f4f6;
            font-weight: 700;
          }
          .fc .fc-button-primary {
            background-color: rgba(99, 102, 241, 0.2);
            border: 1px solid rgba(99, 102, 241, 0.5);
            color: #e0e7ff;
            transition: all 0.2s;
          }
          .fc .fc-button-primary:hover {
            background-color: rgba(99, 102, 241, 0.4);
          }
          .fc .fc-button-primary:not(:disabled).fc-button-active,
          .fc .fc-button-primary:not(:disabled):active {
            background-color: rgba(99, 102, 241, 0.6);
          }
          .fc .fc-daygrid-day-number {
            color: #9ca3af;
          }
          .fc .fc-col-header-cell-cushion {
            color: #d1d5db;
            padding: 8px 4px;
          }
          .fc-day-today {
            background-color: rgba(255, 255, 255, 0.05) !important;
          }
          .fc-event {
            border-radius: 4px;
            padding: 2px 4px;
            font-size: 0.8em;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            cursor: pointer;
          }
        `}</style>

        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={events}
          height="100%"
          editable={true}
          eventDrop={(info) => {
            const post = info.event.extendedProps.post as CalendarPost | undefined;
            if (!post || post.status === 'published') {
              info.revert();
              return;
            }
            startRetry(async () => {
              try {
                await reschedulePost({
                  postId: post.id,
                  scheduledAt: info.event.start?.toISOString() ?? post.scheduled_at!,
                });
                toast.success(t('rescheduleSuccess'));
              } catch (err) {
                info.revert();
                toast.error(err instanceof Error ? err.message : t('rescheduleFailed'));
              }
            });
          }}
          selectable={true}
          eventClick={(info) => {
            const post = info.event.extendedProps.post as CalendarPost | undefined;
            if (post?.status === 'failed') {
              setSelectedPost(post);
            }
          }}
        />
      </div>

      {selectedPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="publish-failure-title"
        >
          <div className="w-full max-w-lg rounded-2xl border border-red-500/30 bg-[#1a1a2e] p-6 shadow-2xl">
            <div className="mb-4 flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-400" />
              <div>
                <h2 id="publish-failure-title" className="text-lg font-semibold text-white">
                  {t('failurePanelTitle')}
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  {selectedPost.platforms?.join(', ') ?? t('unknownPlatform')}
                </p>
              </div>
            </div>

            <p className="mb-2 text-sm font-medium text-gray-300">{t('failureReason')}</p>
            <p className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              {selectedPost.publish_error ?? t('unknownError')}
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRetry}
                disabled={isRetrying}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? t('retrying') : t('retryPublish')}
              </button>

              {reconnectPath ? (
                <a
                  href={reconnectPath}
                  className="inline-flex items-center rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                >
                  {t('reconnectAccount')}
                </a>
              ) : (
                <Link
                  href="/settings#nav-settings-channels"
                  className="inline-flex items-center rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                >
                  {t('openSettings')}
                </Link>
              )}

              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className="ml-auto rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-white"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
