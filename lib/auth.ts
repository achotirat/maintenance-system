import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined
        if (!email || !password) return null

        const user = await prisma.user.findUnique({
          where: { email },
          include: { memberships: true },
        })
        if (!user) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          memberships: user.memberships.map((m) => ({
            organizationId: m.organizationId,
            role: m.role,
          })),
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.memberships = (user as { memberships?: unknown }).memberships
      }
      return token
    },
    async session({ session, token }) {
      ;(session as { memberships?: unknown }).memberships = token.memberships
      return session
    },
  },
})
