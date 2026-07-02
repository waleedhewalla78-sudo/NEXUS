import Link from 'next/link';
import { getUserWorkspaceContext } from '@/lib/auth/server-session';
import { createServerComponentClient } from '@/lib/supabase/action';

export const dynamic = 'force-dynamic';

type AgencyRow = {
  id: string;
  name: string;
  slug: string;
  tenant_id: string;
};

type BrandRow = {
  id: string;
  name: string;
  agency_id: string | null;
};

export default async function AgenciesHierarchyPage() {
  const { userId } = await getUserWorkspaceContext();
  const supabase = await createServerComponentClient();

  const { data: memberships } = await supabase
    .from('agency_members')
    .select('agency_id, role')
    .eq('user_id', userId);

  const agencyIds = (memberships ?? []).map((m) => m.agency_id);

  const { data: agencies } = agencyIds.length
    ? await supabase
        .from('agencies')
        .select('id, name, slug, tenant_id')
        .in('id', agencyIds)
        .order('name')
    : { data: [] as AgencyRow[] };

  const { data: brands } = agencyIds.length
    ? await supabase
        .from('brands')
        .select('id, name, agency_id')
        .in('agency_id', agencyIds)
        .order('name')
    : { data: [] as BrandRow[] };

  const brandsByAgency = new Map<string, BrandRow[]>();
  for (const brand of brands ?? []) {
    const key = brand.agency_id ?? 'unassigned';
    const list = brandsByAgency.get(key) ?? [];
    list.push(brand as BrandRow);
    brandsByAgency.set(key, list);
  }

  return (
    <section className="p-6 md:p-10 min-h-screen bg-gray-50 max-w-4xl">
      <div className="mb-8">
        <Link href="/settings" className="text-sm text-indigo-600 hover:underline">
          ← Settings
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">Agency Hierarchy</h1>
        <p className="text-gray-600 mt-1">Agencies and brands visible under your RLS session.</p>
      </div>

      <div className="space-y-4">
        {(agencies ?? []).length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
            No agency memberships found.
          </div>
        ) : (
          (agencies as AgencyRow[]).map((agency) => (
            <div key={agency.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">{agency.name}</h2>
              <p className="text-xs text-gray-400">{agency.slug} · tenant {agency.tenant_id.slice(0, 8)}…</p>
              <ul className="mt-4 space-y-2 border-l-2 border-indigo-100 pl-4">
                {(brandsByAgency.get(agency.id) ?? []).map((brand) => (
                  <li key={brand.id} className="text-sm text-gray-700">
                    {brand.name}
                  </li>
                ))}
                {(brandsByAgency.get(agency.id) ?? []).length === 0 ? (
                  <li className="text-sm text-gray-400 italic">No brands linked</li>
                ) : null}
              </ul>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
