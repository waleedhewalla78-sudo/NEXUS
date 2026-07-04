'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Calendar,
  Mail,
  Bot,
  Settings,
  Plus,
  BarChart3,
  Repeat,
  Megaphone,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { isSaasUiEnabled } from '@/lib/feature-flags';

const saasNavItems = [
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

const enterpriseNavItems = [
  { href: '/enterprise/leads', label: 'Enterprise leads', icon: Users },
  { href: '/settings/integrations', label: 'Integrations', icon: Settings },
  { href: '/ai-cmo/control-plane', label: 'Control plane', icon: Bot },
];

export default function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations('Sidebar');
  const saasUi = isSaasUiEnabled();

  return (
    <aside className="sidebar-panel w-64 h-screen bg-white shadow-md flex flex-col p-4">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800">
          {saasUi ? 'Nexus Social' : 'Nexus Enterprise'}
        </h2>
      </div>
      <nav className="flex flex-col gap-2" aria-label="Main Navigation">
        {saasUi &&
          saasNavItems.map(({ href, key, icon: Icon, tourId }) => (
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
          ))}

        {!saasUi &&
          enterpriseNavItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
              ${pathname === href || pathname?.startsWith(`${href}/`) ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}

        {saasUi && (
          <Link
            href="/enterprise/leads"
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
              ${pathname === '/enterprise/leads' ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Users className="w-5 h-5" aria-hidden="true" />
            <span>Enterprise leads</span>
          </Link>
        )}
      </nav>
    </aside>
  );
}
