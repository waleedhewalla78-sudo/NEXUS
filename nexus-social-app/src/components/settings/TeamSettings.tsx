'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useWorkspaceStore } from '@/store/workspace';
import {
  addTeamMemberByEmail,
  listPendingInvites,
  listTeamMembers,
  updateMemberRole,
  type MemberRole,
  type PendingInvite,
  type TeamMember,
} from '@/actions/team-management';

export default function TeamSettings() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('member');
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const [memberList, pending] = await Promise.all([
        listTeamMembers(workspaceId),
        listPendingInvites(workspaceId),
      ]);
      setMembers(memberList);
      setInvites(pending);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    setInviting(true);
    try {
      const result = await addTeamMemberByEmail(workspaceId, email, inviteRole);
      toast.success(
        result.status === 'invited'
          ? 'Invitation email sent'
          : 'Team member added',
      );
      setEmail('');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invite failed');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: MemberRole) => {
    if (!workspaceId) return;
    try {
      await updateMemberRole(workspaceId, memberId, role);
      toast.success('Role updated');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  if (!workspaceId) return null;
  if (loading) return <p className="text-gray-500">Loading team…</p>;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Team &amp; access</h1>
        <p className="text-sm text-gray-500">
          Invite teammates by email. New users receive a Supabase invite link; existing users are added immediately.
        </p>
      </div>

      <form onSubmit={handleInvite} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 mb-1">
            Invite by email
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="colleague@company.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <select
            id="invite-role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as MemberRole)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={inviting}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {inviting ? 'Sending…' : 'Send invite'}
        </button>
      </form>

      {invites.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900 mb-2">Pending invitations</h2>
          <ul className="space-y-1 text-sm text-amber-800">
            {invites.map((inv) => (
              <li key={inv.id}>
                {inv.email} · {inv.role} · sent {new Date(inv.created_at).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3 text-gray-900">{m.email}</td>
                <td className="px-4 py-3">
                  {m.role === 'owner' ? (
                    <span className="capitalize font-medium">{m.role}</span>
                  ) : (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.id, e.target.value as MemberRole)}
                      className="rounded border border-gray-300 px-2 py-1 text-sm capitalize"
                    >
                      <option value="member">member</option>
                      <option value="admin">admin</option>
                    </select>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(m.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
