import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PostFormContent from '@/components/posts/PostFormContent';
import { getUserWorkspaceContext } from '@/lib/auth/server-session';

export const dynamic = 'force-dynamic';

export default async function CreatePostPage() {
  const { workspaceId } = await getUserWorkspaceContext();

  return (
    <section
      className="p-4 md:p-8 lg:p-10 min-h-screen text-white flex justify-center items-start pt-8 md:pt-12"
      style={{
        background: 'linear-gradient(135deg, #0f0f19 0%, #1a1a2e 40%, #16213e 100%)',
      }}
    >
      <div className="w-full max-w-7xl bg-[#161622]/80 backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-2xl border border-white/10 relative">
        <div className="absolute top-6 left-6 md:top-8 md:left-8">
          <Link
            href="/calendar"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to Calendar</span>
          </Link>
        </div>

        <div className="mt-10 md:mt-12">
          <PostFormContent workspaceId={workspaceId} />
        </div>
      </div>
    </section>
  );
}
