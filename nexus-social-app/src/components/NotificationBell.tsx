'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { getNotifications, markNotificationRead, type AppNotification } from '@/actions/notifications';
import { useWorkspaceStore } from '@/store/workspace';

export default function NotificationBell() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const refresh = () => {
    if (!workspaceId) return;
    getNotifications(workspaceId).then(setItems).catch(() => setItems([]));
  };

  useEffect(() => {
    refresh();
  }, [workspaceId]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const handleNotificationClick = async (n: AppNotification) => {
    if (!workspaceId || n.read) return;
    await markNotificationRead(workspaceId, n.id);
    setItems((prev) =>
      prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)),
    );
  };

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 transition"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg z-50">
          <div className="border-b border-gray-100 px-4 py-3 flex justify-between items-center">
            <p className="font-semibold text-gray-900">Notifications</p>
            <button
              type="button"
              onClick={refresh}
              className="text-xs text-indigo-600 hover:text-indigo-500"
            >
              Refresh
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-6 text-sm text-gray-500 text-center">No notifications</li>
            ) : (
              items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    onClick={() => {
                      handleNotificationClick(n);
                      setOpen(false);
                    }}
                    className={`block px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 ${
                      n.read ? 'opacity-70' : ''
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
