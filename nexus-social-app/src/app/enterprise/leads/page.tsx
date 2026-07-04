import LeadsDashboardClient from '@/components/enterprise/LeadsDashboardClient';

export const metadata = {
  title: 'Enterprise Leads — Nexus',
  description: 'Internal dashboard for inbound enterprise leads',
};

export default function EnterpriseLeadsPage() {
  return <LeadsDashboardClient />;
}
