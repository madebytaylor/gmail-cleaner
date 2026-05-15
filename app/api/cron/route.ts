import { NextResponse } from 'next/server'
import { getRules, getRefreshToken, addLog } from '@/lib/storage'
import { createOAuthClient } from '@/lib/gmail'
import { runRules } from '@/lib/engine'

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const refreshToken = await getRefreshToken()
  if (!refreshToken) {
    return NextResponse.json(
      { error: 'No refresh token. Sign in to the app first.' },
      { status: 400 }
    )
  }

  const auth = createOAuthClient()
  auth.setCredentials({ refresh_token: refreshToken })

  const rules = await getRules()
  const log = await runRules(auth, rules, 'cron')
  await addLog(log)

  return NextResponse.json({ ok: true, processed: log.totalProcessed })
}
