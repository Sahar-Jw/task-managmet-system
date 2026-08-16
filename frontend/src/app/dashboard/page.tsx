// frontend/src/app/dashboard/page.tsx

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useLocale } from 'next-intl';

import ProtectedRoute from '@/components/ProtectedRoute';
import StatusBadge from '@/components/StatusBadge';

import { useAuth } from '@/lib/auth-context';
import { useListLabels } from '@/lib/list-labels-context';
import { ApiError } from '@/lib/api';

import {
  ProjectsApi,
  ReportsApi,
  SettingsApi,
  TasksApi,
} from '@/lib/endpoints';

import type {
  Project,
  Setting,
  Task,
} from '@/lib/types';

const MONTH_LABEL = new Intl.DateTimeFormat('en', {
  month: 'short',
  year: '2-digit',
});

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number);

  return MONTH_LABEL.format(
    new Date(year, month - 1, 1),
  );
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

interface KpiCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  accent?: 'primary' | 'green' | 'red' | 'amber';
}

function KpiCard({
  title,
  value,
  description,
  icon,
  accent = 'primary',
}: KpiCardProps) {
  const accentClasses = {
    primary:
      'bg-brand-50 text-brand-700 border-brand-100',

    green:
      'bg-green-50 text-green-700 border-green-100',

    red:
      'bg-red-50 text-red-700 border-red-100',

    amber:
      'bg-amber-50 text-amber-700 border-amber-100',
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${accentClasses[accent]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function ChartHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="text-base font-semibold text-slate-800">
        {title}
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

function EmptyChart({
  message,
}: {
  message: string;
}) {
  return (
    <div className="flex h-72 items-center justify-center">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <svg
            className="h-6 w-6 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              d="M4 19V9m5 10V5m5 14v-7m5 7V3"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <p className="mt-3 text-sm text-slate-500">
          {message}
        </p>
      </div>
    </div>
  );
}

function DashboardContent() {
  const { user } = useAuth();

  const locale = useLocale();
  const isAr = locale === 'ar';

  const { getLabel } = useListLabels();

  const isAdmin =
    user?.role?.name === 'ADMIN';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [taskStatuses, setTaskStatuses] =
    useState<Setting[]>([]);

  const [taskTypes, setTaskTypes] =
    useState<Setting[]>([]);

  const [taskPriorities, setTaskPriorities] =
    useState<Setting[]>([]);

  const [projectStatuses, setProjectStatuses] =
    useState<Setting[]>([]);

  const [monthly, setMonthly] = useState<
    {
      month: string;
      done: number;
      notDone: number;
    }[]
  >([]);

  const [branches, setBranches] =
    useState<BranchRow[]>([]);

  const [departments, setDepartments] =
    useState<DepartmentRow[]>([]);

  const [statsLoading, setStatsLoading] =
    useState(true);

  const [statsError, setStatsError] =
    useState('');

  useEffect(() => {
    const fetchTasks = isAdmin
      ? TasksApi.list({
          limit: '100',
        })
      : TasksApi.mine({
          limit: '100',
        });

    fetchTasks
      .then((res) => {
        setTasks(res.items);
      })
      .catch((err) => {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Could not load your tasks.',
        );
      })
      .finally(() => {
        setLoading(false);
      });

    ProjectsApi.list({
      limit: '100',
    })
      .then((res) => {
        setProjects(res.items);
      })
      .catch(() => {});

    SettingsApi.list(
      'task_status',
      true,
    )
      .then(setTaskStatuses)
      .catch(() => {});

    SettingsApi.list(
      'task_type',
      true,
    )
      .then(setTaskTypes)
      .catch(() => {});

    SettingsApi.list(
      'task_priority',
      true,
    )
      .then(setTaskPriorities)
      .catch(() => {});

    SettingsApi.list(
      'project_status',
      true,
    )
      .then(setProjectStatuses)
      .catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    setStatsLoading(true);

    Promise.all([
      ReportsApi.monthlySummary({
        months: '12',
      }),

      ReportsApi.branchOverview(),

      ReportsApi.departmentOverview(),
    ])
      .then(([m, b, d]) => {
        setMonthly(m);

        setBranches(
          b as BranchRow[],
        );

        setDepartments(
          d as DepartmentRow[],
        );
      })
      .catch((err) => {
        setStatsError(
          err instanceof ApiError
            ? err.message
            : 'Could not load statistics.',
        );
      })
      .finally(() => {
        setStatsLoading(false);
      });
  }, []);

  const inCurrentLocale = (
    setting: Setting,
  ) =>
    Boolean(
      isAr
        ? setting.codeAr
        : setting.codeEn,
    );

  const counts = taskStatuses
    .filter(inCurrentLocale)
    .map((setting) => ({
      status: setting.key!,

      label: getLabel(
        'task_status',
        setting.key!,
      ),

      count: tasks.filter(
        (task) =>
          task.status ===
          setting.key,
      ).length,
    }));

  const typeCounts = taskTypes
    .filter(inCurrentLocale)
    .map((setting) => ({
      taskType: setting.key!,

      label: getLabel(
        'task_type',
        setting.key!,
      ),

      count: tasks.filter(
        (task) =>
          task.taskType ===
          setting.key,
      ).length,
    }));

  const priorityCounts = taskPriorities
    .filter(inCurrentLocale)
    .map((setting) => ({
      priority: setting.key!,

      label: getLabel(
        'task_priority',
        setting.key!,
      ),

      count: tasks.filter(
        (task) =>
          task.priority ===
          setting.key,
      ).length,
    }));

  const projectStatusCounts =
    projectStatuses
      .filter(inCurrentLocale)
      .map((setting) => ({
        status: setting.key!,

        label: getLabel(
          'project_status',
          setting.key!,
        ),

        count: projects.filter(
          (project) =>
            project.status ===
            setting.key,
        ).length,
      }));

  const completedTaskKeys = useMemo(() => {
    const matchingStatuses =
      taskStatuses
        .filter((setting) => {
          const key =
            setting.key?.toLowerCase() ??
            '';

          return (
            key.includes('complete') ||
            key.includes('finish') ||
            key === 'done'
          );
        })
        .map(
          (setting) =>
            setting.key!,
        );

    return new Set([
      ...matchingStatuses,
      'Completed',
      'Finished',
      'Done',
    ]);
  }, [taskStatuses]);

  const totalTaskCount =
    tasks.length;

  const completedTaskCount =
    tasks.filter((task) =>
      completedTaskKeys.has(
        task.status,
      ),
    ).length;

  const overdueTaskCount =
    tasks.filter((task) => {
      if (!task.deadlineDate) {
        return false;
      }

      if (
        completedTaskKeys.has(
          task.status,
        )
      ) {
        return false;
      }

      if (
        task.status ===
        'Archived'
      ) {
        return false;
      }

      return (
        new Date(
          task.deadlineDate,
        ).getTime() <
        Date.now()
      );
    }).length;

  const openTaskCount =
    Math.max(
      0,
      totalTaskCount -
        completedTaskCount,
    );

  const completionRate =
    totalTaskCount === 0
      ? 0
      : Math.round(
          (completedTaskCount /
            totalTaskCount) *
            100,
        );

  const latestTasks = [
    ...tasks,
  ]
    .sort(
      (a, b) =>
        new Date(
          b.createdAt,
        ).getTime() -
        new Date(
          a.createdAt,
        ).getTime(),
    )
    .slice(0, 5);

  const upcoming = tasks
    .filter(
      (task) =>
        task.deadlineDate &&
        !completedTaskKeys.has(
          task.status,
        ) &&
        task.status !==
          'Archived',
    )
    .sort((a, b) =>
      a.deadlineDate!.localeCompare(
        b.deadlineDate!,
      ),
    )
    .slice(0, 6);

  const monthlyChartData =
    monthly.map((item) => ({
      month:
        monthLabel(
          item.month,
        ),

      Completed:
        item.done,

      'Not completed':
        item.notDone,
    }));

  const branchChartData =
    [...branches]
      .map((branch) => ({
        name:
          branch.branchName ??
          'Unassigned',

        Completed:
          Number(
            branch.completedTasks,
          ),

        Overdue:
          Number(
            branch.overdueTasks,
          ),

        Total:
          Number(
            branch.totalTasks,
          ),
      }))
      .sort(
        (a, b) =>
          b.Total -
          a.Total,
      );

  const departmentChartData =
    [...departments]
      .map((department) => ({
        name:
          department.departmentName ??
          'Unassigned',

        Completed:
          Number(
            department.completedTasks,
          ),

        Overdue:
          Number(
            department.overdueTasks,
          ),

        Total:
          Number(
            department.totalTasks,
          ),
      }))
      .sort(
        (a, b) =>
          b.Total -
          a.Total,
      );

  const branchChartHeight =
    Math.max(
      300,
      branchChartData.length *
        52,
    );

  const departmentChartHeight =
    Math.max(
      300,
      departmentChartData.length *
        52,
    );

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            Welcome back,{' '}
            {
              user?.fullName?.split(
                ' ',
              )[0]
            }
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {isAdmin
              ? 'Here is an overview of activity across the organization.'
              : 'Here is an overview of your current work.'}
          </p>
        </div>

        <Link
          href="/tasks/new"
          className="btn-primary"
        >
          + New task
        </Link>
      </div>

      {error ? (
        <p className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      ) : loading ? (
        <p className="mt-6 text-slate-500">
          Loading…
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-4 gap-3 sm:grid-cols-8">
            {counts.map((item) => (
              <Link
                key={item.status}
                href={
                  isAdmin
                    ? `/tasks?status=${encodeURIComponent(item.status)}`
                    : `/tasks/mine?status=${encodeURIComponent(item.status)}`
                }
                className="card p-3 text-center transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md"
              >
                <div className="text-2xl font-semibold text-slate-800">
                  {item.count}
                </div>

                <div className="mt-1">
                  <StatusBadge
                    value={
                      item.status
                    }
                    listType="task_status"
                  />
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {typeCounts.map((item) => (
              <Link
                key={item.taskType}
                href={
                  isAdmin
                    ? `/tasks?taskType=${encodeURIComponent(item.taskType)}`
                    : `/tasks/mine?taskType=${encodeURIComponent(item.taskType)}`
                }
                className="card p-3 text-center transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md"
              >
                <div className="text-2xl font-semibold text-slate-800">
                  {item.count}
                </div>

                <div className="mt-1 text-xs font-medium text-slate-600">
                  {item.label}
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {priorityCounts.map((item) => (
              <Link
                key={item.priority}
                href={
                  isAdmin
                    ? `/tasks?priority=${encodeURIComponent(item.priority)}`
                    : `/tasks/mine?priority=${encodeURIComponent(item.priority)}`
                }
                className="card p-3 text-center transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md"
              >
                <div className="text-2xl font-semibold text-slate-800">
                  {item.count}
                </div>

                <div className="mt-1">
                  <StatusBadge
                    value={
                      item.priority
                    }
                    listType="task_priority"
                  />
                </div>
              </Link>
            ))}
          </div>

          {projectStatusCounts.length >
            0 && (
            <>
              <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {isAr
                  ? 'المشاريع'
                  : 'Projects'}
              </h2>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {projectStatusCounts.map(
                  (item) => (
                    <Link
                      key={
                        item.status
                      }
                      href={`/projects?status=${encodeURIComponent(
                        item.status,
                      )}`}
                      className="card p-3 text-center transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md"
                    >
                      <div className="text-2xl font-semibold text-slate-800">
                        {
                          item.count
                        }
                      </div>

                      <div className="mt-1">
                        <StatusBadge
                          value={
                            item.status
                          }
                          listType="project_status"
                        />
                      </div>
                    </Link>
                  ),
                )}
              </div>
            </>
          )}

          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Latest tasks
            </h2>

            {latestTasks.length ===
            0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No tasks have been
                added yet.
              </p>
            ) : (
              <div className="mt-3 card divide-y divide-slate-100">
                {latestTasks.map(
                  (task) => (
                    <Link
                      key={
                        task.id
                      }
                      href={`/tasks/${task.id}`}
                      className="flex items-center justify-between px-4 py-3 transition hover:bg-slate-50"
                    >
                      <div>
                        <div className="font-medium text-slate-800">
                          {
                            task.titleEn
                          }
                        </div>

                        <div className="text-xs text-slate-500">
                          Added{' '}
                          {new Date(
                            task.createdAt,
                          ).toLocaleDateString()}
                        </div>
                      </div>

                      <StatusBadge
                        value={
                          task.status
                        }
                        listType="task_status"
                      />
                    </Link>
                  ),
                )}
              </div>
            )}
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Upcoming due dates
            </h2>

            {upcoming.length ===
            0 ? (
              <p className="mt-3 text-sm text-slate-500">
                Nothing due soon.
              </p>
            ) : (
              <div className="mt-3 card divide-y divide-slate-100">
                {upcoming.map(
                  (task) => (
                    <Link
                      key={
                        task.id
                      }
                      href={`/tasks/${task.id}`}
                      className="flex items-center justify-between px-4 py-3 transition hover:bg-slate-50"
                    >
                      <div>
                        <div className="font-medium text-slate-800">
                          {
                            task.titleEn
                          }
                        </div>

                        <div className="text-xs text-slate-500">
                          Due{' '}
                          {
                            task.deadlineDate
                          }
                        </div>
                      </div>

                      <StatusBadge
                        value={
                          task.status
                        }
                        listType="task_status"
                      />
                    </Link>
                  ),
                )}
              </div>
            )}
          </div>
        </>
      )}

      <section className="mt-12">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            {isAdmin
              ? 'Organization Analytics'
              : 'Performance Analytics'}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {isAdmin
              ? 'Monitor task performance, workload and overdue activity across the organization.'
              : 'Monitor your task performance and workload.'}
          </p>
        </div>

        {statsError && (
          <p className="mt-5 rounded-md bg-red-50 p-3 text-sm text-red-600">
            {statsError}
          </p>
        )}

        {statsLoading ? (
          <div className="mt-6 card p-8 text-center text-sm text-slate-500">
            Loading statistics…
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                title="Total Tasks"
                value={
                  totalTaskCount
                }
                description="Tasks currently included"
                accent="primary"
                icon={
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                }
              />

              <KpiCard
                title="Completed"
                value={
                  completedTaskCount
                }
                description={`${completionRate}% completion rate`}
                accent="green"
                icon={
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="m5 12 4 4L19 6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
              />

              <KpiCard
                title="Open Tasks"
                value={
                  openTaskCount
                }
                description="Not completed yet"
                accent="amber"
                icon={
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="8"
                      strokeWidth="2"
                    />

                    <path
                      d="M12 8v4l3 2"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
              />

              <KpiCard
                title="Overdue"
                value={
                  overdueTaskCount
                }
                description={
                  overdueTaskCount ===
                  0
                    ? 'No overdue tasks'
                    : 'Needs attention'
                }
                accent="red"
                icon={
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M12 9v4m0 4h.01M10.3 4.6 3.2 17a2 2 0 0 0 1.7 3h14.2a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
              />
            </div>

            <div className="mt-6 card p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <ChartHeader
                  title="Task Performance Over Time"
                  description="Completed versus not completed tasks during the last 12 months."
                />

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
                  12 month trend
                </div>
              </div>

              {monthlyChartData.length ===
              0 ? (
                <EmptyChart message="No monthly task data available yet." />
              ) : (
                <div className="mt-6 h-[340px]">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <LineChart
                      data={
                        monthlyChartData
                      }
                      margin={{
                        top: 10,
                        right: 20,
                        bottom: 0,
                        left: -15,
                      }}
                    >
                      <CartesianGrid
                        vertical={
                          false
                        }
                        stroke="#e2e8f0"
                        strokeDasharray="4 6"
                      />

                      <XAxis
                        dataKey="month"
                        axisLine={
                          false
                        }
                        tickLine={
                          false
                        }
                        tick={{
                          fontSize:
                            12,
                          fill: '#64748b',
                        }}
                        dy={10}
                      />

                      <YAxis
                        allowDecimals={
                          false
                        }
                        axisLine={
                          false
                        }
                        tickLine={
                          false
                        }
                        tick={{
                          fontSize:
                            12,
                          fill: '#94a3b8',
                        }}
                      />

                      <Tooltip
                        cursor={{
                          stroke:
                            '#cbd5e1',
                          strokeDasharray:
                            '4 4',
                        }}
                        contentStyle={{
                          borderRadius:
                            '10px',
                          border:
                            '1px solid #e2e8f0',
                          boxShadow:
                            '0 10px 30px rgba(15,23,42,0.08)',
                          fontSize:
                            '13px',
                        }}
                      />

                      <Legend
                        iconType="circle"
                        wrapperStyle={{
                          paddingTop:
                            '18px',
                          fontSize:
                            '12px',
                        }}
                      />

                      <Line
                        type="monotone"
                        dataKey="Completed"
                        stroke="#16a34a"
                        strokeWidth={3}
                        dot={{
                          r: 3,
                          strokeWidth:
                            2,
                        }}
                        activeDot={{
                          r: 6,
                        }}
                      />

                      <Line
                        type="monotone"
                        dataKey="Not completed"
                        stroke="var(--theme-primary)"
                        strokeWidth={3}
                        dot={{
                          r: 3,
                          strokeWidth:
                            2,
                        }}
                        activeDot={{
                          r: 6,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <div className="card overflow-hidden">
                <div className="border-b border-slate-100 p-5 sm:p-6">
                  <ChartHeader
                    title="Branch Performance"
                    description="Completed and overdue tasks by branch, sorted by workload."
                  />
                </div>

                {branchChartData.length ===
                0 ? (
                  <EmptyChart message="No branch data available yet." />
                ) : (
                  <div
                    className="overflow-y-auto px-2 py-5 sm:px-4"
                    style={{
                      maxHeight:
                        '520px',
                    }}
                  >
                    <div
                      style={{
                        height:
                          branchChartHeight,
                      }}
                    >
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >
                        <BarChart
                          data={
                            branchChartData
                          }
                          layout="vertical"
                          barCategoryGap="30%"
                          margin={{
                            top: 5,
                            right: 30,
                            bottom: 5,
                            left: 15,
                          }}
                        >
                          <CartesianGrid
                            horizontal={
                              false
                            }
                            stroke="#e2e8f0"
                            strokeDasharray="4 6"
                          />

                          <XAxis
                            type="number"
                            allowDecimals={
                              false
                            }
                            axisLine={
                              false
                            }
                            tickLine={
                              false
                            }
                            tick={{
                              fontSize:
                                11,
                              fill: '#94a3b8',
                            }}
                          />

                          <YAxis
                            dataKey="name"
                            type="category"
                            width={115}
                            axisLine={
                              false
                            }
                            tickLine={
                              false
                            }
                            tick={{
                              fontSize:
                                12,
                              fill: '#475569',
                            }}
                          />

                          <Tooltip
                            contentStyle={{
                              borderRadius:
                                '10px',
                              border:
                                '1px solid #e2e8f0',
                              boxShadow:
                                '0 10px 30px rgba(15,23,42,0.08)',
                              fontSize:
                                '13px',
                            }}
                          />

                          <Legend
                            iconType="circle"
                            wrapperStyle={{
                              fontSize:
                                '12px',
                            }}
                          />

                          <Bar
                            dataKey="Completed"
                            fill="#16a34a"
                            radius={[
                              0,
                              6,
                              6,
                              0,
                            ]}
                            maxBarSize={18}
                          />

                          <Bar
                            dataKey="Overdue"
                            fill="#dc2626"
                            radius={[
                              0,
                              6,
                              6,
                              0,
                            ]}
                            maxBarSize={18}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>

              <div className="card overflow-hidden">
                <div className="border-b border-slate-100 p-5 sm:p-6">
                  <ChartHeader
                    title="Department Performance"
                    description="Completed and overdue tasks by department, sorted by workload."
                  />
                </div>

                {departmentChartData.length ===
                0 ? (
                  <EmptyChart message="No department data available yet." />
                ) : (
                  <div
                    className="overflow-y-auto px-2 py-5 sm:px-4"
                    style={{
                      maxHeight:
                        '520px',
                    }}
                  >
                    <div
                      style={{
                        height:
                          departmentChartHeight,
                      }}
                    >
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >
                        <BarChart
                          data={
                            departmentChartData
                          }
                          layout="vertical"
                          barCategoryGap="30%"
                          margin={{
                            top: 5,
                            right: 30,
                            bottom: 5,
                            left: 15,
                          }}
                        >
                          <CartesianGrid
                            horizontal={
                              false
                            }
                            stroke="#e2e8f0"
                            strokeDasharray="4 6"
                          />

                          <XAxis
                            type="number"
                            allowDecimals={
                              false
                            }
                            axisLine={
                              false
                            }
                            tickLine={
                              false
                            }
                            tick={{
                              fontSize:
                                11,
                              fill: '#94a3b8',
                            }}
                          />

                          <YAxis
                            dataKey="name"
                            type="category"
                            width={115}
                            axisLine={
                              false
                            }
                            tickLine={
                              false
                            }
                            tick={{
                              fontSize:
                                12,
                              fill: '#475569',
                            }}
                          />

                          <Tooltip
                            contentStyle={{
                              borderRadius:
                                '10px',
                              border:
                                '1px solid #e2e8f0',
                              boxShadow:
                                '0 10px 30px rgba(15,23,42,0.08)',
                              fontSize:
                                '13px',
                            }}
                          />

                          <Legend
                            iconType="circle"
                            wrapperStyle={{
                              fontSize:
                                '12px',
                            }}
                          />

                          <Bar
                            dataKey="Completed"
                            fill="#16a34a"
                            radius={[
                              0,
                              6,
                              6,
                              0,
                            ]}
                            maxBarSize={18}
                          />

                          <Bar
                            dataKey="Overdue"
                            fill="#dc2626"
                            radius={[
                              0,
                              6,
                              6,
                              0,
                            ]}
                            maxBarSize={18}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </section>
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