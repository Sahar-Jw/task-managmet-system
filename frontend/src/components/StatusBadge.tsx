const COLORS: Record<string, string> = {
  Pending: 'bg-slate-100 text-slate-700',
  Unassigned: 'bg-slate-100 text-slate-700',
  InProgress: 'bg-blue-100 text-blue-700',
  PendingApproval: 'bg-amber-100 text-amber-700',
  Completed: 'bg-green-100 text-green-700',
  Reopened: 'bg-purple-100 text-purple-700',
  Finished: 'bg-red-100 text-red-700',
  Archived: 'bg-slate-200 text-slate-600',
  Planned: 'bg-slate-100 text-slate-700',
  Active: 'bg-blue-100 text-blue-700',
  PendingAcceptance: 'bg-amber-100 text-amber-700',
  Accepted: 'bg-blue-100 text-blue-700',
  Rejected: 'bg-red-100 text-red-700',
  Reassigned: 'bg-slate-100 text-slate-700',
  Low: 'bg-slate-100 text-slate-700',
  Medium: 'bg-blue-100 text-blue-700',
  High: 'bg-amber-100 text-amber-700',
  Critical: 'bg-red-100 text-red-700',
  General: 'bg-sky-100 text-sky-700',
  Administrative: 'bg-indigo-100 text-indigo-700',
  Financial: 'bg-emerald-100 text-emerald-700',
  Technical: 'bg-violet-100 text-violet-700',
  Maintenance: 'bg-orange-100 text-orange-700',
  HR: 'bg-pink-100 text-pink-700',
  Procurement: 'bg-cyan-100 text-cyan-700',
  Other: 'bg-slate-100 text-slate-700',
};

export default function StatusBadge({ value }: { value: string }) {
  return <span className={`badge ${COLORS[value] || 'bg-slate-100 text-slate-700'}`}>{value}</span>;
}
