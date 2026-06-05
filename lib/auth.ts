import type { AuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { kv } from '@vercel/kv'

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  const tokens = await res.json()
  if (!res.ok) throw new Error(tokens.error ?? 'Failed to refresh token')
  return tokens as { access_token: string; expires_in: number }
}

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
      // On initial sign-in, store tokens
      if (account) {
        token.accessToken  = account.access_token  ?? undefined
        token.refreshToken = account.refresh_token ?? undefined
        token.expiresAt    = account.expires_at    ?? undefined
        if (account.refresh_token) {
          await kv.set('user:refresh_token', account.refresh_token)
        }
        return token
      }

      // Token still valid (with 60s buffer) — return as-is
      if (token.expiresAt && Date.now() < (token.expiresAt as number) * 1000 - 60_000) {
        return token
      }

      // Token expired — refresh it
      if (token.refreshToken) {
        try {
          const fresh = await refreshAccessToken(token.refreshToken as string)
          token.accessToken = fresh.access_token
          token.expiresAt   = Math.floor(Date.now() / 1000) + fresh.expires_in
        } catch (err) {
          console.error('Token refresh failed:', err)
          token.error = 'RefreshAccessTokenError'
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
