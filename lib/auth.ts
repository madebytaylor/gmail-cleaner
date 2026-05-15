import type { AuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { kv } from '@vercel/kv'

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.modify',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token ?? undefined
        token.refreshToken = account.refresh_token ?? undefined
        if (account.refresh_token) {
          await kv.set('user:refresh_token', account.refresh_token)
        }
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      return session
    },
  },
}
