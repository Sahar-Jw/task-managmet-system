'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AuditLogsApi } from '@/lib/endpoints';
import type { AuditLogEntry } from '@/lib/types';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 15;

function AuditLogsContent() {
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    const params: Record<string, string> = { limit: String(PAGE_SIZE), page: String(page) };
    if (entityType) params.entityType = entityType;
    const res = await AuditLogsApi.search(params);
    setItems(res.items);
    setTotal(res.total);
    setLoading(false);
  }

  // Reset to page 1 whenever the filter changes
  useEffect(() => {
    setPage(1);
  }, [entityType]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, page]);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

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

      <div className="mt-4 card divide-y divide-slate-100">
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

      {!loading && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          itemLabel="entries"
        />
      )}
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
