import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

const SUPPORTED_LOCALES = ['en', 'ar', 'es'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function resolveLocale(raw: string | undefined): SupportedLocale {
  if (raw && SUPPORTED_LOCALES.includes(raw as SupportedLocale)) {
    return raw as SupportedLocale;
  }
  return 'en';
}

function mergeMessages(
  base: Record<string, unknown>,
  overlay: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      merged[key] = {
        ...(typeof merged[key] === 'object' && merged[key] !== null && !Array.isArray(merged[key])
          ? (merged[key] as Record<string, unknown>)
          : {}),
        ...(value as Record<string, unknown>),
      };
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get('NEXT_LOCALE')?.value);

  const base = (await import(`../messages/${locale}.json`)).default as Record<string, unknown>;

  let messages = base;
  if (locale === 'en' || locale === 'ar') {
    try {
      const overlay = (await import(`./messages/${locale}.json`)).default as Record<string, unknown>;
      messages = mergeMessages(base, overlay) as typeof base;
    } catch {
      messages = base;
    }
  }

  return {
    locale,
    messages,
  };
});
