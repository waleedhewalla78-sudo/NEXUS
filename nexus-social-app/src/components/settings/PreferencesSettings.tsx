'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'react-hot-toast';
import { setLocale } from '@/actions/user-settings';

const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'es', label: 'Español' },
];

export default function PreferencesSettings() {
  const t = useTranslations('Settings');
  const router = useRouter();
  const [locale, setLocaleState] = useState('en');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const match = document.cookie.match(/NEXT_LOCALE=([^;]+)/);
    if (match) setLocaleState(match[1]);
    const stored = localStorage.getItem('nexus-theme') as 'light' | 'dark' | null;
    if (stored) {
      setTheme(stored);
      document.documentElement.classList.toggle('dark', stored === 'dark');
    }
  }, []);

  const applyTheme = (next: 'light' | 'dark') => {
    setTheme(next);
    localStorage.setItem('nexus-theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  const handleLocale = async (code: string) => {
    setSaving(true);
    try {
      await setLocale(code);
      setLocaleState(code);
      toast.success(t('languageUpdated'));
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('languageUpdateFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg space-y-8">
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('preferences')}</h1>
        <p className="text-sm text-gray-500 mb-6">{t('preferencesHint')}</p>

        <div className="mb-6">
          <label htmlFor="locale" className="block text-sm font-medium text-gray-700 mb-2">
            {t('language')}
          </label>
          <select
            id="locale"
            value={locale}
            disabled={saving}
            onChange={(e) => handleLocale(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">{t('theme')}</p>
          <div className="flex gap-3">
            {(['light', 'dark'] as const).map((themeKey) => (
              <button
                key={themeKey}
                type="button"
                onClick={() => applyTheme(themeKey)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize transition ${
                  theme === themeKey
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t(themeKey)}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
