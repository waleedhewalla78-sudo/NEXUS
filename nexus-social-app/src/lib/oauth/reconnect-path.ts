export function oauthReconnectPath({
  platform,
  workspaceId,
}: {
  platform: string;
  workspaceId: string;
}): string | null {
  const normalized = platform.trim().toLowerCase();
  if (normalized === 'linkedin') {
    return `/api/oauth/linkedin/start?workspace_id=${encodeURIComponent(workspaceId)}`;
  }
  if (normalized === 'twitter' || normalized === 'x') {
    return `/api/oauth/x/start?workspace_id=${encodeURIComponent(workspaceId)}`;
  }
  if (normalized === 'facebook' || normalized === 'instagram') {
    return `/api/oauth/meta/start?workspace_id=${encodeURIComponent(workspaceId)}`;
  }
  return null;
}
