'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import type { Rule, RunLog } from '@/types'
import { RuleCard } from './RuleCard'
import { RuleModal } from './RuleModal'
import { RunHistory } from './RunHistory'

export function Dashboard() {
  const { data: session } = useSession()
  const [rules, setRules] = useState<Rule[]>([])
  const [logs, setLogs] = useState<RunLog[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [running, setRunning] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    const [rulesRes, logsRes] = await Promise.all([
      fetch('/api/rules'),
      fetch('/api/logs'),
    ])
    setRules(await rulesRes.json())
    setLogs(await logsRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function handleToggle(rule: Rule) {
    const updated = { ...rule, enabled: !rule.enabled }
    await fetch(`/api/rules/${rule.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: updated.enabled }),
    })
    setRules(prev => prev.map(r => r.id === rule.id ? updated : r))
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this rule?')) return
    await fetch(`/api/rules/${id}`, { method: 'DELETE' })
    setRules(prev => prev.filter(r => r.id !== id))
  }

  async function handleSave(data: Omit<Rule, 'id' | 'createdAt'>) {
    if (editingRule) {
      const res = await fetch(`/api/rules/${editingRule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const updated = await res.json()
      setRules(prev => prev.map(r => r.id === editingRule.id ? updated : r))
    } else {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const rule = await res.json()
      setRules(prev => [...prev, rule])
    }
    setModalOpen(false)
    setEditingRule(null)
  }

  async function handleRunNow() {
    setRunning(true)
    try {
      const res = await fetch('/api/run', { method: 'POST' })
      const log = await res.json()
      setLogs(prev => [log, ...prev])
    } finally {
      setRunning(false)
    }
  }

  const enabledCount = rules.filter(r => r.enabled).length
  const lastRun = logs[0]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gmail Cleaner</h1>
          <p className="text-sm text-slate-500 mt-0.5">{session?.user?.email}</p>
        </div>
        <button
          onClick={() => signOut()}
          className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          Sign out
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Stat label="Rules" value={rules.length} />
        <Stat label="Active" value={enabledCount} />
        <Stat
          label="Last run"
          value={lastRun ? new Date(lastRun.timestamp).toLocaleDateString() : '—'}
        />
      </div>

      {/* Rules section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Rules</h2>
          <div className="flex gap-2">
            <button
              onClick={handleRunNow}
              disabled={running || enabledCount === 0}
              className="px-3 py-1.5 text-sm bg-slate-800 text-white rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {running ? 'Running…' : 'Run now'}
            </button>
            <button
              onClick={() => { setEditingRule(null); setModalOpen(true) }}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors"
            >
              + Add rule
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-slate-400 text-sm">Loading…</p>
        ) : rules.length === 0 ? (
          <EmptyRules onAdd={() => setModalOpen(true)} />
        ) : (
          <div className="space-y-3">
            {rules.map(rule => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={() => handleToggle(rule)}
                onEdit={() => { setEditingRule(rule); setModalOpen(true) }}
                onDelete={() => handleDelete(rule.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Run history */}
      {logs.length > 0 && <RunHistory logs={logs} />}

      {/* Modal */}
      {modalOpen && (
        <RuleModal
          rule={editingRule}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditingRule(null) }}
        />
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
    </div>
  )
}

function EmptyRules({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="border-2 border-dashed border-slate-200 rounded-lg p-10 text-center">
      <p className="text-slate-500 mb-3">No rules yet</p>
      <button
        onClick={onAdd}
        className="text-sm text-blue-600 hover:text-blue-500 font-medium"
      >
        Add your first rule →
      </button>
    </div>
  )
}
