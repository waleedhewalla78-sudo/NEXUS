import SettingsNav from '@/components/settings/SettingsNav';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="p-6 md:p-10 min-h-screen bg-gray-50">
      <SettingsNav />
      {children}
    </section>
  );
}
