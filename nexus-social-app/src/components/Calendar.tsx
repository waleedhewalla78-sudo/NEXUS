// src/components/Calendar.tsx
import React, { useState, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import type { DateSelectArg, EventClickArg, EventApi } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useWorkspaceStore } from '@/store/workspace';
import { supabaseAdmin } from '@/lib/supabase/server';
import { useQuery } from '@tanstack/react-query';
import CreatePostDialog from '@/components/CreatePostDialog';

type Post = {
  id: string;
  workspace_id: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  platforms: string[];
  content: { text: string; media_urls?: string[] };
  scheduled_at: string; // ISO
  created_at: string;
  updated_at: string;
};

const statusColorMap: Record<Post['status'], string> = {
  draft: '#9CA3AF', // gray
  scheduled: '#3B82F6', // blue
  published: '#10B981', // green
  failed: '#EF4444', // red
};

export default function Calendar() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [prefilledDate, setPrefilledDate] = useState<string | null>(null);

  // Fetch posts scoped to the current workspace
  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ['posts', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabaseAdmin
        .from('posts')
        .select('*')
        .eq('workspace_id', workspaceId);
      if (error) throw error;
      return data as Post[];
    },
    enabled: !!workspaceId,
  });

  // Transform posts into FullCalendar events
  const events = useMemo(() => {
    return posts.map((post) => ({
      id: post.id,
      title: post.content?.text?.slice(0, 30) || '(no content)',
      start: post.scheduled_at,
      backgroundColor: statusColorMap[post.status],
      borderColor: statusColorMap[post.status],
    }));
  }, [posts]);

  // Date selection – open dialog for creating a new post with the selected datetime
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setEditPost(null);
    setPrefilledDate(selectInfo.startStr);
    setDialogOpen(true);
  };

  // Event click – open dialog in edit mode
  const handleEventClick = (clickInfo: EventClickArg) => {
    const postId = clickInfo.event.id;
    const post = posts.find((p) => p.id === postId);
    if (post) {
      setEditPost(post);
      setPrefilledDate(null);
      setDialogOpen(true);
    }
  };

  return (
    <div className="p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        selectable={true}
        select={handleDateSelect}
        events={events}
        eventClick={handleEventClick}
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
        height="auto"
      />
      <CreatePostDialog
        workspaceId={workspaceId!}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        existingPost={editPost ?? undefined}
        scheduledAt={prefilledDate ?? undefined}
      />
    </div>
  );
}
