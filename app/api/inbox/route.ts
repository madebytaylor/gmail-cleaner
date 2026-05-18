import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createOAuthClient, getGmailClient } from '@/lib/gmail'

interface SenderGroup {
  email: string
  name: string
  count: number
  messageIds: string[]
  sample: string[]  // sample subject lines
}

function parseFrom(from: string): { name: string; email: string } {
  const match = from.match(/^"?([^"<]+?)"?\s*<([^>]+)>\s*$/)
  if (match) return { name: match[1].trim(), email: match[2].trim().toLowerCase() }
  return { name: from.trim(), email: from.trim().toLowerCase() }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const pageToken = searchParams.get('pageToken') ?? undefined

  const auth = createOAuthClient()
  auth.setCredentials({ access_token: session.accessToken })
  const gmail = getGmailClient(auth)

  // 1. Fetch a page of message IDs from Primary inbox
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: 'in:inbox category:primary',
    maxResults: 500,
    pageToken,
  })

  const messages = listRes.data.messages ?? []
  const nextPageToken = listRes.data.nextPageToken ?? null
  const total = listRes.data.resultSizeEstimate ?? 0

  if (messages.length === 0) {
    return NextResponse.json({ senders: [], nextPageToken: null, total: 0 })
  }

  // 2. Batch-fetch From + Subject headers (50 at a time in parallel)
  const CHUNK = 50
  const metaMap = new Map<string, { from: string; subject: string }>()

  for (let i = 0; i < messages.length; i += CHUNK) {
    const chunk = messages.slice(i, i + CHUNK)
    const results = await Promise.all(
      chunk.map(m =>
        gmail.users.messages.get({
          userId: 'me',
          id: m.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject'],
        })
      )
    )
    for (const res of results) {
      const headers = res.data.payload?.headers ?? []
      const from    = headers.find(h => h.name === 'From')?.value ?? ''
      const subject = headers.find(h => h.name === 'Subject')?.value ?? '(no subject)'
      metaMap.set(res.data.id!, { from, subject })
    }
  }

  // 3. Group by sender email
  const groups = new Map<string, SenderGroup>()

  metaMap.forEach((meta, id) => {
    const { name, email } = parseFrom(meta.from)
    const existing = groups.get(email)
    if (existing) {
      existing.count++
      existing.messageIds.push(id)
      if (existing.sample.length < 3) existing.sample.push(meta.subject)
    } else {
      groups.set(email, {
        email,
        name: name || email,
        count: 1,
        messageIds: [id],
        sample: [meta.subject],
      })
    }
  })

  // 4. Sort by count descending
  const senders = Array.from(groups.values()).sort((a, b) => b.count - a.count)

  return NextResponse.json({ senders, nextPageToken, total })
}
