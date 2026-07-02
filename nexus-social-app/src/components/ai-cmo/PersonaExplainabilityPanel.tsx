'use client';

import type { ExplainabilityOutput } from '@/lib/explainability/renderer';

type Props = {
  output: ExplainabilityOutput;
  className?: string;
};

export function PersonaExplainabilityPanel({ output, className }: Props) {
  return (
    <section className={className} aria-label={`${output.persona} explainability`}>
      <h3 className="text-sm font-semibold text-gray-900">{output.headline}</h3>
      <p className="mt-1 text-sm text-gray-600">{output.body}</p>
      <p className="mt-2 text-xs font-medium text-indigo-700">{output.confidenceLabel}</p>
      {output.bullets.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
          {output.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      )}
      {output.showTechnicalDetail && (
        <p className="mt-2 text-xs text-gray-500">Persona: {output.persona}</p>
      )}
    </section>
  );
}
