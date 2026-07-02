'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Mail, Bot, Settings, Plus, BarChart3, Repeat, Megaphone } from 'lucide-react';
import { useTranslations } from 'next-intl';

const navItems = [
  { href: '/', key: 'dashboard', icon: Home, tourId: 'nav-dashboard' },
  { href: '/analytics', key: 'analytics', icon: BarChart3, tourId: 'nav-analytics' },
  { href: '/calendar', key: 'calendar', icon: Calendar, tourId: 'nav-calendar' },
  { href: '/posts/create', key: 'createPost', icon: Plus, tourId: 'btn-create-post' },
  { href: '/inbox', key: 'inbox', icon: Mail },
  { href: '/ai-cmo/campaigns/new', key: 'campaigns', icon: Megaphone },
  { href: '/reputation', key: 'reputation', icon: Bot },
  { href: '/automations/builder', key: 'automations', icon: Repeat },
  { href: '/settings/ai-agent', key: 'aiAgent', icon: Bot },
  { href: '/settings', key: 'settings', icon: Settings, tourId: 'nav-settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations('Sidebar');

  return (
    <aside className="sidebar-panel w-64 h-screen bg-white shadow-md flex flex-col p-4">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800">Nexus Social</h2>
      </div>
      <nav className="flex flex-col gap-2" aria-label="Main Navigation">
        {navItems.map(({ href, key, icon: Icon, tourId }) => {
          return (
          <Link
            key={href}
            href={href}
            id={tourId}
            aria-label={t(key)}
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
              ${pathname === href ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Icon className="w-5 h-5" aria-hidden="true" />
            <span>{t(key)}</span>
          </Link>
          );
        })}
      </nav>
    </aside>
  );
}
