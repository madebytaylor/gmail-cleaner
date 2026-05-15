import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRules, saveRules } from '@/lib/storage'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const rules = await getRules()
  const idx = rules.findIndex(r => r.id === params.id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  rules[idx] = { ...rules[idx], ...body }
  await saveRules(rules)
  return NextResponse.json(rules[idx])
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rules = await getRules()
  await saveRules(rules.filter(r => r.id !== params.id))
  return NextResponse.json({ ok: true })
}
