import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRules, saveRules } from '@/lib/storage'
import { v4 as uuidv4 } from 'uuid'
import type { NewRule } from '@/types'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await getRules())
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as NewRule
  const rules = await getRules()
  const rule = { ...body, id: uuidv4(), createdAt: new Date().toISOString() }
  await saveRules([...rules, rule])
  return NextResponse.json(rule, { status: 201 })
}
