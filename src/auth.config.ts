/**
 * auth.config.ts — Edge-compatible configuration
 * No Node.js-only imports (bcryptjs, prisma, etc.)
 * Used by: middleware.ts (Edge Runtime)
 * For full auth with providers: see auth.ts
 */
import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/auth/login',
    newUser: '/auth/new-account',
  },

  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const protectedPaths = ['/checkout', '/orders', '/profile', '/admin'];
      const isProtected = protectedPaths.some((path) =>
        nextUrl.pathname.startsWith(path)
      );

      if (isProtected && !isLoggedIn) {
        return Response.redirect(
          new URL(`/auth/login?callbackUrl=${nextUrl.pathname}`, nextUrl)
        );
      }

      return true;
    },

    jwt({ token, user }) {
      if (user) {
        token.data = user;
      }
      return token;
    },

    session({ session, token }) {
      session.user = token.data as typeof session.user;
      return session;
    },
  },

  providers: [],
};
