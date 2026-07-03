import { ComplianceSettings } from '@/components/settings/ComplianceSettings';
import SettingsNav from '@/components/settings/SettingsNav';

export const dynamic = 'force-dynamic';

export default function ComplianceSettingsPage() {
  return (
    <div className="p-6 md:p-10">
      <SettingsNav />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Compliance</h1>
      <ComplianceSettings />
    </div>
  );
}
