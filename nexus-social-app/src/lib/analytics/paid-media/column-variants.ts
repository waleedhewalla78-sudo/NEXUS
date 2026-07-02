export type PaidMediaPlatform = 'meta' | 'google' | 'tiktok' | 'snapchat' | 'unknown';

export type CanonicalField =
  | 'date'
  | 'platform'
  | 'account'
  | 'campaign_name'
  | 'adset_name'
  | 'ad_name'
  | 'objective'
  | 'spend'
  | 'impressions'
  | 'reach'
  | 'frequency'
  | 'clicks'
  | 'link_clicks'
  | 'landing_page_views'
  | 'add_to_cart'
  | 'initiate_checkout'
  | 'purchases'
  | 'leads'
  | 'revenue'
  | 'video_views'
  | 'thumbstop';

export const COLUMN_VARIANTS: Record<CanonicalField, string[]> = {
  date: ['date', 'day', 'reporting date', 'report date'],
  platform: ['platform', 'publisher', 'network'],
  account: ['account', 'account name', 'account id'],
  campaign_name: ['campaign name', 'campaign', 'campaign id'],
  adset_name: ['ad set name', 'adset name', 'ad group name', 'ad set'],
  ad_name: ['ad name', 'ad', 'creative name'],
  objective: ['objective', 'campaign objective', 'optimization goal'],
  spend: ['spend', 'amount spent', 'cost', 'total spend'],
  impressions: ['impressions', 'impr.', 'impr'],
  reach: ['reach', 'unique reach'],
  frequency: ['frequency', 'freq'],
  clicks: ['clicks', 'all clicks'],
  link_clicks: ['link clicks', 'link click', 'outbound clicks'],
  landing_page_views: ['landing page views', 'lpv', 'landing page view'],
  add_to_cart: ['add to cart', 'adds to cart', 'atc'],
  initiate_checkout: ['initiate checkout', 'checkouts initiated'],
  purchases: ['purchases', 'purchase', 'conversions', 'results'],
  leads: ['leads', 'lead', 'lead gen'],
  revenue: ['revenue', 'purchase value', 'conv. value', 'conversion value'],
  video_views: ['video views', '3-second video views', 'video view'],
  thumbstop: ['thumbstop', 'hook rate', 'video plays at 25%'],
};

const PLATFORM_SIGNALS: Record<PaidMediaPlatform, string[]> = {
  meta: ['amount spent', 'link clicks', 'facebook', 'meta', 'purchase roas'],
  google: ['impr.', 'conv. value', 'google', 'quality score'],
  tiktok: ['tiktok', 'swipe', 'video completion'],
  snapchat: ['snapchat', 'swipe ups', 'swipe up'],
  unknown: [],
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function detectPlatform(headers: string[]): PaidMediaPlatform {
  const joined = headers.map(normalizeHeader).join(' | ');
  for (const platform of ['meta', 'google', 'tiktok', 'snapchat'] as const) {
    if (PLATFORM_SIGNALS[platform].some((sig) => joined.includes(sig))) {
      return platform;
    }
  }
  return 'unknown';
}

export function autoMapColumns(headers: string[]): Partial<Record<CanonicalField, string>> {
  const mapping: Partial<Record<CanonicalField, string>> = {};
  const normalized = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));

  for (const [field, variants] of Object.entries(COLUMN_VARIANTS) as [CanonicalField, string[]][]) {
    const exact = normalized.find(({ norm }) => variants.includes(norm));
    if (exact) {
      mapping[field] = exact.raw;
      continue;
    }
    const partial = normalized.find(({ norm }) =>
      variants.some((v) => norm.includes(v) || v.includes(norm)),
    );
    if (partial) mapping[field] = partial.raw;
  }

  return mapping;
}

export function applyColumnMapping(
  rows: Record<string, string>[],
  mapping: Partial<Record<CanonicalField, string>>,
): Record<CanonicalField, string | number | null>[] {
  return rows.map((row) => {
    const out = {} as Record<CanonicalField, string | number | null>;
    for (const field of Object.keys(COLUMN_VARIANTS) as CanonicalField[]) {
      const header = mapping[field];
      if (!header) {
        out[field] = null;
        continue;
      }
      const raw = row[header];
      if (raw === undefined || raw === null || String(raw).trim() === '') {
        out[field] = null;
        continue;
      }
      if (
        [
          'spend',
          'impressions',
          'reach',
          'frequency',
          'clicks',
          'link_clicks',
          'landing_page_views',
          'add_to_cart',
          'initiate_checkout',
          'purchases',
          'leads',
          'revenue',
          'video_views',
          'thumbstop',
        ].includes(field)
      ) {
        out[field] = parseNum(String(raw));
      } else {
        out[field] = String(raw);
      }
    }
    return out;
  });
}

export function parseNum(value: string): number | null {
  const cleaned = value.replace(/[$€£,\s%]/g, '').trim();
  if (!cleaned) return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = splitCsvLine(lines[0]!);
  const rows = lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? '';
    });
    return row;
  });
  return { headers, rows };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}
