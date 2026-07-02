import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  const { data: workspace } = await supabaseAdmin
    .from('workspaces')
    .select('tenant_id')
    .eq('id', auth.workspaceId)
    .maybeSingle();

  const tenantId = workspace?.tenant_id;
  if (!tenantId) {
    return NextResponse.json({ agencies: [], brands: [] });
  }

  const [{ data: agencies }, { data: brands }, { data: budgets }] = await Promise.all([
    supabaseAdmin.from('agencies').select('id, name, slug').eq('tenant_id', tenantId),
    supabaseAdmin
      .from('brands')
      .select('id, name, agency_id, monthly_budget_usd')
      .eq('tenant_id', tenantId),
    supabaseAdmin
      .from('ai_cmo_budget_policies')
      .select('brand_id, monthly_cap_usd, workspace_id')
      .eq('workspace_id', auth.workspaceId),
  ]);

  const spendByBrand = new Map<string, number>();
  const { data: ledger } = await supabaseAdmin
    .from('ai_cmo_cost_ledger')
    .select('brand_id, amount_usd')
    .eq('workspace_id', auth.workspaceId);

  for (const row of ledger ?? []) {
    if (!row.brand_id) continue;
    spendByBrand.set(row.brand_id, (spendByBrand.get(row.brand_id) ?? 0) + Number(row.amount_usd ?? 0));
  }

  const revenueByBrand = new Map<string, number>();
  const { data: outcomes } = await supabaseAdmin
    .from('ai_cmo_campaign_outcomes')
    .select('campaign_id, revenue_attributed')
    .eq('workspace_id', auth.workspaceId);

  const { data: campaigns } = await supabaseAdmin
    .from('ai_cmo_campaigns')
    .select('id, brand_id')
    .eq('workspace_id', auth.workspaceId);

  const campaignBrand = new Map(
    (campaigns ?? []).map((c) => [c.id as string, c.brand_id as string | null]),
  );

  for (const row of outcomes ?? []) {
    const brandId = campaignBrand.get(String(row.campaign_id));
    if (!brandId) continue;
    revenueByBrand.set(
      brandId,
      (revenueByBrand.get(brandId) ?? 0) + Number(row.revenue_attributed ?? 0),
    );
  }

  const budgetByBrand = new Map(
    (budgets ?? []).map((b) => [b.brand_id as string, Number(b.monthly_cap_usd ?? 0)]),
  );

  const portfolio = (brands ?? []).map((brand) => {
    const spend = spendByBrand.get(brand.id) ?? 0;
    const revenue = revenueByBrand.get(brand.id) ?? 0;
    const budget = budgetByBrand.get(brand.id) ?? Number(brand.monthly_budget_usd ?? 0);
    const projectedRoi = spend > 0 ? (revenue - spend) / spend : revenue > 0 ? 1 : 0;
    const agency = (agencies ?? []).find((a) => a.id === brand.agency_id);

    return {
      brandId: brand.id,
      brandName: brand.name,
      agencyId: brand.agency_id,
      agencyName: agency?.name ?? null,
      budgetUsd: budget,
      spendUsd: Number(spend.toFixed(2)),
      revenueUsd: Number(revenue.toFixed(2)),
      projectedRoi: Number(projectedRoi.toFixed(4)),
    };
  });

  const agencyRollup = (agencies ?? []).map((agency) => {
    const agencyBrands = portfolio.filter((p) => p.agencyId === agency.id);
    return {
      agencyId: agency.id,
      agencyName: agency.name,
      budgetUsd: agencyBrands.reduce((s, b) => s + b.budgetUsd, 0),
      spendUsd: agencyBrands.reduce((s, b) => s + b.spendUsd, 0),
      revenueUsd: agencyBrands.reduce((s, b) => s + b.revenueUsd, 0),
      projectedRoi:
        agencyBrands.reduce((s, b) => s + b.spendUsd, 0) > 0
          ? Number(
              (
                (agencyBrands.reduce((s, b) => s + b.revenueUsd, 0) -
                  agencyBrands.reduce((s, b) => s + b.spendUsd, 0)) /
                agencyBrands.reduce((s, b) => s + b.spendUsd, 0)
              ).toFixed(4),
            )
          : 0,
      brands: agencyBrands,
    };
  });

  return NextResponse.json({
    workspaceId: auth.workspaceId,
    tenantId,
    agencies: agencyRollup,
    portfolio,
  });
}
