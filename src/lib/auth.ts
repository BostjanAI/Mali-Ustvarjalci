import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/prisma';
import { compare } from 'bcryptjs';

const isMock = process.env.AUTH_MODE === 'mock';

// Load Prisma adapter dynamically only when needed to avoid requiring the package in mock mode
let adapter: NextAuthOptions['adapter'] = undefined;
if (!isMock) {
  try {
    // Top-level await is supported in Next.js server code
    const mod = await import('@next-auth/prisma-adapter');
    adapter = mod.PrismaAdapter(prisma) as any;
  } catch {
    // Adapter optional; if package not installed, fall back to JWT sessions
    adapter = undefined;
  }
}

export const authOptions: NextAuthOptions = {
  // Use adapter only when available
  adapter,
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        if (isMock) {
          const adminEmail = process.env.MOCK_ADMIN_EMAIL || 'admin@example.com';
          const adminPassword = process.env.MOCK_ADMIN_PASSWORD || 'admin123';
          if (credentials.email === adminEmail && credentials.password === adminPassword) {
            return { id: 'mock-admin', email: adminEmail, name: 'Admin', role: 'admin' } as any;
          }
          // Simple user fallback in mock mode
          if (credentials.password === 'password') {
            return { id: 'mock-user', email: credentials.email, name: 'User', role: 'customer' } as any;
          }
          return null;
        }
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user?.passwordHash) return null;
        const ok = await compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role } as any;
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && !isMock
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as any).role;
      return token as any;
    },
    async session({ session, token }) {
      if (token) (session as any).user.role = (token as any).role;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};



