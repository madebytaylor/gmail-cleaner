'use client'

import type { RunLog } from '@/types'

interface Props {
  logs: RunLog[]
}

export function RunHistory({ logs }: Props) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Run history</h2>
      <div className="space-y-3">
        {logs.slice(0, 10).map(log => (
          <RunLogRow key={log.id} log={log} />
        ))}
      </div>
    </div>
  )
}

function RunLogRow({ log }: { log: RunLog }) {
  const date = new Date(log.timestamp)
  const hasErrors = log.results.some(r => r.error)

  return (
    <details className="bg-white rounded-lg border border-slate-200 group">
      <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none">
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full shrink-0 ${hasErrors ? 'bg-red-400' : 'bg-green-400'}`} />
          <span className="text-sm text-slate-700">
            {log.totalProcessed} email{log.totalProcessed !== 1 ? 's' : ''} processed
          </span>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {log.triggeredBy}
          </span>
        </div>
        <time className="text-xs text-slate-400">
          {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </time>
      </summary>

      <div className="border-t border-slate-100 px-4 py-3 space-y-2">
        {log.results.map(r => (
          <div key={r.ruleId} className="flex items-center justify-between text-sm">
            <span className="text-slate-700">{r.ruleName}</span>
            <div className="flex items-center gap-2">
              {r.error ? (
                <span className="text-red-500 text-xs">{r.error}</span>
              ) : (
                <span className="text-slate-500 text-xs">{r.matched} matched → {r.action}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </details>
  )
}
