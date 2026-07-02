import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadKey(): string {
  for (const file of ['.uat-secrets.local', '.env.local']) {
    const p = join(root, file);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      if (line.startsWith('NEXUS_API_KEY=')) return line.slice('NEXUS_API_KEY='.length).trim();
    }
  }
  throw new Error('No NEXUS_API_KEY');
}

async function main() {
  const base = 'http://localhost:3005';
  const apiKey = loadKey();

  const postRes = await fetch(`${base}/api/v1/ai-cmo/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({
      objective: 'Quick auth probe',
      locale: 'en-US',
      persona: 'operator',
    }),
  });
  const postBody = await postRes.text();
  console.log('POST', postRes.status, postBody.slice(0, 200));

  if (postRes.status === 202) {
    const { jobId } = JSON.parse(postBody) as { jobId: string };
    const pollRes = await fetch(`${base}/api/v1/ai-cmo/campaigns/jobs/${jobId}`, {
      headers: { 'x-api-key': apiKey },
    });
    console.log('POLL', pollRes.status, (await pollRes.text()).slice(0, 200));
  }
}

main();
