// NextAuth configuration — landlord-scoped credentials auth.
//
// Key differences from the single-tenant template:
//   1. authorize() reads x-fp-subdomain from the request headers to determine
//      which landlord the login request belongs to.
//   2. Credential lookup uses compound keys (landlordId, email) instead of
//      global unique email.
//   3. Session and JWT both carry landlordId and role.

import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null

        try {
          // Resolve landlord from request headers (set by middleware)
          const subdomain = req.headers?.['x-fp-subdomain'] as string | undefined
          const customDomain = req.headers?.['x-fp-custom-domain'] as string | undefined

          let landlord = null
          if (subdomain) {
            landlord = await prisma.landlord.findUnique({ where: { subdomain } })
          } else if (customDomain) {
            landlord = await prisma.landlord.findUnique({ where: { customDomain } })
          }

          if (!landlord) return null
          if (landlord.status === 'canceled' || landlord.status === 'paused') return null

          const email = credentials.email.toLowerCase().trim()

          // Try admin user first
          const admin = await prisma.user.findFirst({
            where: { landlordId: landlord.id, email },
          })
          if (admin) {
            const valid = await bcrypt.compare(credentials.password, admin.password)
            if (valid) {
              return {
                id: admin.id,
                email: admin.email,
                landlordId: landlord.id,
                role: admin.role,
                firstName: admin.firstName ?? undefined,
                lastName: admin.lastName ?? undefined,
              }
            }
          }

          // Fall back to tenant
          const tenant = await prisma.tenant.findFirst({
            where: { landlordId: landlord.id, email },
          })
          if (tenant) {
            const valid = await bcrypt.compare(credentials.password, tenant.password)
            if (valid) {
              return {
                id: tenant.id,
                email: tenant.email,
                landlordId: landlord.id,
                role: 'tenant',
                firstName: tenant.firstName,
                lastName: tenant.lastName,
              }
            }
          }

          return null
        } catch (err) {
          console.error('[auth] authorize error:', err)
          return null
        }
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 60, // 30 minutes
  },
  jwt: {
    maxAge: 30 * 60,
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.landlordId = user.landlordId
        token.role = user.role
        token.firstName = user.firstName
        token.lastName = user.lastName
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.landlordId = token.landlordId
      session.user.role = token.role
      session.user.firstName = token.firstName as string | undefined
      session.user.lastName = token.lastName as string | undefined
      return session
    },
  },

  pages: {
    signIn: '/tenant/login',
  },

  cookies: {
    // Wildcard domain so the cookie is shared across all *.furnishedportal.com
    // subdomains. In dev (localhost) Next.js defaults to no domain, which is fine.
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain:
          process.env.NODE_ENV === 'production' ? '.furnishedportal.com' : undefined,
      },
    },
  },
}
