import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import WorkspaceSetupRequired from '@/components/WorkspaceSetupRequired';

export const dynamic = 'force-dynamic';

function loadSql(filename: string): string {
  try {
    return readFileSync(join(process.cwd(), 'src/sql', filename), 'utf8');
  } catch {
    return `-- Could not load ${filename} from disk`;
  }
}

export default function SetupPage() {
  const bootstrapSql = loadSql('essential_bootstrap.sql');
  const patchSql = loadSql('schema_patch.sql');

  return (
    <section className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-3xl mx-auto mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nexus Social — Database Setup</h1>
        <p className="text-gray-600 mt-2">
          Run these scripts in Supabase SQL Editor, then hard-refresh the app.
        </p>
      </div>
      <WorkspaceSetupRequired bootstrapSql={bootstrapSql} />
      <div className="max-w-3xl mx-auto mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Schema patch (error 42703)</h2>
        <p className="text-sm text-gray-600 mb-4">
          If you see console error <code className="text-xs bg-white px-1 rounded">42703</code> (undefined
          column), run this script after the bootstrap above.
        </p>
        <WorkspaceSetupRequired bootstrapSql={patchSql} />
      </div>
    </section>
  );
}
