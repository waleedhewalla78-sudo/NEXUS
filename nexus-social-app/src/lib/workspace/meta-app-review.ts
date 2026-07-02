export type MetaAppReviewStatus = 'pending' | 'approved' | 'rejected';

export const metaAppReviewUtils = {
  isMetaPlatform(platform: string): boolean {
    const normalized = platform.trim().toLowerCase();
    return normalized === 'facebook' || normalized === 'instagram';
  },

  canPublishToMeta(status: MetaAppReviewStatus | null | undefined): boolean {
    return status === 'approved';
  },

  statusLabel(status: MetaAppReviewStatus | null | undefined): string {
    switch (status) {
      case 'approved':
        return 'Approved — ready to publish';
      case 'rejected':
        return 'Rejected — contact Meta support';
      default:
        return 'Pending Meta App Review';
    }
  },
};
