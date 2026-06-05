import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRules, addLog } from '@/lib/storage'
import { createOAuthClient } from '@/lib/gmail'
import { runRules } from '@/lib/engine'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const auth = createOAuthClient()
  auth.setCredentials({ access_token: session.accessToken })

  const rules = await getRules()
  const log = await runRules(auth, rules, 'manual')
  await addLog(log)

  return NextResponse.json(log)
}
