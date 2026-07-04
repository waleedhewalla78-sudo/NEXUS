import { notFound } from 'next/navigation';
import LeadCaptureForm from '@/components/enterprise/LeadCaptureForm';
import { isEnterpriseLandingEnabled } from '@/lib/feature-flags';

export const metadata = {
  title: 'Nexus Enterprise — Autonomous Revenue OS for MENA',
  description:
    'Deploy an 8-agent AI mesh that generates compliant campaigns and proves closed-won revenue.',
};

const problems = [
  {
    title: 'Data Leakage',
    body: 'Scattered tools and shadow AI workflows expose customer data across ungoverned SaaS boundaries.',
  },
  {
    title: 'Tool Fatigue',
    body: 'RevOps stacks balloon into dashboards nobody trusts — operators spend more time switching tabs than closing revenue.',
  },
  {
    title: 'AI Hallucinations',
    body: 'Ungoverned LLMs invent claims, violate MENA compliance, and burn brand trust before a human ever reviews.',
  },
];

const solutions = [
  {
    title: 'Database-Level RLS',
    body: 'Every lead, campaign, and CRM mirror is scoped by workspace membership — no cross-tenant leakage by design.',
  },
  {
    title: '8-Agent Mesh',
    body: 'Strategic Brain, Creator, Judge, Compliance, Radar, Finance, Quant, and Sentinel run as a durable Inngest mesh.',
  },
  {
    title: 'HITL Magic Links',
    body: 'High-risk actions never auto-publish — human-in-the-loop approvals with audit trails before revenue-facing content ships.',
  },
];

export default function EnterpriseLandingPage() {
  if (!isEnterpriseLandingEnabled()) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold tracking-tight text-blue-950">Nexus Enterprise</span>
          <a
            href="#lead-form"
            className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Book a demo
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
        <section className="text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-blue-800">
            MENA · Enterprise · Revenue OS
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-blue-950 sm:text-5xl">
            The Autonomous Revenue Operating System for MENA
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-slate-600">
            We don&apos;t give you a dashboard. We deploy an 8-agent AI mesh that generates compliant
            campaigns and proves closed-won revenue.
          </p>
        </section>

        <section className="mt-20">
          <h2 className="text-center text-2xl font-bold text-blue-950">The Problem</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {problems.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-blue-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <h2 className="text-center text-2xl font-bold text-blue-950">The Solution</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {solutions.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-blue-100 bg-gradient-to-b from-white to-blue-50/40 p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-blue-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="lead-form" className="mt-20 scroll-mt-8">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-bold text-blue-950">Talk to our enterprise team</h2>
            <p className="mt-2 text-sm text-slate-600">
              Share your details and we&apos;ll schedule a private demo of the revenue loop.
            </p>
          </div>
          <div className="mx-auto mt-8 max-w-xl">
            <LeadCaptureForm />
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <p className="text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Nexus Social. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
