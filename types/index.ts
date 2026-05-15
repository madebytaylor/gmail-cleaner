export interface Rule {
  id: string
  name: string
  query: string
  action: 'trash' | 'archive' | 'markRead' | 'label'
  labelName?: string
  enabled: boolean
  createdAt: string
}

export type NewRule = Omit<Rule, 'id' | 'createdAt'>

export interface RuleResult {
  ruleId: string
  ruleName: string
  matched: number
  action: string
  error?: string
}

export interface RunLog {
  id: string
  timestamp: string
  results: RuleResult[]
  totalProcessed: number
  triggeredBy: 'cron' | 'manual'
}
