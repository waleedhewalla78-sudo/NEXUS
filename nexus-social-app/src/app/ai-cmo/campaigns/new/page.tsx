import Link from 'next/link';
import { BriefWizardForm } from './BriefWizardForm';

export const dynamic = 'force-dynamic';

export default function NewCampaignBriefPage() {
  return (
    <section className="p-6 md:p-10 min-h-screen bg-gray-50">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaign Brief Wizard</h1>
          <p className="text-gray-600 mt-1">Structured executive brief → AI CMO campaign workflow</p>
        </div>
        <Link href="/ai-ops" className="text-sm text-indigo-600 hover:underline">
          ← AI Ops
        </Link>
      </div>
      <BriefWizardForm />
    </section>
  );
}
