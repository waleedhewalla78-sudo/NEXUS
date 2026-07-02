'use client';

import { useState } from 'react';
import { copilotChat } from '@/actions/copilot';
import { useWorkspaceStore } from '@/store/workspace';

export default function CopilotPage() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ role: 'user' | 'assistant'; text: string; meta?: string }>>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId || !message.trim()) return;
    const userMsg = message.trim();
    setMessage('');
    setLoading(true);
    setError(null);
    setHistory((h) => [...h, { role: 'user', text: userMsg }]);

    try {
      const result = await copilotChat({
        workspaceId,
        message: userMsg,
        conversationHistory: history.filter((h) => h.role === 'user').map((h) => h.text),
      });
      setHistory((h) => [
        ...h,
        {
          role: 'assistant',
          text: result.reply,
          meta: `${result.intent} · ${result.provider} · ${result.modelUsed}`,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Copilot failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="p-6 md:p-10 min-h-screen bg-gray-50 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Nexus Copilot</h1>
      <p className="text-gray-600 mb-6">
        Local Ollama-backed assistant. Routes to Strategic Brain, Creator, Radar, Quant, Finance, and inbox agents.
      </p>

      <div className="rounded-xl border border-gray-200 bg-white p-4 mb-4 min-h-[320px] space-y-3">
        {history.length === 0 ? (
          <p className="text-sm text-gray-400">Try: &quot;Plan a summer campaign for UAE&quot; or &quot;agent status&quot;</p>
        ) : (
          history.map((item, i) => (
            <div
              key={i}
              className={`rounded-lg px-3 py-2 text-sm ${
                item.role === 'user' ? 'bg-indigo-50 text-indigo-900 ml-8' : 'bg-gray-100 text-gray-800 mr-8'
              }`}
            >
              <p className="whitespace-pre-wrap">{item.text}</p>
              {item.meta ? <p className="text-xs text-gray-500 mt-1">{item.meta}</p> : null}
            </div>
          ))
        )}
      </div>

      {error ? <p className="text-sm text-red-600 mb-2">{error}</p> : null}

      <form onSubmit={(e) => void handleSubmit(e)} className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask Copilot…"
          disabled={loading || !workspaceId}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
        />
        <button
          type="submit"
          disabled={loading || !workspaceId}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-white font-medium disabled:opacity-50"
        >
          {loading ? '…' : 'Send'}
        </button>
      </form>
    </section>
  );
}
