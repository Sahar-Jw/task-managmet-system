'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AuditLogsApi } from '@/lib/endpoints';
import type { AuditLogEntry } from '@/lib/types';

function AuditLogsContent() {
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState('');

  async function load() {
    setLoading(true);
    const params: Record<string, string> = { limit: '50' };
    if (entityType) params.entityType = entityType;
    const res = await AuditLogsApi.search(params);
    setItems(res.items);
    setTotal(res.total);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Audit log</h1>
        <select className="input w-48" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
          <option value="">All entities</option>
          {['Task', 'User', 'Branch', 'Department', 'Project', 'TaskAttachment'].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-2 text-xs text-slate-500">{total} entries</p>

      <div className="mt-2 card divide-y divide-slate-100">
        {loading ? (
          <p className="p-6 text-center text-slate-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-slate-500">No matching entries.</p>
        ) : (
          items.map((log) => (
            <div key={log.id} className="px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-800">
                  {log.action} — {log.entityType}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                By {log.actor?.fullName || 'System'} {log.reason ? `· ${log.reason}` : ''}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function AuditLogsPage() {
  return (
    <ProtectedRoute adminOnly>
      <AuditLogsContent />
    </ProtectedRoute>
  );
}
