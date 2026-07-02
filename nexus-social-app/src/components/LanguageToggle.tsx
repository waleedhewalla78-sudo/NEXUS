'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setLocale } from '@/actions/user-settings';

export default function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('Navbar');
  const [pending, setPending] = useState(false);

  const switchTo = async (code: 'en' | 'ar') => {
    if (code === locale || pending) return;
    setPending(true);
    try {
      await setLocale(code);
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className="inline-flex items-center rounded-lg border border-gray-300 overflow-hidden text-sm font-medium"
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        disabled={pending}
        onClick={() => switchTo('en')}
        className={`px-2.5 py-1.5 transition ${
          locale === 'en' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
        } disabled:opacity-50`}
      >
        {t('languageEn')}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => switchTo('ar')}
        className={`px-2.5 py-1.5 transition border-s border-gray-300 ${
          locale === 'ar' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
        } disabled:opacity-50`}
      >
        {t('languageAr')}
      </button>
    </div>
  );
}
