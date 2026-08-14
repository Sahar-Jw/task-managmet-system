'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ProtectedRoute from '@/components/ProtectedRoute';
import StatusBadge from '@/components/StatusBadge';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { ReportsApi, TasksApi } from '@/lib/endpoints';
import type { Task, TaskStatus } from '@/lib/types';

const STATUS_ORDER: TaskStatus[] = [
  'Pending',
  'Unassigned',
  'InProgress',
  'PendingApproval',
  'Completed',
  'Reopened',
  'Finished',
  'Archived',
];

const MONTH_LABEL = new Intl.DateTimeFormat('en', { month: 'short', year: '2-digit' });

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number);
  return MONTH_LABEL.format(new Date(year, month - 1, 1));
}

interface OverviewRow {
  totalTasks: string;
  completedTasks: string;
  overdueTasks: string;
}
interface BranchRow extends OverviewRow {
  branchId: string;
  branchName: string;
}
interface DepartmentRow extends OverviewRow {
  departmentId: string;
  departmentName: string;
}

function DashboardContent() {
  const { user } = useAuth();
  const isAdmin = user?.role?.name === 'ADMIN';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [monthly, setMonthly] = useState<{ month: string; done: number; notDone: number }[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');

  useEffect(() => {
    // Admin sees org-wide task stats; a regular User only ever sees their
    // own tasks (My Tasks), so the dashboard mirrors that here too.
    const fetchTasks = isAdmin ? TasksApi.list({ limit: '100' }) : TasksApi.mine({ limit: '100' });
    fetchTasks
      .then((res) => setTasks(res.items))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load your tasks.'))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  useEffect(() => {
    setStatsLoading(true);
    Promise.all([
      ReportsApi.monthlySummary({ months: '12' }),
      ReportsApi.branchOverview(),
      ReportsApi.departmentOverview(),
    ])
      .then(([m, b, d]) => {
        setMonthly(m);
        setBranches(b as BranchRow[]);
        setDepartments(d as DepartmentRow[]);
      })
      .catch((err) => setStatsError(err instanceof ApiError ? err.message : 'Could not load statistics.'))
      .finally(() => setStatsLoading(false));
  }, []);

  const counts = STATUS_ORDER.map((status) => ({
    status,
    count: tasks.filter((t) => t.status === status).length,
  }));

  const upcoming = tasks
    .filter((t) => t.deadlineDate && !['Completed', 'Finished', 'Archived'].includes(t.status))
    .sort((a, b) => (a.deadlineDate! < b.deadlineDate! ? -1 : 1))
    .slice(0, 6);

  const monthlyChartData = monthly.map((m) => ({
    month: monthLabel(m.month),
    Done: m.done,
    'Not done': m.notDone,
  }));

  const branchChartData = branches.map((b) => ({
    name: b.branchName ?? 'Unassigned',
    Completed: Number(b.completedTasks),
    Overdue: Number(b.overdueTasks),
    Total: Number(b.totalTasks),
  }));

  const departmentChartData = departments.map((d) => ({
    name: d.departmentName ?? 'Unassigned',
    Completed: Number(d.completedTasks),
    Overdue: Number(d.overdueTasks),
    Total: Number(d.totalTasks),
  }));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Welcome back, {user?.fullName?.split(' ')[0]}</h1>
        <Link href="/tasks/new" className="btn-primary">
          + New task
        </Link>
      </div>

      {error ? (
        <p className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</p>
      ) : loading ? (
        <p className="mt-6 text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-4 gap-3 sm:grid-cols-8">
            {counts.map((c) => (
              <Link
                key={c.status}
                href={isAdmin ? `/tasks?status=${c.status}` : `/tasks/mine?status=${c.status}`}
                className="card p-3 text-center hover:border-brand-500"
              >
                <div className="text-2xl font-semibold text-slate-800">{c.count}</div>
                <div className="mt-1">
                  <StatusBadge value={c.status} />
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Upcoming due dates
            </h2>
            {upcoming.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Nothing due soon — you're all caught up.</p>
            ) : (
              <div className="mt-3 card divide-y divide-slate-100">
                {upcoming.map((task) => (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                  >
                    <div>
                      <div className="font-medium text-slate-800">{task.titleEn}</div>
                      <div className="text-xs text-slate-500">Due {task.deadlineDate}</div>
                    </div>
                    <StatusBadge value={task.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div className="mt-10 space-y-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {isAdmin ? 'Organization statistics' : 'Your branch & department statistics'}
        </h2>

        {statsError && (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-600">{statsError}</p>
          )}

          {statsLoading ? (
            <p className="text-sm text-slate-500">Loading statistics…</p>
          ) : (
            <>
              <div className="card p-4">
                <h3 className="text-sm font-medium text-slate-700">Tasks done vs. not done, per month</h3>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Done" fill="#1f9d6b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Not done" fill="#3364b8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid gap-8 lg:grid-cols-2">
                <div className="card p-4">
                  <h3 className="text-sm font-medium text-slate-700">By branch</h3>
                  {branchChartData.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">No branch data yet.</p>
                  ) : (
                    <div className="mt-4 h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={branchChartData} layout="vertical" margin={{ left: 24 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                          <YAxis
                            dataKey="name"
                            type="category"
                            width={110}
                            tick={{ fontSize: 12, fill: '#64748b' }}
                          />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="Completed" fill="#1f9d6b" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="Overdue" fill="#dc2626" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="card p-4">
                  <h3 className="text-sm font-medium text-slate-700">By department</h3>
                  {departmentChartData.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">No department data yet.</p>
                  ) : (
                    <div className="mt-4 h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={departmentChartData} layout="vertical" margin={{ left: 24 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                          <YAxis
                            dataKey="name"
                            type="category"
                            width={110}
                            tick={{ fontSize: 12, fill: '#64748b' }}
                          />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="Completed" fill="#1f9d6b" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="Overdue" fill="#dc2626" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}