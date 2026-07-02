'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function AiCmoNav() {
  const t = useTranslations('Nav');

  const links = [
    { href: '/ai-ops', label: t('aiOps') },
    { href: '/ai-cmo/control-plane', label: t('controlPlane') },
    { href: '/ai-cmo/abm', label: t('abm') },
    { href: '/ai-cmo/attribution', label: t('attribution') },
    { href: '/ai-cmo/campaigns/new', label: t('briefWizard') },
    { href: '/ai-cmo/intelligence', label: t('intelligence') },
    { href: '/ai-cmo/approvals', label: t('approvals') },
  ];

  return (
    <nav className="border-b border-gray-200 bg-white px-6 py-2 flex flex-wrap gap-4 text-sm">
      {links.map(({ href, label }) => (
        <Link key={href} href={href} className="text-gray-600 hover:text-indigo-600">
          {label}
        </Link>
      ))}
    </nav>
  );
}
