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

export async function trashMessages(gmail: GmailClient, ids: string[]): Promise<void> {
  await Promise.all(ids.map(id => gmail.users.messages.trash({ userId: 'me', id })))
}

export async function archiveMessages(gmail: GmailClient, ids: string[]): Promise<void> {
  await Promise.all(
    ids.map(id =>
      gmail.users.messages.modify({
        userId: 'me',
        id,
        requestBody: { removeLabelIds: ['INBOX'] },
      })
    )
  )
}

export async function markReadMessages(gmail: GmailClient, ids: string[]): Promise<void> {
  await Promise.all(
    ids.map(id =>
      gmail.users.messages.modify({
        userId: 'me',
        id,
        requestBody: { removeLabelIds: ['UNREAD'] },
      })
    )
  )
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

  await Promise.all(
    ids.map(id =>
      gmail.users.messages.modify({
        userId: 'me',
        id,
        requestBody: { addLabelIds: [labelId] },
      })
    )
  )
}
