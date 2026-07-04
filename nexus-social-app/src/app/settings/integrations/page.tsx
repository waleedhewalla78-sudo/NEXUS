import SettingsHub from '@/components/settings/SettingsHub';

export const metadata = {
  title: 'Integrations — Nexus',
  description: 'Connect LinkedIn, Meta, and CRM channels for GTM demos',
};

/**
 * Sprint 3 GTM — canonical integrations URL used in Hermes verify step.
 * Renders the same SettingsHub (publishing channels + OAuth connect).
 */
export default function IntegrationsPage() {
  return <SettingsHub />;
}
