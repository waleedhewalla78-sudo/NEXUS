import type { AnalyticsPlatform } from './types';
import { instagramInsightsFetcher, metaInsightsFetcher } from './meta-insights';
import { linkedinInsightsFetcher } from './linkedin-insights';
import { xInsightsFetcher } from './x-insights';
import type { InsightsFetcher } from './types';

function stubInsightsFetcher(platform: AnalyticsPlatform): InsightsFetcher {
  return {
    platform,
    async fetchInsights() {
      throw new Error(`Insights fetch not implemented for ${platform}`);
    },
  };
}

const fetchers: Record<AnalyticsPlatform, InsightsFetcher> = {
  facebook: metaInsightsFetcher,
  instagram: instagramInsightsFetcher,
  linkedin: linkedinInsightsFetcher,
  x: xInsightsFetcher,
  tiktok: stubInsightsFetcher('tiktok'),
  snapchat: stubInsightsFetcher('snapchat'),
};

export function getInsightsFetcher(platform: AnalyticsPlatform): InsightsFetcher {
  return fetchers[platform];
}
