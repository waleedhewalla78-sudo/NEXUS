'use client';

import React, { useState } from 'react';
import { replyToReview } from '@/actions/reputation';
import { Star, MessageSquare, MessageCircle, ExternalLink, Globe, Briefcase } from 'lucide-react';

interface Mention {
  id: string;
  source_platform: string;
  content: string;
  author_name: string;
  author_url: string;
  sentiment: string;
  published_at: string;
}

interface Review {
  id: string;
  platform: string;
  rating: number;
  author_name: string;
  review_text: string;
  reply_text: string | null;
  status: string;
  created_at: string;
}

interface ReputationDashboardProps {
  initialMentions: Mention[];
  initialReviews: Review[];
  workspaceId: string;
  userId: string;
}

export default function ReputationDashboard({ initialMentions, initialReviews, workspaceId, userId }: ReputationDashboardProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});

  const handleReplyChange = (id: string, text: string) => {
    setReplyInputs((prev) => ({ ...prev, [id]: text }));
  };

  const submitReply = async (reviewId: string) => {
    const text = replyInputs[reviewId];
    if (!text) return;

    setLoadingIds((prev) => ({ ...prev, [reviewId]: true }));
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('your-supabase-url')) {
        await replyToReview(reviewId, workspaceId, userId, text);
      }
      
      // Update local state to reflect the reply (even if mock)
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, reply_text: text, status: 'responded' } : r))
      );
      setReplyInputs((prev) => ({ ...prev, [reviewId]: '' }));
    } catch (e) {
      console.error(e);
      alert('Failed to submit reply.');
    } finally {
      setLoadingIds((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'Negative': return 'bg-red-500/20 text-red-400 border-red-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'twitter': return <Globe className="w-5 h-5 text-blue-400" />;
      case 'linkedin': return <Briefcase className="w-5 h-5 text-blue-600" />;
      case 'reddit': return <MessageCircle className="w-5 h-5 text-orange-500" />;
      default: return <MessageSquare className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      {/* LEFT PANE: Social Listening */}
      <div className="bg-[#161622]/80 backdrop-filter backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/10">
        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-indigo-400" />
          Social Listening
        </h2>
        <div className="flex flex-col gap-4">
          {initialMentions.map((mention) => (
            <div key={mention.id} className="p-4 bg-white/5 rounded-xl border border-white/10 transition hover:bg-white/10">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  {getPlatformIcon(mention.source_platform)}
                  <span className="font-medium text-gray-200">{mention.author_name}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border ${getSentimentColor(mention.sentiment)}`}>
                  {mention.sentiment}
                </span>
              </div>
              <p className="text-gray-300 text-sm mb-3">{mention.content}</p>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{new Date(mention.published_at).toLocaleDateString()}</span>
                <a href={mention.author_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-indigo-400 transition">
                  View Source <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
          {initialMentions.length === 0 && (
            <p className="text-gray-400 text-center py-8">No mentions found yet.</p>
          )}
        </div>
      </div>

      {/* RIGHT PANE: Review Management */}
      <div className="bg-[#161622]/80 backdrop-filter backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/10">
        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
          <Star className="w-6 h-6 text-yellow-400" />
          Review Management
        </h2>
        <div className="flex flex-col gap-4">
          {reviews.map((review) => (
            <div key={review.id} className="p-4 bg-white/5 rounded-xl border border-white/10 transition hover:bg-white/10">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-medium text-gray-200 mr-2">{review.author_name}</span>
                  <span className="text-xs text-gray-400 px-2 py-1 bg-white/10 rounded-md">{review.platform}</span>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
                  ))}
                </div>
              </div>
              <p className="text-gray-300 text-sm mb-3">{review.review_text}</p>
              
              {review.status === 'responded' ? (
                <div className="mt-3 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                  <p className="text-xs text-indigo-300 font-medium mb-1">Your Reply:</p>
                  <p className="text-sm text-gray-300">{review.reply_text}</p>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    placeholder="Write a reply..."
                    value={replyInputs[review.id] || ''}
                    onChange={(e) => handleReplyChange(review.id, e.target.value)}
                    className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => submitReply(review.id)}
                    disabled={loadingIds[review.id] || !replyInputs[review.id]}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-500 transition disabled:opacity-50"
                  >
                    {loadingIds[review.id] ? 'Sending...' : 'Reply'}
                  </button>
                </div>
              )}
            </div>
          ))}
          {reviews.length === 0 && (
            <p className="text-gray-400 text-center py-8">No external reviews found.</p>
          )}
        </div>
      </div>

    </div>
  );
}
