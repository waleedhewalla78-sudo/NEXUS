import Link from 'next/link';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import { createActionClient } from '@/lib/supabase/action';
import { getUserWorkspaceContext } from '@/lib/auth/server-session';
import FullCalendarClient, { CalendarPost } from './FullCalendarClient';
import { PublishFailureToast } from '@/components/calendar/PublishFailureToast';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const { workspaceId } = await getUserWorkspaceContext();

  let posts: CalendarPost[] = [];
  let fetchError: string | null = null;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('your-supabase-url')) {
    const supabase = await createActionClient();
    const { data, error } = await supabase
      .from('posts')
      .select('id, scheduled_at, content, platforms, status, publish_error')
      .eq('workspace_id', workspaceId)
      .in('status', ['scheduled', 'published', 'failed'])
      .order('scheduled_at', { ascending: true });

    if (error) {
      fetchError = error.message || error.code || 'Unknown database error';
      console.error('Failed to fetch posts for calendar:', fetchError, error.details);
    } else {
      posts = (data as CalendarPost[]) || [];
    }
  }

  return (
    <section
      className="p-6 md:p-10 min-h-screen text-white"
      style={{
        background: 'linear-gradient(135deg, #0f0f19 0%, #1a1a2e 40%, #16213e 100%)',
      }}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <CalendarIcon className="w-7 h-7 text-indigo-400" />
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Content Calendar</h1>
          </div>
          <p className="text-gray-400 text-base max-w-xl">
            Schedule and manage your posts across all connected social media platforms.
          </p>
        </div>

        <Link
          href="/posts/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-indigo-500/25"
        >
          <Plus className="w-5 h-5" />
          Create Post
        </Link>
      </div>

      {fetchError && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Could not load scheduled posts ({fetchError}). The calendar is shown empty — apply database migrations if this is a fresh install.
        </div>
      )}

      <div className="mt-4">
        <PublishFailureToast
          failedPosts={posts.filter((p) => p.status === 'failed')}
          workspaceId={workspaceId}
        />
        <FullCalendarClient posts={posts} workspaceId={workspaceId} />
      </div>
    </section>
  );
}
