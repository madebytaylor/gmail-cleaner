import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRefreshToken } from '@/lib/storage'
import { createOAuthClient } from '@/lib/gmail'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const refreshToken = await getRefreshToken()

  // Try to get a fresh access token using the stored refresh token
  let tokenTestResult = 'not attempted'
  if (refreshToken) {
    try {
      const auth = createOAuthClient()
      auth.setCredentials({ refresh_token: refreshToken })
      const { credentials } = await auth.refreshAccessToken()
      tokenTestResult = credentials.access_token ? 'success' : 'no access token returned'
    } catch (err) {
      tokenTestResult = err instanceof Error ? err.message : String(err)
    }
  }

  return NextResponse.json({
    signedIn: true,
    sessionEmail: session.user?.email,
    sessionHasAccessToken: !!session.accessToken,
    sessionAccessTokenPreview: session.accessToken?.slice(0, 20) + '...',
    kvHasRefreshToken: !!refreshToken,
    kvRefreshTokenPreview: refreshToken?.slice(0, 20) + '...',
    tokenRefreshTest: tokenTestResult,
  })
}
