import React from 'react';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getClientPortalContext } from '@/lib/auth/server-session';

export const dynamic = 'force-dynamic';

export default async function ClientDashboardPage() {
  const { clientId } = await getClientPortalContext();

  const { data: posts } = await supabaseAdmin
    .from('posts')
    .select('id, content, status, scheduled_at, platforms')
    .eq('client_id', clientId)
    .order('scheduled_at', { ascending: false });

  return (
    <div className="space-y-8">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Content Calendar</h2>
        <p className="text-slate-400">Review and track your scheduled social media content.</p>
      </header>

      <div className="grid gap-4">
        {posts && posts.length > 0 ? (
          posts.map((post) => (
            <div key={post.id} className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm transition-all hover:bg-white/10">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-2">
                  {(post.platforms as string[]).map((p) => (
                    <span key={p} className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg text-xs uppercase tracking-wider font-semibold">
                      {p}
                    </span>
                  ))}
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  post.status === 'published' ? 'bg-green-500/20 text-green-400' :
                  post.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {post.status}
                </div>
              </div>
              <p className="text-slate-300 text-sm whitespace-pre-wrap">{(post.content as { text?: string })?.text}</p>
              <div className="mt-4 text-xs text-slate-500">
                Scheduled for: {new Date(post.scheduled_at).toLocaleString()}
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center border border-dashed border-white/20 rounded-2xl text-slate-400">
            No posts scheduled for this brand yet.
          </div>
        )}
      </div>
    </div>
  );
}
