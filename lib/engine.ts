import { v4 as uuidv4 } from 'uuid'
import type { OAuth2Client } from 'google-auth-library'
import type { Rule, RunLog, RuleResult } from '@/types'
import {
  getGmailClient,
  searchMessageIds,
  trashMessages,
  archiveMessages,
  markReadMessages,
  labelMessages,
} from './gmail'

const BATCH = 50

async function applyAction(
  gmail: ReturnType<typeof getGmailClient>,
  ids: string[],
  rule: Rule
): Promise<void> {
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH)
    switch (rule.action) {
      case 'trash':    await trashMessages(gmail, chunk);    break
      case 'archive':  await archiveMessages(gmail, chunk);  break
      case 'markRead': await markReadMessages(gmail, chunk); break
      case 'label':
        if (rule.labelName) await labelMessages(gmail, chunk, rule.labelName)
        break
    }
  }
}

export async function runRules(
  auth: OAuth2Client,
  rules: Rule[],
  triggeredBy: 'cron' | 'manual' = 'cron'
): Promise<RunLog> {
  const gmail = getGmailClient(auth)
  const results: RuleResult[] = []

  for (const rule of rules.filter(r => r.enabled)) {
    try {
      const ids = await searchMessageIds(gmail, rule.query)
      if (ids.length > 0) await applyAction(gmail, ids, rule)
      results.push({ ruleId: rule.id, ruleName: rule.name, matched: ids.length, action: rule.action })
    } catch (err) {
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        matched: 0,
        action: rule.action,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  return {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    results,
    totalProcessed: results.reduce((s, r) => s + r.matched, 0),
    triggeredBy,
  }
}
