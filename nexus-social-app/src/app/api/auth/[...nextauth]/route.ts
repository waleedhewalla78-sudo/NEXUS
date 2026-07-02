// INSTALL: npm install next-auth @auth/core
/**
 * Feature 004 Sprint 17 — NextAuth SAML route handler.
 */

import NextAuth, { type AuthOptions } from 'next-auth';
import type { Profile, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import {
  issueSupabaseJwtForUser,
  provisionUserFromSamlAssertion,
  readSamlEnvConfig,
} from '@/lib/auth/enterprise-saml';

const samlConfig = readSamlEnvConfig();

const authConfig: AuthOptions = {
  providers: [
    {
      id: 'saml',
      name: 'Enterprise SAML',
      type: 'oauth',
      issuer: samlConfig.idpEntityId ?? samlConfig.idpMetadataUrl ?? 'https://idp.example.com',
      clientId: process.env.SAML_CLIENT_ID ?? 'nexus-saml-sp',
      clientSecret: process.env.SAML_CLIENT_SECRET ?? '',
      authorization: { params: { scope: 'openid email profile' } },
    } as AuthOptions['providers'] extends (infer P)[] | undefined ? P : never,
  ],
  callbacks: {
    async signIn({ profile }: { profile?: Profile }) {
      if (!profile) return false;
      const attrs = profile as Record<string, string | string[]>;
      await provisionUserFromSamlAssertion({
        email: String(profile.email ?? ''),
        name: String(profile.name ?? ''),
        ...attrs,
      });
      return true;
    },
    async jwt({ token, profile }: { token: JWT; profile?: Profile }) {
      if (profile?.sub) {
        const result = await provisionUserFromSamlAssertion({
          email: String(profile.email ?? token.email ?? ''),
          name: String(profile.name ?? ''),
        });
        token.supabaseToken = await issueSupabaseJwtForUser(result.userId);
        token.userId = result.userId;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.userId as string | undefined,
        },
        supabaseAccessToken: token.supabaseToken as string | undefined,
      };
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authConfig);

export { handler as GET, handler as POST };
