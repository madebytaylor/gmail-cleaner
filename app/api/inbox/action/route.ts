import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createOAuthClient, getGmailClient, trashMessages, archiveMessages, markReadMessages } from '@/lib/gmail'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { messageIds, action } = await req.json() as {
    messageIds: string[]
    action: 'trash' | 'archive' | 'markRead'
  }

  if (!messageIds?.length) {
    return NextResponse.json({ error: 'No message IDs provided' }, { status: 400 })
  }

  const auth = createOAuthClient()
  auth.setCredentials({ access_token: session.accessToken })
  const gmail = getGmailClient(auth)

  const BATCH = 50
  for (let i = 0; i < messageIds.length; i += BATCH) {
    const chunk = messageIds.slice(i, i + BATCH)
    if (action === 'trash')    await trashMessages(gmail, chunk)
    if (action === 'archive')  await archiveMessages(gmail, chunk)
    if (action === 'markRead') await markReadMessages(gmail, chunk)
  }

  return NextResponse.json({ ok: true, processed: messageIds.length })
}
