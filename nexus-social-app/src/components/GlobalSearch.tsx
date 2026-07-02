'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { globalSearch, type SearchResult } from '@/actions/search';
import { useWorkspaceStore } from '@/store/workspace';

export default function GlobalSearch() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const t = useTranslations('Navbar');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(async (value: string) => {
    if (!workspaceId || value.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      setResults(await globalSearch(workspaceId, value));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      runSearch(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <div className="relative hidden md:block" ref={ref}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          aria-controls="global-search-results"
          role="combobox"
          aria-expanded={open}
          className="rounded-lg border border-gray-300 pl-9 pr-3 py-1.5 text-sm text-gray-700 w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {open && query.trim().length >= 2 && (
        <div
          id="global-search-results"
          className="absolute left-0 top-full mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg z-50"
        >
          {loading ? (
            <p className="px-4 py-3 text-sm text-gray-500">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500">No results for &ldquo;{query}&rdquo;</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {results.map((r) => (
                <li key={r.id}>
                  <Link
                    href={r.href}
                    onClick={() => {
                      setOpen(false);
                      setQuery('');
                    }}
                    className="block px-4 py-2.5 hover:bg-gray-50"
                  >
                    <p className="text-sm font-medium text-gray-900">{r.title}</p>
                    {r.subtitle && (
                      <p className="text-xs text-gray-500 mt-0.5 capitalize">{r.type} · {r.subtitle}</p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
