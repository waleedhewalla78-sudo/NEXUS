import { redirect } from 'next/navigation';

/** Back-compat alias — canonical AI Ops dashboard lives at `/ai-ops`. */
export default function AdminAiOpsRedirectPage() {
  redirect('/ai-ops');
}
