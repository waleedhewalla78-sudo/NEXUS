'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
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
  Brain,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { isSaasUiEnabled } from '@/lib/feature-flags';

const saasNavItems = [
  { href: '/intelligence', key: 'intelligence', icon: Brain, label: 'Intelligence' },
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
  { href: '/intelligence', label: 'Intelligence', icon: Brain },
  { href: '/enterprise/leads', label: 'Enterprise leads', icon: Users },
  { href: '/settings/integrations', label: 'Integrations', icon: Settings },
  { href: '/ai-cmo/control-plane', label: 'Control plane', icon: Bot },
];

export default function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations('Sidebar');
  const saasUi = isSaasUiEnabled();
  const [collapsed, setCollapsed] = useState(false);

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2 rounded-md transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
      active ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100'
    } ${collapsed ? 'justify-center' : ''}`;

  return (
    <aside
      className={`sidebar-panel h-screen bg-white shadow-md flex flex-col p-4 transition-all ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className={`mb-6 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <h2 className="text-xl font-bold text-gray-800">
            {saasUi ? 'Nexus Social' : 'Nexus Enterprise'}
          </h2>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>
      <nav className="flex flex-col gap-2" aria-label="Main Navigation">
        {saasUi &&
          saasNavItems.map(({ href, key, icon: Icon, tourId, label }) => {
            const active = pathname === href || pathname?.startsWith(`${href}/`);
            const text = label ?? t(key);
            return (
              <Link
                key={href}
                href={href}
                id={tourId}
                aria-label={text}
                title={collapsed ? text : undefined}
                className={linkClass(Boolean(active))}
              >
                <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                {!collapsed && <span>{text}</span>}
              </Link>
            );
          })}

        {!saasUi &&
          enterpriseNavItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname?.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                title={collapsed ? label : undefined}
                className={linkClass(Boolean(active))}
              >
                <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}

        {saasUi && (
          <Link
            href="/enterprise/leads"
            title={collapsed ? 'Enterprise leads' : undefined}
            className={linkClass(pathname === '/enterprise/leads')}
          >
            <Users className="w-5 h-5 shrink-0" aria-hidden="true" />
            {!collapsed && <span>Enterprise leads</span>}
          </Link>
        )}
      </nav>
    </aside>
  );
}
