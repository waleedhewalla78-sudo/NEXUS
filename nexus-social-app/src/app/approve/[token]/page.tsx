import React from 'react';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyApprovalToken, processClientApproval } from '@/actions/approvals';

export default async function ApprovalPage({ params, searchParams }: { params: { token: string }, searchParams: { action?: string } }) {
  let payload;
  try {
    payload = await verifyApprovalToken(params.token);
  } catch (err) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-white p-4">
        <div className="text-center bg-white/5 p-8 rounded-2xl border border-white/10">
          <h1 className="text-2xl font-bold text-red-400 mb-2">Invalid or Expired Link</h1>
          <p className="text-gray-400">This approval link is no longer valid. Please request a new one.</p>
        </div>
      </div>
    );
  }

  // Handle server action submission via URL search params (simple GET form)
  if (searchParams.action === 'approve' || searchParams.action === 'reject') {
    const decision = searchParams.action === 'approve' ? 'approved' : 'rejected';
    await processClientApproval(params.token, decision);
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-white p-4">
        <div className="text-center bg-white/5 p-8 rounded-2xl border border-white/10 max-w-md">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${decision === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {decision === 'approved' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              )}
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Post {decision === 'approved' ? 'Approved' : 'Rejected'}!</h1>
          <p className="text-gray-400">Your decision has been securely logged. You may now close this window.</p>
        </div>
      </div>
    );
  }

  // Fetch the post details
  const { data: post } = await supabaseAdmin
    .from('posts')
    .select('content, platforms, created_at')
    .eq('id', payload.postId)
    .single();

  if (!post) return notFound();

  const textContent = post.content?.text || 'No content provided.';
  const mediaUrls = post.content?.media_urls || [];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-white p-4">
      <div className="bg-white/5 p-8 rounded-2xl border border-white/10 max-w-lg w-full shadow-2xl backdrop-blur-xl">
        <h1 className="text-2xl font-bold mb-6 text-center">Post Approval Required</h1>
        
        <div className="bg-black/20 p-4 rounded-xl border border-white/5 mb-6">
          <p className="text-gray-300 whitespace-pre-wrap">{textContent}</p>
          
          {mediaUrls.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {mediaUrls.map((url: string, i: number) => (
                <img key={i} src={url} alt="Media" className="rounded-lg object-cover w-full h-32 border border-white/10" />
              ))}
            </div>
          )}
          
          <div className="mt-4 flex flex-wrap gap-2">
            {post.platforms.map((platform: string) => (
              <span key={platform} className="px-2 py-1 text-xs font-semibold bg-indigo-500/20 text-indigo-300 rounded-md uppercase tracking-wider">
                {platform}
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <a 
            href={`?action=reject`} 
            className="flex-1 text-center py-3 rounded-xl border border-red-500/30 text-red-400 font-bold hover:bg-red-500/10 transition-colors"
          >
            Reject
          </a>
          <a 
            href={`?action=approve`} 
            className="flex-1 text-center py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
          >
            Approve Post
          </a>
        </div>
        
        <p className="text-center text-gray-500 text-xs mt-6">
          This secure link expires in 7 days.
        </p>
      </div>
    </div>
  );
}
