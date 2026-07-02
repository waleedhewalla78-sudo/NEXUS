'use client';

import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { PersonaExplainabilityPanel } from '@/components/ai-cmo/PersonaExplainabilityPanel';
import type { ExplainabilityOutput } from '@/lib/explainability/renderer';

type Props = {
  output: ExplainabilityOutput;
  compact?: boolean;
  className?: string;
};

export function ExplainabilitySidePanel({ output, compact = false, className = '' }: Props) {
  const [open, setOpen] = useState(false);

  if (compact && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 ${className}`}
        aria-expanded={open}
        aria-label="Why was this recommended?"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        Why?
      </button>
    );
  }

  return (
    <div className={`rounded-lg border border-indigo-100 bg-indigo-50/50 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium text-indigo-800"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-1.5">
          <HelpCircle className="h-4 w-4" />
          Why this recommendation?
        </span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-indigo-100 px-3 pb-3">
          <PersonaExplainabilityPanel output={output} className="mt-2" />
        </div>
      )}
    </div>
  );
}
