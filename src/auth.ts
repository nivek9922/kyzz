import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcryptjs from 'bcryptjs';
import { z } from 'zod';

import { authConfig } from './auth.config';
import prisma from './lib/prisma';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  trustHost: true,
  providers: [
    Google,
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (!parsedCredentials.success) return null;

        const { email, password } = parsedCredentials.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        // Google-only accounts have no password — block credentials login
        if (!user || !user.password) return null;

        if (!bcryptjs.compareSync(password, user.password)) return null;

        const { password: _, ...rest } = user;
        return rest;
      },
    }),
  ],
  callbacks: {
    async signIn({ account, user }) {
      if (account?.provider !== 'google') return true;

      await prisma.user.upsert({
        where: { email: user.email! },
        update: { image: user.image ?? undefined },
        create: {
          email:    user.email!,
          name:     user.name  ?? 'Usuario KYZZ',
          image:    user.image ?? null,
          password: null,
        },
      });

      return true;
    },

    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === 'google') {
          // Fetch our DB user to get the correct id and role
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
          });
          token.data = dbUser ?? user;
        } else {
          token.data = user;
        }
      }
      return token;
    },

    session({ session, token }) {
      session.user = token.data as typeof session.user;
      return session;
    },
  },
});
