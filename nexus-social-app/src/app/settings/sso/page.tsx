import SsoSettingsForm from '@/components/settings/SsoSettingsForm';

export default function SsoSettingsPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Enterprise SSO</h1>
      <p className="text-gray-600 mb-8">
        Configure SAML or OAuth settings for this workspace. Provider credentials are stored per workspace
        and should also be registered in the Supabase Auth dashboard.
      </p>
      <SsoSettingsForm />
    </div>
  );
}
