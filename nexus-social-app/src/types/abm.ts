export type BuyerStage = 'awareness' | 'consideration' | 'decision';

export interface TargetAccount {
  id: string;
  name: string;
  domain: string;
  intentScore: number;
  buyerStage: BuyerStage;
  topics: string[];
  industry?: string;
}

export interface AttributionReport {
  id: string;
  month: string;
  channel: string;
  touches: number;
  revenue: number;
}
