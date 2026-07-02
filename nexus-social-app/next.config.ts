import path from 'node:path';
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  turbopack: {
    root: path.join(__dirname),
  },
};

import { withSentryConfig } from '@sentry/nextjs';

export default withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  org: "nexus-social",
  project: "nexus-social-app",
  widenClientFileUpload: true,
  sourcemaps: {
    disable: true
  }
});
