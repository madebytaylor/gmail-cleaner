'use client'

import type { Rule } from '@/types'

const ACTION_LABELS: Record<Rule['action'], string> = {
  trash: 'Move to trash',
  archive: 'Archive',
  markRead: 'Mark as read',
  label: 'Apply label',
}

interface Props {
  rule: Rule
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}

export function RuleCard({ rule, onToggle, onEdit, onDelete }: Props) {
  return (
    <div className={`bg-white rounded-lg border p-4 transition-colors ${rule.enabled ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-900 truncate">{rule.name}</p>
            <span className="shrink-0 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {ACTION_LABELS[rule.action]}
              {rule.action === 'label' && rule.labelName ? `: ${rule.labelName}` : ''}
            </span>
          </div>
          <p className="text-sm text-slate-500 font-mono mt-1 truncate">{rule.query}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onEdit}
            className="text-xs text-slate-400 hover:text-slate-700 transition-colors px-2 py-1"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1"
          >
            Delete
          </button>
          {/* Toggle switch */}
          <button
            role="switch"
            aria-checked={rule.enabled}
            onClick={onToggle}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${rule.enabled ? 'bg-blue-600' : 'bg-slate-200'}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${rule.enabled ? 'translate-x-4' : 'translate-x-1'}`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
