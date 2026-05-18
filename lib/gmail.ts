import { google } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'

export function createOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
  )
}

export function getGmailClient(auth: OAuth2Client) {
  return google.gmail({ version: 'v1', auth })
}

type GmailClient = ReturnType<typeof getGmailClient>

// Run promises in small concurrent batches to avoid rate limits
async function inBatches<T>(
  items: string[],
  batchSize: number,
  fn: (id: string) => Promise<T>
): Promise<T[]> {
  const results: T[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize)
    const batch = await Promise.all(chunk.map(fn))
    results.push(...batch)
  }
  return results
}

export async function searchMessageIds(gmail: GmailClient, query: string): Promise<string[]> {
  const ids: string[] = []
  let pageToken: string | undefined

  do {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 500,
      pageToken,
    })
    for (const m of res.data.messages ?? []) {
      if (m.id) ids.push(m.id)
    }
    pageToken = res.data.nextPageToken ?? undefined
  } while (pageToken)

  return ids
}

// Trash has no batch API — use low concurrency (5 at a time)
export async function trashMessages(gmail: GmailClient, ids: string[]): Promise<void> {
  await inBatches(ids, 5, id => gmail.users.messages.trash({ userId: 'me', id }))
}

// batchModify handles up to 1000 messages per request — much more efficient
export async function archiveMessages(gmail: GmailClient, ids: string[]): Promise<void> {
  const BATCH = 1000
  for (let i = 0; i < ids.length; i += BATCH) {
    await gmail.users.messages.batchModify({
      userId: 'me',
      requestBody: { ids: ids.slice(i, i + BATCH), removeLabelIds: ['INBOX'] },
    })
  }
}

export async function markReadMessages(gmail: GmailClient, ids: string[]): Promise<void> {
  const BATCH = 1000
  for (let i = 0; i < ids.length; i += BATCH) {
    await gmail.users.messages.batchModify({
      userId: 'me',
      requestBody: { ids: ids.slice(i, i + BATCH), removeLabelIds: ['UNREAD'] },
    })
  }
}

export async function labelMessages(
  gmail: GmailClient,
  ids: string[],
  labelName: string
): Promise<void> {
  const labelsRes = await gmail.users.labels.list({ userId: 'me' })
  const existing = (labelsRes.data.labels ?? []).find(l => l.name === labelName)

  const labelId = existing?.id ?? (
    await gmail.users.labels.create({
      userId: 'me',
      requestBody: { name: labelName },
    })
  ).data.id!

  const BATCH = 1000
  for (let i = 0; i < ids.length; i += BATCH) {
    await gmail.users.messages.batchModify({
      userId: 'me',
      requestBody: { ids: ids.slice(i, i + BATCH), addLabelIds: [labelId] },
    })
  }
}
