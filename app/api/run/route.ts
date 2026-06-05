import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRules, getRefreshToken, addLog } from '@/lib/storage'
import { createOAuthClient } from '@/lib/gmail'
import { runRules } from '@/lib/engine'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const refreshToken = await getRefreshToken()
  if (!refreshToken) {
    return NextResponse.json(
      { error: 'No refresh token stored. Please sign out and sign back in.' },
      { status: 400 }
    )
  }

  const auth = createOAuthClient()
  auth.setCredentials({ refresh_token: refreshToken })

  const rules = await getRules()
  const log = await runRules(auth, rules, 'manual')
  await addLog(log)

  return NextResponse.json(log)
}
