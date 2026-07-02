import type { AttributionReport, TargetAccount } from '@/types/abm';

/** Static NEXGEN demo data — typed mocks until live API layer is wired in this track */
export const MOCK_TARGET_ACCOUNTS: TargetAccount[] = [
  {
    id: 'mock-vodafone',
    name: 'Vodafone Egypt',
    domain: 'vodafone.com.eg',
    intentScore: 88,
    buyerStage: 'decision',
    topics: ['AI Automation', '5G'],
    industry: 'Telecommunications',
  },
  {
    id: 'mock-cairo-bank',
    name: 'Cairo Bank',
    domain: 'cairobank.com',
    intentScore: 58,
    buyerStage: 'consideration',
    topics: ['Digital Transformation'],
    industry: 'Financial Services',
  },
  {
    id: 'mock-etisalat',
    name: 'Etisalat Egypt',
    domain: 'etisalat.eg',
    intentScore: 28,
    buyerStage: 'awareness',
    topics: ['Telecom'],
    industry: 'Telecommunications',
  },
  {
    id: 'mock-carrefour',
    name: 'Carrefour Egypt',
    domain: 'carrefour.eg',
    intentScore: 52,
    buyerStage: 'consideration',
    topics: ['Retail Tech'],
    industry: 'Retail',
  },
  {
    id: 'mock-adcb',
    name: 'Abu Dhabi Commercial Bank',
    domain: 'adcb.com',
    intentScore: 79,
    buyerStage: 'decision',
    topics: ['FinTech'],
    industry: 'Financial Services',
  },
];

export const MOCK_ATTRIBUTION_REPORTS: AttributionReport[] = [
  { id: 'attr-1', month: '2026-06', channel: 'linkedin', touches: 195, revenue: 28400 },
  { id: 'attr-2', month: '2026-06', channel: 'whatsapp', touches: 118, revenue: 19200 },
  { id: 'attr-3', month: '2026-06', channel: 'x', touches: 72, revenue: 6400 },
  { id: 'attr-4', month: '2026-06', channel: 'email', touches: 48, revenue: 9100 },
];
