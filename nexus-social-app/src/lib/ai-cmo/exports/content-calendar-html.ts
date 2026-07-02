export type CalendarExportEntry = {
  date: string;
  campaignName: string;
  campaignStatus: string;
  contentPreview: string;
  platform?: string;
  scheduledAt?: string | null;
};

export type CalendarExportInput = {
  workspaceName: string;
  generatedAt: string;
  rangeStart: string;
  rangeEnd: string;
  entries: CalendarExportEntry[];
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildContentCalendarHtml(input: CalendarExportInput): string {
  const rows = input.entries
    .map(
      (e) => `
    <tr>
      <td>${escapeHtml(e.date)}</td>
      <td>${escapeHtml(e.campaignName)}</td>
      <td><span class="status">${escapeHtml(e.campaignStatus)}</span></td>
      <td>${escapeHtml(e.platform ?? '—')}</td>
      <td>${escapeHtml(e.scheduledAt ? new Date(e.scheduledAt).toLocaleString() : '—')}</td>
      <td class="preview">${escapeHtml(e.contentPreview.slice(0, 200))}</td>
    </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.workspaceName)} — Content Calendar</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; color: #111; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    .meta { color: #555; font-size: 0.875rem; margin-bottom: 1.5rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th, td { border: 1px solid #ddd; padding: 0.5rem 0.75rem; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; }
    .status { font-weight: 600; text-transform: capitalize; }
    .preview { max-width: 320px; white-space: pre-wrap; }
    @media print { body { margin: 0.5in; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(input.workspaceName)} — 30-Day Content Calendar</h1>
  <p class="meta">Generated ${escapeHtml(new Date(input.generatedAt).toLocaleString())} · Range ${escapeHtml(input.rangeStart)} → ${escapeHtml(input.rangeEnd)} · ${input.entries.length} item(s)</p>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Campaign</th>
        <th>Status</th>
        <th>Platform</th>
        <th>Scheduled</th>
        <th>Content preview</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="6">No campaigns in range.</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;
}
