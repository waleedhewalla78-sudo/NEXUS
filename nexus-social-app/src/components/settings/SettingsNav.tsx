'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Globe,
  Shield,
  Sliders,
  User,
  Users,
  Wrench,
} from 'lucide-react';

const LINKS = [
  { href: '/settings/compliance', label: 'Compliance', icon: Shield },
  { href: '/settings', label: 'Integrations', icon: Globe, exact: true },
  { href: '/settings/profile', label: 'Profile', icon: User },
  { href: '/settings/security', label: 'Security', icon: Shield },
  { href: '/settings/preferences', label: 'Preferences', icon: Sliders },
  { href: '/settings/team', label: 'Team', icon: Users },
  { href: '/admin', label: 'Admin', icon: Wrench },
];

export default function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 mb-8 border-b border-gray-200 pb-4">
      {LINKS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
