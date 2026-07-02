import { NextRequest, NextResponse } from 'next/server';
import {
  computeCalibratedConfidence,
  confidenceBand,
  DEFAULT_CONFIDENCE_WEIGHTS,
} from '@/lib/evaluation/calibrated-confidence';
import { renderExplainability } from '@/lib/explainability/renderer';

export async function POST(req: NextRequest) {
  let body: {
    dataQuality?: number;
    historicalPerformance?: number;
    policyCompliance?: number;
    marketVolatility?: number;
    persona?: 'executive' | 'operator' | 'compliance';
    decision?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const inputs = {
    dataQuality: body.dataQuality ?? 0.8,
    historicalPerformance: body.historicalPerformance ?? 0.7,
    policyCompliance: body.policyCompliance ?? 0.9,
    marketVolatility: body.marketVolatility ?? 0.75,
  };

  const score = computeCalibratedConfidence(inputs);
  const band = confidenceBand(score);
  const persona = body.persona ?? 'operator';

  const explainability = renderExplainability({
    persona,
    decision: body.decision ?? 'Confidence assessment',
    confidence: score,
    confidenceBand: band,
    rationaleBullets: Object.entries(DEFAULT_CONFIDENCE_WEIGHTS).map(
      ([key, weight]) => `${key}: ${Math.round((inputs[key as keyof typeof inputs] ?? 0) * 100)}% (weight ${weight})`,
    ),
  });

  return NextResponse.json({
    score,
    band,
    inputs,
    weights: DEFAULT_CONFIDENCE_WEIGHTS,
    explainability,
  });
}
