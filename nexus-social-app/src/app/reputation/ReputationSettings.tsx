'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-hot-toast';
import {
  deleteListeningQuery,
  saveListeningQuery,
  type ListeningQuery,
} from '@/actions/reputation';

const QUERY_TYPES = [
  { value: 'keyword', label: 'Keyword' },
  { value: 'hashtag', label: 'Hashtag' },
  { value: 'handle', label: 'Owned handle' },
  { value: 'competitor_url', label: 'Competitor URL' },
] as const;

const PLATFORM_OPTIONS = ['twitter', 'linkedin', 'reddit', 'facebook'];

type ReputationSettingsProps = {
  workspaceId: string;
  userId: string;
  initialQueries: ListeningQuery[];
};

export function ReputationSettings({
  workspaceId,
  userId,
  initialQueries,
}: ReputationSettingsProps) {
  const [queries, setQueries] = useState<ListeningQuery[]>(initialQueries);
  const [queryText, setQueryText] = useState('');
  const [queryType, setQueryType] = useState<(typeof QUERY_TYPES)[number]['value']>('keyword');
  const [platforms, setPlatforms] = useState<string[]>(['twitter']);
  const [isPending, startTransition] = useTransition();

  const togglePlatform = (platform: string) => {
    setPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
    );
  };

  const handleAdd = () => {
    if (!queryText.trim()) {
      toast.error('Enter a keyword, handle, or competitor URL');
      return;
    }

    startTransition(async () => {
      try {
        const created = await saveListeningQuery({
          workspaceId,
          userId,
          queryText: queryText.trim(),
          queryType,
          platforms,
        });
        setQueries((prev) => [created, ...prev]);
        setQueryText('');
        toast.success('Listening target saved');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save target');
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteListeningQuery({ id, workspaceId, userId });
        setQueries((prev) => prev.filter((q) => q.id !== id));
        toast.success('Target removed');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to remove target');
      }
    });
  };

  return (
    <section className="mb-8 rounded-2xl border border-white/10 bg-[#161622]/80 p-6 backdrop-blur-xl">
      <h2 className="mb-2 text-xl font-semibold">Listening &amp; competitor targets</h2>
      <p className="mb-4 text-sm text-gray-400">
        Configure owned handles and competitor profiles for social listening ingestion.
      </p>

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="query-type" className="mb-1 block text-sm text-gray-300">
            Target type
          </label>
          <select
            id="query-type"
            value={queryType}
            onChange={(e) => setQueryType(e.target.value as typeof queryType)}
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
          >
            {QUERY_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="query-text" className="mb-1 block text-sm text-gray-300">
            Value
          </label>
          <input
            id="query-text"
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="@brand or https://competitor.com"
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500"
          />
        </div>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-sm text-gray-300">Platforms</p>
        <div className="flex flex-wrap gap-2">
          {PLATFORM_OPTIONS.map((platform) => (
            <label key={platform} className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={platforms.includes(platform)}
                onChange={() => togglePlatform(platform)}
                className="rounded border-gray-500"
              />
              {platform}
            </label>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={isPending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        {isPending ? 'Saving…' : 'Add target'}
      </button>

      {queries.length > 0 && (
        <ul className="mt-6 divide-y divide-white/10 rounded-lg border border-white/10">
          {queries.map((query) => (
            <li key={query.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <div>
                <span className="font-medium text-gray-200">{query.query_text}</span>
                <span className="ml-2 rounded bg-white/10 px-2 py-0.5 text-xs text-gray-400">
                  {query.query_type}
                </span>
                <p className="mt-1 text-xs text-gray-500">
                  {(query.platforms ?? []).join(', ') || 'all platforms'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(query.id)}
                disabled={isPending}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
