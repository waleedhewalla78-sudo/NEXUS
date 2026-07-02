'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getUserProfile, updateUserProfile } from '@/actions/user-settings';

export default function ProfileSettings() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getUserProfile()
      .then((p) => {
        setFullName(p.fullName);
        setEmail(p.email);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUserProfile(fullName);
      toast.success('Profile updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-500">Loading profile…</p>;

  return (
    <div className="max-w-lg space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
      <p className="text-sm text-gray-500">Your display name appears on the dashboard welcome banner.</p>
      <div>
        <label htmlFor="full-name" className="block text-sm font-medium text-gray-700 mb-1">
          Display name
        </label>
        <input
          id="full-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="Your name"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input id="email" value={email} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500" />
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save profile'}
      </button>
    </div>
  );
}
