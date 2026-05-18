'use client'

import { useEffect, useRef, useState } from 'react'
import type { Rule, NewRule } from '@/types'

// ── Types ──────────────────────────────────────────────────────────────────

interface FormFields {
  from: string
  category: string
  subject: string
  olderThan: string
  action: Rule['action']
  labelName: string
  enabled: boolean
}

// ── Constants ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'any',        label: 'Any category' },
  { value: 'promotions', label: 'Promotions' },
  { value: 'updates',    label: 'Updates & notifications' },
  { value: 'social',     label: 'Social' },
  { value: 'forums',     label: 'Forums' },
]

const OLDER_THAN = [
  { value: '7',  label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
  { value: '60', label: '60 days' },
  { value: '90', label: '90 days' },
]

const ACTIONS = [
  { value: 'trash',    label: '🗑️  Move to trash' },
  { value: 'archive',  label: '📦  Archive (remove from inbox)' },
  { value: 'markRead', label: '✓  Mark as read' },
  { value: 'label',    label: '🏷️  Apply a label' },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function buildQuery(f: FormFields): string {
  const parts: string[] = []
  if (f.from.trim())           parts.push(`from:${f.from.trim()}`)
  if (f.category !== 'any')    parts.push(`category:${f.category}`)
  if (f.subject.trim())        parts.push(`subject:(${f.subject.trim()})`)
  parts.push(`older_than:${f.olderThan}d`)
  return parts.join(' ')
}

function buildName(f: FormFields): string {
  const parts: string[] = []
  if (f.category !== 'any')
    parts.push(CATEGORIES.find(c => c.value === f.category)?.label ?? '')
  if (f.from.trim()) parts.push(`from ${f.from.trim()}`)
  if (f.subject.trim()) parts.push(`"${f.subject.trim()}"`)
  const age = OLDER_THAN.find(o => o.value === f.olderThan)?.label ?? `${f.olderThan} days`
  parts.push(`older than ${age}`)
  return parts.join(' · ')
}

function parseQuery(query: string): Partial<FormFields> {
  const f: Partial<FormFields> = {}
  const from     = query.match(/from:(\S+)/)
  const category = query.match(/category:(\S+)/)
  const subject  = query.match(/subject:\(([^)]+)\)/) ?? query.match(/subject:(\S+)/)
  const older    = query.match(/older_than:(\d+)d/)
  if (from)     f.from     = from[1]
  if (category) f.category = category[1]
  if (subject)  f.subject  = subject[1]
  if (older)    f.olderThan = older[1]
  return f
}

// ── Component ──────────────────────────────────────────────────────────────

interface Props {
  rule: Rule | null
  prefillFrom?: string
  onSave: (data: NewRule) => void
  onClose: () => void
}

const DEFAULT_FIELDS: FormFields = {
  from: '', category: 'any', subject: '', olderThan: '30',
  action: 'trash', labelName: '', enabled: true,
}

export function RuleModal({ rule, prefillFrom, onSave, onClose }: Props) {
  const parsed = rule ? parseQuery(rule.query) : {}

  const [fields, setFields] = useState<FormFields>({
    ...DEFAULT_FIELDS,
    ...parsed,
    from:      prefillFrom ?? parsed.from ?? '',
    action:    rule?.action    ?? 'trash',
    labelName: rule?.labelName ?? '',
    enabled:   rule?.enabled   ?? true,
  })

  const [nameDirty, setNameDirty] = useState(!!rule)
  const [name, setName] = useState(rule?.name ?? '')
  const overlayRef = useRef<HTMLDivElement>(null)

  // Auto-generate name from fields unless user has manually edited it
  useEffect(() => {
    if (!nameDirty) setName(buildName(fields))
  }, [fields, nameDirty])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  function set<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setFields(prev => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const query = buildQuery(fields)
    onSave({
      name: name.trim() || buildName(fields),
      query,
      action:    fields.action,
      labelName: fields.labelName.trim() || undefined,
      enabled:   fields.enabled,
    })
  }

  const preview = buildQuery(fields)

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-slate-900">{rule ? 'Edit rule' : 'New rule'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* ── Filter fields ── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
              Which emails?
            </p>
            <div className="space-y-3">

              {/* From */}
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-600 w-28 shrink-0">From</label>
                <input
                  value={fields.from}
                  onChange={e => set('from', e.target.value)}
                  placeholder="e.g. linkedin.com or news@company.com"
                  className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Category */}
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-600 w-28 shrink-0">Category</label>
                <select
                  value={fields.category}
                  onChange={e => set('category', e.target.value)}
                  className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-600 w-28 shrink-0">Subject contains</label>
                <input
                  value={fields.subject}
                  onChange={e => set('subject', e.target.value)}
                  placeholder="e.g. unsubscribe, sale, newsletter"
                  className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Older than */}
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-600 w-28 shrink-0">Older than</label>
                <select
                  value={fields.olderThan}
                  onChange={e => set('olderThan', e.target.value)}
                  className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {OLDER_THAN.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* ── Action ── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
              What should happen?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {ACTIONS.map(a => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => set('action', a.value as Rule['action'])}
                  className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                    fields.action === a.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>

            {fields.action === 'label' && (
              <input
                value={fields.labelName}
                onChange={e => set('labelName', e.target.value)}
                placeholder="Label name (e.g. Newsletters)"
                className="mt-2 w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            )}
          </div>

          {/* ── Rule name ── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
              Rule name
            </p>
            <input
              value={name}
              onChange={e => { setName(e.target.value); setNameDirty(true) }}
              placeholder="Auto-generated from your selections"
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {nameDirty && (
              <button
                type="button"
                onClick={() => { setNameDirty(false) }}
                className="mt-1 text-xs text-blue-500 hover:text-blue-700"
              >
                ↺ Auto-generate
              </button>
            )}
          </div>

          {/* ── Query preview ── */}
          <div className="bg-slate-50 rounded-lg px-4 py-3">
            <p className="text-xs text-slate-400 mb-1">Gmail query (auto-built)</p>
            <p className="text-sm font-mono text-slate-600 break-all">{preview}</p>
          </div>

          {/* ── Enabled ── */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={fields.enabled}
              onChange={e => set('enabled', e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600"
            />
            <span className="text-sm text-slate-700">Enable this rule immediately</span>
          </label>

          {/* ── Actions ── */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors"
            >
              {rule ? 'Save changes' : 'Add rule'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
