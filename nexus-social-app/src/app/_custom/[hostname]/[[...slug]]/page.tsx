import { supabaseAdmin } from '@/lib/supabase/server';

interface CustomDomainPageProps {
  params: Promise<{ hostname: string; slug?: string[] }>;
}

export default async function CustomDomainPage({ params }: CustomDomainPageProps) {
  const { hostname, slug } = await params;
  const path = slug?.join('/') ?? '';

  const { data: branding } = await supabaseAdmin
    .from('workspace_branding')
    .select('workspace_id, logo_url, primary_color, accent_color, custom_domain')
    .eq('custom_domain', hostname)
    .single();

  const primaryColor = branding?.primary_color ?? '#4f46e5';

  return (
    <div className="min-h-screen bg-gray-50" style={{ ['--brand-primary' as string]: primaryColor }}>
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          {branding?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logo_url} alt="" className="h-8 w-auto" />
          ) : (
            <span className="text-lg font-semibold text-gray-900">{hostname}</span>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900">Welcome</h1>
        <p className="mt-4 text-gray-600">
          This is your white-labeled Nexus Social portal
          {path ? ` (${path})` : ''}.
        </p>
        {!branding && (
          <p className="mt-2 text-sm text-amber-700">
            No branding configuration found for this domain. Contact your administrator.
          </p>
        )}
      </main>
    </div>
  );
}
