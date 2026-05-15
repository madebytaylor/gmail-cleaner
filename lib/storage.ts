import { kv } from '@vercel/kv'
import type { Rule, RunLog } from '@/types'

const RULES_KEY = 'gmail_cleaner:rules'
const LOGS_KEY = 'gmail_cleaner:logs'
const MAX_LOGS = 30

export async function getRules(): Promise<Rule[]> {
  const rules = await kv.get<Rule[]>(RULES_KEY)
  return rules ?? []
}

export async function saveRules(rules: Rule[]): Promise<void> {
  await kv.set(RULES_KEY, rules)
}

export async function getRefreshToken(): Promise<string | null> {
  return kv.get<string>('user:refresh_token')
}

export async function getLogs(): Promise<RunLog[]> {
  const logs = await kv.get<RunLog[]>(LOGS_KEY)
  return logs ?? []
}

export async function addLog(log: RunLog): Promise<void> {
  const logs = await getLogs()
  await kv.set(LOGS_KEY, [log, ...logs].slice(0, MAX_LOGS))
}
