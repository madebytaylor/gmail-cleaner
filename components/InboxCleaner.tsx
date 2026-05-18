'use client'

import { useState } from 'react'

interface SenderGroup {
  email: string
  name: string
  count: number
  messageIds: string[]
  sample: string[]
}

interface ScanResult {
  senders: SenderGroup[]
  nextPageToken: string | null
  total: number
}

type ActionState = 'idle' | 'loading' | 'done' | 'error'

export function InboxCleaner({ onCreateRule }: { onCreateRule: (email: string) => void }) {
  const [senders, setSenders] = useState<SenderGroup[]>([])
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [total, setTotal] = useState<number | null>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>({})
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [scanned, setScanned] = useState(0)

  async function scan(pageToken?: string) {
    setScanning(true)
    setError(null)
    try {
      const url = pageToken ? `/api/inbox?pageToken=${pageToken}` : '/api/inbox'
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`)
        return
      }
      const result = data as ScanResult

      setSenders(prev => {
        const map = new Map(prev.map(s => [s.email, s]))
        for (const s of result.senders) {
          const ex = map.get(s.email)
          if (ex) {
            ex.count += s.count
            ex.messageIds.push(...s.messageIds)
            if (ex.sample.length < 3) ex.sample.push(...s.sample)
          } else {
            map.set(s.email, s)
          }
        }
        return Array.from(map.values()).sort((a, b) => b.count - a.count)
      })

      setNextPageToken(result.nextPageToken)
      setTotal(result.total)
      setScanned(prev => prev + result.senders.reduce((s, g) => s + g.count, 0))
    } finally {
      setScanning(false)
    }
  }

  async function applyAction(sender: SenderGroup, action: 'trash' | 'archive' | 'markRead') {
    const key = `${sender.email}:${action}`
    setActionStates(prev => ({ ...prev, [key]: 'loading' }))
    try {
      await fetch('/api/inbox/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: sender.messageIds, action }),
      })
      setActionStates(prev => ({ ...prev, [key]: 'done' }))
      setDismissed(prev => new Set(prev).add(sender.email))
    } catch {
      setActionStates(prev => ({ ...prev, [key]: 'error' }))
    }
  }

  const visible = senders.filter(
    s => !dismissed.has(s.email) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) ||
     s.email.toLowerCase().includes(search.toLowerCase()))
  )

  const totalEmails = visible.reduce((s, g) => s + g.count, 0)

  return (
    <div className="space-y-6">

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          <strong>Scan failed:</strong> {error}
          {error === 'Unauthorized' && (
            <span> — try signing out and signing back in to refresh your Google token.</span>
          )}
        </div>
      )}

      {/* Intro + scan button */}
      {senders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <p className="text-4xl mb-4">🧹</p>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Bulk Inbox Cleaner</h2>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            Scan your Primary inbox to see who's sending you the most email.
            Then trash, archive, or create rules in one click.
          </p>
          <button
            onClick={() => scan()}
            disabled={scanning}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {scanning ? 'Scanning…' : 'Scan my inbox'}
          </button>
        </div>
      ) : (
        <>
          {/* Stats bar */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                {visible.length} senders · {totalEmails} emails
                {total ? ` · ${total.toLocaleString()} total in inbox` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              {nextPageToken && (
                <button
                  onClick={() => scan(nextPageToken)}
                  disabled={scanning}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  {scanning ? 'Scanning…' : `Scan more`}
                </button>
              )}
            </div>
          </div>

          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter by sender name or email…"
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Sender list */}
          <div className="space-y-2">
            {visible.map(sender => (
              <SenderRow
                key={sender.email}
                sender={sender}
                actionStates={actionStates}
                onAction={(action) => applyAction(sender, action)}
                onCreateRule={() => onCreateRule(sender.email)}
                onDismiss={() => setDismissed(prev => new Set(prev).add(sender.email))}
              />
            ))}
            {visible.length === 0 && (
              <p className="text-center text-slate-400 py-8">No senders match your filter.</p>
            )}
          </div>

          {/* Scan more prompt */}
          {nextPageToken && !scanning && (
            <div className="text-center">
              <button
                onClick={() => scan(nextPageToken)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Load next 500 emails →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Sender row ─────────────────────────────────────────────────────────────

function SenderRow({
  sender,
  actionStates,
  onAction,
  onCreateRule,
  onDismiss,
}: {
  sender: SenderGroup
  actionStates: Record<string, ActionState>
  onAction: (action: 'trash' | 'archive' | 'markRead') => void
  onCreateRule: () => void
  onDismiss: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  function stateFor(action: string) {
    return actionStates[`${sender.email}:${action}`] ?? 'idle'
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-600 shrink-0">
          {(sender.name[0] ?? '?').toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-800 truncate">{sender.name}</p>
            <span className="shrink-0 text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
              {sender.count} email{sender.count !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-xs text-slate-400 truncate">{sender.email}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <ActionButton
            label="🗑️ Trash"
            state={stateFor('trash')}
            onClick={() => onAction('trash')}
            danger
          />
          <ActionButton
            label="📦 Archive"
            state={stateFor('archive')}
            onClick={() => onAction('archive')}
          />
          <button
            onClick={onCreateRule}
            className="text-xs px-2 py-1 text-blue-600 hover:text-blue-800 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
          >
            + Rule
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs px-2 py-1 text-slate-400 hover:text-slate-600"
          >
            {expanded ? '▲' : '▼'}
          </button>
          <button
            onClick={onDismiss}
            className="text-xs px-2 py-1 text-slate-300 hover:text-slate-500"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Sample subjects */}
      {expanded && sender.sample.length > 0 && (
        <div className="border-t border-slate-100 px-4 py-2 space-y-1">
          {sender.sample.map((s, i) => (
            <p key={i} className="text-xs text-slate-500 truncate">• {s}</p>
          ))}
        </div>
      )}
    </div>
  )
}

function ActionButton({
  label, state, onClick, danger = false,
}: {
  label: string
  state: ActionState
  onClick: () => void
  danger?: boolean
}) {
  if (state === 'done') return (
    <span className="text-xs px-2 py-1 text-green-600">✓ Done</span>
  )
  return (
    <button
      onClick={onClick}
      disabled={state === 'loading'}
      className={`text-xs px-2 py-1 rounded border transition-colors disabled:opacity-50 ${
        danger
          ? 'text-red-500 border-red-200 hover:bg-red-50'
          : 'text-slate-600 border-slate-200 hover:bg-slate-50'
      }`}
    >
      {state === 'loading' ? '…' : label}
    </button>
  )
}
