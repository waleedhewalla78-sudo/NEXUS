/**
 * NextAuth route handler — GitHub OAuth for production sign-in.
 */

import NextAuth, { type AuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';

const authConfig: AuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID ?? '',
      clientSecret: process.env.GITHUB_SECRET ?? '',
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET ?? process.env.JWT_SECRET,
};

const handler = NextAuth(authConfig);

export { handler as GET, handler as POST };
