'use client'

import { useEffect, useRef, useState } from 'react'
import type { Rule, NewRule } from '@/types'

const EXAMPLE_QUERIES = [
  'category:promotions older_than:7d',
  'from:linkedin.com older_than:30d',
  'category:updates older_than:14d',
  'from:noreply@twitter.com older_than:7d',
  'subject:unsubscribe older_than:30d',
]

interface Props {
  rule: Rule | null
  onSave: (data: NewRule) => void
  onClose: () => void
}

export function RuleModal({ rule, onSave, onClose }: Props) {
  const [name, setName] = useState(rule?.name ?? '')
  const [query, setQuery] = useState(rule?.query ?? '')
  const [action, setAction] = useState<Rule['action']>(rule?.action ?? 'trash')
  const [labelName, setLabelName] = useState(rule?.labelName ?? '')
  const [enabled, setEnabled] = useState(rule?.enabled ?? true)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !query.trim()) return
    onSave({ name: name.trim(), query: query.trim(), action, labelName: labelName.trim() || undefined, enabled })
  }

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">{rule ? 'Edit rule' : 'Add rule'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Clean promotions"
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Query */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Gmail search query
            </label>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="category:promotions older_than:7d"
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <div className="mt-2 flex flex-wrap gap-1">
              {EXAMPLE_QUERIES.map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuery(q)}
                  className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Action */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Action</label>
            <select
              value={action}
              onChange={e => setAction(e.target.value as Rule['action'])}
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="trash">Move to trash</option>
              <option value="archive">Archive (remove from inbox)</option>
              <option value="markRead">Mark as read</option>
              <option value="label">Apply label</option>
            </select>
          </div>

          {/* Label name (conditional) */}
          {action === 'label' && (
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Label name</label>
              <input
                value={labelName}
                onChange={e => setLabelName(e.target.value)}
                placeholder="e.g. Newsletters"
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required={action === 'label'}
              />
            </div>
          )}

          {/* Enabled toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600"
            />
            <span className="text-sm text-slate-700">Enabled</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
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
