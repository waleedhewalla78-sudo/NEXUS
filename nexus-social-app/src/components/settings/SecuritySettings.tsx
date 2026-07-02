'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { changePassword } from '@/actions/user-settings';

export default function SecuritySettings() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      toast.error('New passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await changePassword(current, next);
      toast.success('Password updated');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Security</h1>
      <p className="text-sm text-gray-500 mb-6">Change your account password.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="current-pw" className="block text-sm font-medium text-gray-700 mb-1">
            Current password
          </label>
          <input
            id="current-pw"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="new-pw" className="block text-sm font-medium text-gray-700 mb-1">
            New password
          </label>
          <input
            id="new-pw"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="confirm-pw" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm new password
          </label>
          <input
            id="confirm-pw"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
