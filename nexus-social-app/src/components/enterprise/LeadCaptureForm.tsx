'use client';

import { FormEvent, useState } from 'react';

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  message: string;
};

const initial: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  company: '',
  message: '',
};

export default function LeadCaptureForm() {
  const [form, setForm] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessId(null);

    try {
      const res = await fetch('/api/v1/enterprise/leads/inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          company: form.company,
          message: form.message,
          source: 'website_form',
        }),
      });

      const json = (await res.json()) as { success?: boolean; leadId?: string; error?: string };

      if (!res.ok) {
        setError(json.error ?? 'Submission failed. Please try again.');
        return;
      }

      setSuccessId(json.leadId ?? 'ok');
      setForm(initial);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const fieldClass =
    'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20';

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="lead-first-name" className="block text-sm font-medium text-slate-700">
            First name
          </label>
          <input
            id="lead-first-name"
            required
            value={form.firstName}
            onChange={(e) => update('firstName', e.target.value)}
            className={fieldClass}
            autoComplete="given-name"
          />
        </div>
        <div>
          <label htmlFor="lead-last-name" className="block text-sm font-medium text-slate-700">
            Last name
          </label>
          <input
            id="lead-last-name"
            value={form.lastName}
            onChange={(e) => update('lastName', e.target.value)}
            className={fieldClass}
            autoComplete="family-name"
          />
        </div>
      </div>

      <div>
        <label htmlFor="lead-email" className="block text-sm font-medium text-slate-700">
          Work email
        </label>
        <input
          id="lead-email"
          type="email"
          required
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          className={fieldClass}
          autoComplete="email"
          placeholder="you@company.com"
        />
      </div>

      <div>
        <label htmlFor="lead-company" className="block text-sm font-medium text-slate-700">
          Company
        </label>
        <input
          id="lead-company"
          value={form.company}
          onChange={(e) => update('company', e.target.value)}
          className={fieldClass}
          autoComplete="organization"
        />
      </div>

      <div>
        <label htmlFor="lead-message" className="block text-sm font-medium text-slate-700">
          Message
        </label>
        <textarea
          id="lead-message"
          rows={4}
          value={form.message}
          onChange={(e) => update('message', e.target.value)}
          className={fieldClass}
          placeholder="Tell us about your revenue goals…"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {successId && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
          Thank you — our team will reach out shortly.
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-blue-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Request a demo'}
      </button>
    </form>
  );
}
