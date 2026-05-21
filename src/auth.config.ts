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
      // /checkout excluded: guests can checkout (F06), security in place-order.ts.
      // /orders/[id] excluded: guests access their order by UUID (getOrderById validates).
      // Only /orders (list) requires auth — guests have no order history.
      const prefixProtected = ['/profile', '/admin'];
      const isProtected =
        prefixProtected.some((path) => nextUrl.pathname.startsWith(path)) ||
        nextUrl.pathname === '/orders';

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
