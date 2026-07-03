'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Shield } from 'lucide-react';
import {
  getComplianceProfileSettings,
  saveComplianceProfileSettings,
} from '@/actions/compliance-profile';
import type { ComplianceProfileId } from '@/lib/governance/compliance-profiles/mena-v1';

export function ComplianceSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<ComplianceProfileId>('global_default');
  const [catalog, setCatalog] = useState<
    Array<{ id: ComplianceProfileId; label: string; description: string }>
  >([]);

  useEffect(() => {
    setLoading(true);
    getComplianceProfileSettings()
      .then((data) => {
        setProfileId(data.profileId);
        setCatalog(
          Object.values(data.catalog).map((c) => ({
            id: c.id,
            label: c.label,
            description: c.description,
          })),
        );
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load compliance profile'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const result = await saveComplianceProfileSettings(profileId);
      if (!result.ok) throw new Error(result.error);
      toast.success('Compliance profile updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-gray-500">Loading compliance settings…</p>;
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <Shield className="h-5 w-5 text-indigo-500" />
        Compliance profile
      </h2>
      <p className="text-sm text-gray-600 mt-1 mb-4">
        MENA pack injects PDPL/DPL rules into the Compliance agent and executive audit PDF attestation.
      </p>
      <div className="space-y-3">
        {catalog.map((option) => (
          <label
            key={option.id}
            className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer ${
              profileId === option.id ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-200'
            }`}
          >
            <input
              type="radio"
              name="compliance_profile"
              value={option.id}
              checked={profileId === option.id}
              onChange={() => setProfileId(option.id as ComplianceProfileId)}
              className="mt-1"
            />
            <span>
              <span className="font-medium text-gray-900">{option.label}</span>
              <span className="block text-sm text-gray-500 mt-0.5">{option.description}</span>
            </span>
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save compliance profile'}
      </button>
    </section>
  );
}
