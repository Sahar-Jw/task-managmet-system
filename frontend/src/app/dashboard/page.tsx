// frontend/src/app/dashboard/page.tsx

'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

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

import {
  useLocale,
} from 'next-intl';

import ProtectedRoute from '@/components/ProtectedRoute';
import StatusBadge from '@/components/StatusBadge';

import {
  useAuth,
} from '@/lib/auth-context';

import {
  useListLabels,
} from '@/lib/list-labels-context';

import {
  ApiError,
} from '@/lib/api';

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


/*
 * ============================================================
 * TYPES
 * ============================================================
 */

interface OverviewRow {
  totalTasks: string;
  completedTasks: string;
  overdueTasks: string;
}


interface BranchRow
  extends OverviewRow {
  branchId: string;
  branchName: string;
}


interface DepartmentRow
  extends OverviewRow {
  departmentId: string;
  departmentName: string;
}


/*
 * ============================================================
 * SMALL UI COMPONENTS
 * ============================================================
 */

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {description}
          </p>
        )}
      </div>

      {action}
    </div>
  );
}


function MetricCard({
  title,
  value,
  description,
  icon,
  href,
  tone = 'brand',
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  href?: string;

  tone?:
    | 'brand'
    | 'green'
    | 'amber'
    | 'red';
}) {
  const styles = {
    brand: {
      icon:
        'bg-brand-50 text-brand-700 ring-brand-100',

      bar:
        'bg-brand-500',
    },

    green: {
      icon:
        'bg-green-50 text-green-700 ring-green-100',

      bar:
        'bg-green-500',
    },

    amber: {
      icon:
        'bg-amber-50 text-amber-700 ring-amber-100',

      bar:
        'bg-amber-500',
    },

    red: {
      icon:
        'bg-red-50 text-red-700 ring-red-100',

      bar:
        'bg-red-500',
    },
  }[tone];


  const content = (
    <div
      className={`group relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition ${
        href
          ? 'hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg'
          : ''
      }`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-[3px] ${styles.bar}`}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
            {value}
          </p>

          <p className="mt-1.5 text-xs leading-5 text-slate-400">
            {description}
          </p>
        </div>


        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${styles.icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );


  if (
    href
  ) {
    return (
      <Link
        href={href}
        className="block"
      >
        {content}
      </Link>
    );
  }


  return content;
}


function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        {icon ?? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="h-5 w-5"
          >
            <path
              d="M6 7h12M6 12h12M6 17h8"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>

      <div className="mt-3 text-sm font-medium text-slate-700">
        {title}
      </div>

      <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">
        {description}
      </p>
    </div>
  );
}


function ChartEmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="flex h-[320px] items-center justify-center">
      <EmptyState
        title={message}
        description="More data will appear here as tasks are created and completed."
        icon={
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="h-5 w-5"
          >
            <path
              d="M5 19V9M12 19V5M19 19v-7"
              strokeWidth="1.8"
              strokeLinecap="round"
            />

            <path
              d="M3 19h18"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        }
      />
    </div>
  );
}


/*
 * ============================================================
 * DASHBOARD
 * ============================================================
 */

function DashboardContent() {
  const {
    user,
  } = useAuth();

  const locale =
    useLocale();

  const isAr =
    locale === 'ar';

  const {
    getLabel,
  } = useListLabels();


  const isAdmin =
    user?.role?.name ===
    'ADMIN';


  /*
   * ==========================================================
   * DATA
   * ==========================================================
   */

  const [
    tasks,
    setTasks,
  ] = useState<Task[]>(
    [],
  );

  const [
    projects,
    setProjects,
  ] = useState<Project[]>(
    [],
  );


  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');


  /*
   * SETTINGS
   */

  const [
    taskStatuses,
    setTaskStatuses,
  ] = useState<Setting[]>(
    [],
  );

  const [
    taskTypes,
    setTaskTypes,
  ] = useState<Setting[]>(
    [],
  );

  const [
    taskPriorities,
    setTaskPriorities,
  ] = useState<Setting[]>(
    [],
  );

  const [
    projectStatuses,
    setProjectStatuses,
  ] = useState<Setting[]>(
    [],
  );


  /*
   * REPORTS
   */

  const [
    monthly,
    setMonthly,
  ] = useState<
    {
      month: string;
      done: number;
      notDone: number;
    }[]
  >([]);


  const [
    branches,
    setBranches,
  ] = useState<BranchRow[]>(
    [],
  );


  const [
    departments,
    setDepartments,
  ] = useState<
    DepartmentRow[]
  >([]);


  const [
    statsLoading,
    setStatsLoading,
  ] = useState(true);


  const [
    statsError,
    setStatsError,
  ] = useState('');


  /*
   * ==========================================================
   * LOAD MAIN DATA
   * ==========================================================
   */

  useEffect(() => {
    setLoading(
      true,
    );

    setError('');


    const fetchTasks =
      isAdmin
        ? TasksApi.list({
            limit: '100',
          })
        : TasksApi.mine({
            limit: '100',
          });


    fetchTasks
      .then(
        (response) => {
          setTasks(
            response.items,
          );
        },
      )
      .catch(
        (err) => {
          setError(
            err instanceof ApiError
              ? err.message
              : isAr
                ? 'تعذر تحميل المهام.'
                : 'Could not load your tasks.',
          );
        },
      )
      .finally(
        () => {
          setLoading(
            false,
          );
        },
      );


    ProjectsApi.list({
      limit: '100',
    })
      .then(
        (response) => {
          setProjects(
            response.items,
          );
        },
      )
      .catch(
        () => {},
      );


    SettingsApi.list(
      'task_status',
      true,
    )
      .then(
        setTaskStatuses,
      )
      .catch(
        () => {},
      );


    SettingsApi.list(
      'task_type',
      true,
    )
      .then(
        setTaskTypes,
      )
      .catch(
        () => {},
      );


    SettingsApi.list(
      'task_priority',
      true,
    )
      .then(
        setTaskPriorities,
      )
      .catch(
        () => {},
      );


    SettingsApi.list(
      'project_status',
      true,
    )
      .then(
        setProjectStatuses,
      )
      .catch(
        () => {},
      );
  }, [
    isAdmin,
    isAr,
  ]);


  /*
   * ==========================================================
   * LOAD ANALYTICS
   * ==========================================================
   */

  useEffect(() => {
    setStatsLoading(
      true,
    );

    setStatsError('');


    Promise.all([
      ReportsApi.monthlySummary({
        months: '12',
      }),

      ReportsApi.branchOverview(),

      ReportsApi.departmentOverview(),
    ])
      .then(
        ([
          monthlyResult,
          branchResult,
          departmentResult,
        ]) => {
          setMonthly(
            monthlyResult,
          );

          setBranches(
            branchResult as
              BranchRow[],
          );

          setDepartments(
            departmentResult as
              DepartmentRow[],
          );
        },
      )
      .catch(
        (err) => {
          setStatsError(
            err instanceof ApiError
              ? err.message
              : isAr
                ? 'تعذر تحميل الإحصائيات.'
                : 'Could not load statistics.',
          );
        },
      )
      .finally(
        () => {
          setStatsLoading(
            false,
          );
        },
      );
  }, [
    isAr,
  ]);


  /*
   * ==========================================================
   * LANGUAGE
   * ==========================================================
   */

  function inCurrentLocale(
    setting: Setting,
  ) {
    return Boolean(
      isAr
        ? setting.codeAr
        : setting.codeEn,
    );
  }


  function taskTitle(
    task: Task,
  ) {
    return isAr
      ? task.titleAr ||
          task.titleEn
      : task.titleEn ||
          task.titleAr;
  }


  function monthLabel(
    key: string,
  ) {
    const [
      year,
      month,
    ] =
      key
        .split('-')
        .map(
          Number,
        );


    return new Intl.DateTimeFormat(
      locale,
      {
        month:
          'short',

        year:
          '2-digit',
      },
    ).format(
      new Date(
        year,
        month - 1,
        1,
      ),
    );
  }


  /*
   * ==========================================================
   * STATUS / TYPE / PRIORITY COUNTS
   * ==========================================================
   */

  const counts =
    taskStatuses
      .filter(
        inCurrentLocale,
      )
      .map(
        (
          setting,
        ) => ({
          status:
            setting.key!,

          label:
            getLabel(
              'task_status',
              setting.key!,
            ),

          count:
            tasks.filter(
              (
                task,
              ) =>
                task.status ===
                setting.key,
            ).length,
        }),
      );


  const typeCounts =
    taskTypes
      .filter(
        inCurrentLocale,
      )
      .map(
        (
          setting,
        ) => ({
          taskType:
            setting.key!,

          label:
            getLabel(
              'task_type',
              setting.key!,
            ),

          count:
            tasks.filter(
              (
                task,
              ) =>
                task.taskType ===
                setting.key,
            ).length,
        }),
      );


  const priorityCounts =
    taskPriorities
      .filter(
        inCurrentLocale,
      )
      .map(
        (
          setting,
        ) => ({
          priority:
            setting.key!,

          label:
            getLabel(
              'task_priority',
              setting.key!,
            ),

          count:
            tasks.filter(
              (
                task,
              ) =>
                task.priority ===
                setting.key,
            ).length,
        }),
      );


  const projectStatusCounts =
    projectStatuses
      .filter(
        inCurrentLocale,
      )
      .map(
        (
          setting,
        ) => ({
          status:
            setting.key!,

          label:
            getLabel(
              'project_status',
              setting.key!,
            ),

          count:
            projects.filter(
              (
                project,
              ) =>
                project.status ===
                setting.key,
            ).length,
        }),
      );


  /*
   * ==========================================================
   * COMPLETION LOGIC
   * ==========================================================
   */

  const completedTaskKeys =
    useMemo(
      () => {
        const matching =
          taskStatuses
            .filter(
              (
                setting,
              ) => {
                const key =
                  setting.key
                    ?.toLowerCase() ??
                  '';


                return (
                  key.includes(
                    'complete',
                  ) ||
                  key.includes(
                    'finish',
                  ) ||
                  key ===
                    'done'
                );
              },
            )
            .map(
              (
                setting,
              ) =>
                setting.key!,
            );


        return new Set([
          ...matching,

          'Completed',
          'Finished',
          'Done',
        ]);
      },
      [
        taskStatuses,
      ],
    );


  /*
   * ==========================================================
   * KPIs
   * ==========================================================
   */

  const totalTaskCount =
    tasks.length;


  const completedTaskCount =
    tasks.filter(
      (
        task,
      ) =>
        completedTaskKeys.has(
          task.status,
        ),
    ).length;


  const overdueTasks =
    tasks.filter(
      (
        task,
      ) => {
        if (
          !task.deadlineDate
        ) {
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
      },
    );


  const overdueTaskCount =
    overdueTasks.length;


  const openTaskCount =
    tasks.filter(
      (
        task,
      ) =>
        !completedTaskKeys.has(
          task.status,
        ) &&
        task.status !==
          'Archived',
    ).length;


  const completionRate =
    totalTaskCount ===
    0
      ? 0
      : Math.round(
          (
            completedTaskCount /
            totalTaskCount
          ) *
            100,
        );


  /*
   * ==========================================================
   * TASK LISTS
   * ==========================================================
   */

  const latestTasks =
    [
      ...tasks,
    ]
      .sort(
        (
          a,
          b,
        ) =>
          new Date(
            b.createdAt,
          ).getTime() -
          new Date(
            a.createdAt,
          ).getTime(),
      )
      .slice(
        0,
        5,
      );


  const upcoming =
    tasks
      .filter(
        (
          task,
        ) =>
          Boolean(
            task.deadlineDate,
          ) &&
          !completedTaskKeys.has(
            task.status,
          ) &&
          task.status !==
            'Archived',
      )
      .sort(
        (
          a,
          b,
        ) =>
          a.deadlineDate!.localeCompare(
            b.deadlineDate!,
          ),
      )
      .slice(
        0,
        6,
      );


  /*
   * Tasks that need the most immediate attention.
   */

  const attentionTasks =
    [
      ...overdueTasks,
    ]
      .sort(
        (
          a,
          b,
        ) =>
          (
            a.deadlineDate ??
            ''
          ).localeCompare(
            b.deadlineDate ??
              '',
          ),
      )
      .slice(
        0,
        4,
      );


  /*
   * ==========================================================
   * CHART DATA
   * ==========================================================
   */

  const monthlyChartData =
    monthly.map(
      (
        item,
      ) => ({
        month:
          monthLabel(
            item.month,
          ),

        Completed:
          item.done,

        'Not completed':
          item.notDone,
      }),
    );


  const branchChartData =
    [
      ...branches,
    ]
      .map(
        (
          branch,
        ) => ({
          name:
            branch.branchName ??
            (
              isAr
                ? 'غير محدد'
                : 'Unassigned'
            ),

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
        }),
      )
      .sort(
        (
          a,
          b,
        ) =>
          b.Total -
          a.Total,
      );


  const departmentChartData =
    [
      ...departments,
    ]
      .map(
        (
          department,
        ) => ({
          name:
            department.departmentName ??
            (
              isAr
                ? 'غير محدد'
                : 'Unassigned'
            ),

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
        }),
      )
      .sort(
        (
          a,
          b,
        ) =>
          b.Total -
          a.Total,
      );


  const branchChartHeight =
    Math.max(
      280,
      branchChartData.length *
        50,
    );


  const departmentChartHeight =
    Math.max(
      280,
      departmentChartData.length *
        50,
    );


  /*
   * ==========================================================
   * LINKS
   * ==========================================================
   */

  function taskListHref(
    query = '',
  ) {
    const base =
      isAdmin
        ? '/tasks'
        : '/tasks/mine';


    return query
      ? `${base}?${query}`
      : base;
  }


  /*
   * ==========================================================
   * GREETING
   * ==========================================================
   */

  const firstName =
    user?.fullName
      ?.trim()
      .split(
        ' ',
      )[0] ??
    '';


  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (
    loading
  ) {
    return (
      <div className="space-y-6">
        <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            1,
            2,
            3,
            4,
          ].map(
            (
              item,
            ) => (
              <div
                key={
                  item
                }
                className="h-32 animate-pulse rounded-2xl bg-slate-100"
              />
            ),
          )}
        </div>


        <div className="grid gap-6 xl:grid-cols-2">
          <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }


  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div
      className="mx-auto max-w-[1600px] pb-12"
      dir={
        isAr
          ? 'rtl'
          : 'ltr'
      }
    >
      {/*
       * ======================================================
       * HEADER
       * ======================================================
       */}

      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-6 sm:px-7">
        <div className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-brand-50 blur-3xl" />


        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[.14em] text-brand-600">
              {isAr
                ? 'لوحة المتابعة'
                : 'Dashboard'}
            </div>


            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">
              {isAr
                ? `مرحباً، ${firstName}`
                : `Welcome back, ${firstName}`}
            </h1>


            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {isAdmin
                ? isAr
                  ? 'تابع المهام والمشاريع والأداء في مختلف أقسام وفروع المؤسسة.'
                  : 'Monitor tasks, projects and performance across your organization.'
                : isAr
                  ? 'تابع مهامك الحالية والمواعيد القادمة وما يحتاج إلى انتباهك.'
                  : 'See your current workload, upcoming deadlines and what needs your attention.'}
            </p>
          </div>


          <div className="flex flex-wrap gap-2">
            <Link
              href={
                taskListHref()
              }
              className="btn-secondary"
            >
              {isAr
                ? 'عرض المهام'
                : 'View tasks'}
            </Link>


            <Link
              href="/tasks/new"
              className="btn-primary"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="mr-1.5 h-4 w-4"
              >
                <path
                  d="M12 5v14M5 12h14"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>

              {isAr
                ? 'مهمة جديدة'
                : 'New task'}
            </Link>
          </div>
        </div>
      </section>


      {/*
       * ======================================================
       * ERROR
       * ======================================================
       */}

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}


      {/*
       * ======================================================
       * KPI CARDS
       * ======================================================
       */}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title={
            isAr
              ? 'إجمالي المهام'
              : 'Total tasks'
          }
          value={
            totalTaskCount
          }
          description={
            isAdmin
              ? isAr
                ? 'المهام ضمن المؤسسة'
                : 'Tasks across the organization'
              : isAr
                ? 'المهام ضمن نطاقك'
                : 'Tasks currently in your scope'
          }
          href={
            taskListHref()
          }
          tone="brand"
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path
                d="M8 7h11M8 12h11M8 17h7"
                strokeWidth="1.8"
                strokeLinecap="round"
              />

              <path
                d="m3 7 1 1 2-2m-3 6 1 1 2-2m-3 6 1 1 2-2"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />


        <MetricCard
          title={
            isAr
              ? 'مكتملة'
              : 'Completed'
          }
          value={
            completedTaskCount
          }
          description={
            isAr
              ? `${completionRate}% نسبة الإنجاز`
              : `${completionRate}% completion rate`
          }
          tone="green"
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="h-5 w-5"
            >
              <circle
                cx="12"
                cy="12"
                r="8"
                strokeWidth="1.8"
              />

              <path
                d="m8.5 12 2.2 2.2 4.8-5"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />


        <MetricCard
          title={
            isAr
              ? 'مفتوحة'
              : 'Open tasks'
          }
          value={
            openTaskCount
          }
          description={
            isAr
              ? 'مهام لم تكتمل بعد'
              : 'Work still in progress'
          }
          tone="amber"
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="h-5 w-5"
            >
              <circle
                cx="12"
                cy="12"
                r="8"
                strokeWidth="1.8"
              />

              <path
                d="M12 8v4l2.8 1.8"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          }
        />


        <MetricCard
          title={
            isAr
              ? 'متأخرة'
              : 'Overdue'
          }
          value={
            overdueTaskCount
          }
          description={
            overdueTaskCount >
            0
              ? isAr
                ? 'تحتاج إلى انتباه'
                : 'Needs attention'
              : isAr
                ? 'لا توجد مهام متأخرة'
                : 'Nothing overdue'
          }
          href={
            taskListHref(
              'overdueOnly=true',
            )
          }
          tone="red"
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path
                d="M12 9v4m0 4h.01M10.3 4.6 3.2 17a2 2 0 0 0 1.7 3h14.2a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          }
        />
      </section>


      {/*
       * ======================================================
       * STATUS OVERVIEW
       * ======================================================
       */}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <SectionHeader
          title={
            isAr
              ? 'حالة العمل'
              : 'Work status'
          }
          description={
            isAr
              ? 'اضغط على أي حالة لفتح المهام المصفاة مباشرة.'
              : 'Select a status to open the matching tasks.'
          }
          action={
            <Link
              href={
                taskListHref()
              }
              className="text-xs font-medium text-brand-600 hover:text-brand-800"
            >
              {isAr
                ? 'عرض الكل'
                : 'View all'}
            </Link>
          }
        />


        {counts.length >
          0 ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {counts.map(
              (
                item,
              ) => (
                <Link
                  key={
                    item.status
                  }
                  href={
                    taskListHref(
                      `status=${encodeURIComponent(
                        item.status,
                      )}`,
                    )
                  }
                  className="group rounded-xl border border-slate-200 bg-slate-50/40 p-4 transition hover:border-brand-200 hover:bg-brand-50/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <StatusBadge
                      value={
                        item.status
                      }
                      listType="task_status"
                    />

                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500"
                    >
                      <path
                        d="m9 18 6-6-6-6"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <div className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
                    {
                      item.count
                    }
                  </div>

                  <div className="mt-1 text-xs text-slate-400">
                    {item.count ===
                    1
                      ? isAr
                        ? 'مهمة'
                        : 'task'
                      : isAr
                        ? 'مهام'
                        : 'tasks'}
                  </div>
                </Link>
              ),
            )}
          </div>
        ) : (
          <EmptyState
            title={
              isAr
                ? 'لا توجد حالات'
                : 'No task statuses'
            }
            description={
              isAr
                ? 'ستظهر حالات المهام هنا بعد إعدادها.'
                : 'Task status totals will appear here once configured.'
            }
          />
        )}
      </section>


      {/*
       * ======================================================
       * ATTENTION + UPCOMING
       * ======================================================
       */}

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        {/*
         * ATTENTION
         */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <SectionHeader
              title={
                isAr
                  ? 'تحتاج إلى انتباه'
                  : 'Needs attention'
              }
              description={
                isAr
                  ? 'المهام المتأخرة التي يجب مراجعتها أولاً.'
                  : 'Overdue work that should be reviewed first.'
              }
            />
          </div>


          {attentionTasks.length ===
          0 ? (
            <EmptyState
              title={
                isAr
                  ? 'كل شيء تحت السيطرة'
                  : 'Nothing overdue'
              }
              description={
                isAr
                  ? 'لا توجد مهام متأخرة حالياً.'
                  : 'There are no overdue tasks in your current view.'
              }
              icon={
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    d="m6 12 4 4 8-9"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {attentionTasks.map(
                (
                  task,
                ) => (
                  <Link
                    key={
                      task.id
                    }
                    href={`/tasks/${task.id}`}
                    className="group flex items-center gap-4 px-5 py-4 transition hover:bg-red-50/40 sm:px-6"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className="h-4 w-4"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="8"
                          strokeWidth="1.8"
                        />

                        <path
                          d="M12 8v4m0 4h.01"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>


                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-800">
                        {taskTitle(
                          task,
                        )}
                      </div>

                      <div className="mt-1 text-xs text-red-500">
                        {isAr
                          ? 'الموعد النهائي'
                          : 'Due'}{' '}

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


        {/*
         * UPCOMING
         */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <SectionHeader
              title={
                isAr
                  ? 'المواعيد القادمة'
                  : 'Upcoming deadlines'
              }
              description={
                isAr
                  ? 'أقرب المهام حسب الموعد النهائي.'
                  : 'The closest task deadlines in your workload.'
              }
            />
          </div>


          {upcoming.length ===
          0 ? (
            <EmptyState
              title={
                isAr
                  ? 'لا توجد مواعيد قريبة'
                  : 'No upcoming deadlines'
              }
              description={
                isAr
                  ? 'لا توجد مهام ذات موعد نهائي حالياً.'
                  : 'Tasks with upcoming deadlines will appear here.'
              }
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {upcoming
                .slice(
                  0,
                  5,
                )
                .map(
                  (
                    task,
                  ) => (
                    <Link
                      key={
                        task.id
                      }
                      href={`/tasks/${task.id}`}
                      className="group flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50 sm:px-6"
                    >
                      <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-100">
                        <span className="text-[9px] font-semibold uppercase text-slate-400">
                          {task.deadlineDate
                            ? new Intl.DateTimeFormat(
                                locale,
                                {
                                  month:
                                    'short',
                                },
                              ).format(
                                new Date(
                                  task.deadlineDate,
                                ),
                              )
                            : ''}
                        </span>

                        <span className="text-sm font-semibold text-slate-700">
                          {task.deadlineDate
                            ? new Date(
                                task.deadlineDate,
                              ).getDate()
                            : ''}
                        </span>
                      </div>


                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-800">
                          {taskTitle(
                            task,
                          )}
                        </div>

                        <div className="mt-1 text-xs text-slate-400">
                          {getLabel(
                            'task_priority',
                            task.priority,
                          )}
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
      </section>


      {/*
       * ======================================================
       * RECENT TASKS
       * ======================================================
       */}

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <SectionHeader
            title={
              isAr
                ? 'آخر المهام'
                : 'Recent tasks'
            }
            description={
              isAr
                ? 'أحدث المهام التي تمت إضافتها.'
                : 'Recently created tasks in your current view.'
            }
            action={
              <Link
                href={
                  taskListHref()
                }
                className="text-xs font-medium text-brand-600 hover:text-brand-800"
              >
                {isAr
                  ? 'عرض جميع المهام'
                  : 'View all tasks'}
              </Link>
            }
          />
        </div>


        {latestTasks.length ===
        0 ? (
          <EmptyState
            title={
              isAr
                ? 'لا توجد مهام'
                : 'No tasks yet'
            }
            description={
              isAr
                ? 'ستظهر المهام الجديدة هنا.'
                : 'Your newest tasks will appear here.'
            }
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {latestTasks.map(
              (
                task,
              ) => (
                <Link
                  key={
                    task.id
                  }
                  href={`/tasks/${task.id}`}
                  className="group grid gap-3 px-5 py-4 transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_150px_150px] sm:items-center sm:px-6"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-800 group-hover:text-brand-700">
                      {taskTitle(
                        task,
                      )}
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      {isAr
                        ? 'تمت الإضافة'
                        : 'Added'}{' '}

                      {new Date(
                        task.createdAt,
                      ).toLocaleDateString(
                        locale,
                      )}
                    </div>
                  </div>


                  <div className="flex sm:justify-center">
                    <StatusBadge
                      value={
                        task.priority
                      }
                      listType="task_priority"
                    />
                  </div>


                  <div className="flex sm:justify-end">
                    <StatusBadge
                      value={
                        task.status
                      }
                      listType="task_status"
                    />
                  </div>
                </Link>
              ),
            )}
          </div>
        )}
      </section>


      {/*
       * ======================================================
       * FILTER SHORTCUTS
       * ======================================================
       */}

      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        {/*
         * TYPES
         */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <SectionHeader
            title={
              isAr
                ? 'أنواع المهام'
                : 'Task types'
            }
            description={
              isAr
                ? 'توزيع المهام حسب النوع.'
                : 'Workload by task type.'
            }
          />


          <div className="mt-5 space-y-2">
            {typeCounts.length >
            0 ? (
              typeCounts.map(
                (
                  item,
                ) => (
                  <Link
                    key={
                      item.taskType
                    }
                    href={
                      taskListHref(
                        `taskType=${encodeURIComponent(
                          item.taskType,
                        )}`,
                      )
                    }
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 transition hover:bg-slate-50"
                  >
                    <span className="truncate text-sm text-slate-600">
                      {
                        item.label
                      }
                    </span>

                    <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-slate-100 px-2 text-xs font-semibold text-slate-700">
                      {
                        item.count
                      }
                    </span>
                  </Link>
                ),
              )
            ) : (
              <p className="text-sm text-slate-400">
                —
              </p>
            )}
          </div>
        </div>


        {/*
         * PRIORITY
         */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <SectionHeader
            title={
              isAr
                ? 'الأهمية'
                : 'Importance'
            }
            description={
              isAr
                ? 'توزيع المهام حسب الأهمية.'
                : 'Tasks grouped by importance.'
            }
          />


          <div className="mt-5 space-y-2">
            {priorityCounts.length >
            0 ? (
              priorityCounts.map(
                (
                  item,
                ) => (
                  <Link
                    key={
                      item.priority
                    }
                    href={
                      taskListHref(
                        `priority=${encodeURIComponent(
                          item.priority,
                        )}`,
                      )
                    }
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 transition hover:bg-slate-50"
                  >
                    <StatusBadge
                      value={
                        item.priority
                      }
                      listType="task_priority"
                    />

                    <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-slate-100 px-2 text-xs font-semibold text-slate-700">
                      {
                        item.count
                      }
                    </span>
                  </Link>
                ),
              )
            ) : (
              <p className="text-sm text-slate-400">
                —
              </p>
            )}
          </div>
        </div>


        {/*
         * PROJECT STATUS
         */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <SectionHeader
            title={
              isAr
                ? 'حالة المشاريع'
                : 'Project status'
            }
            description={
              isAr
                ? 'نظرة سريعة على المشاريع.'
                : 'Quick overview of your projects.'
            }
          />


          <div className="mt-5 space-y-2">
            {projectStatusCounts.length >
            0 ? (
              projectStatusCounts.map(
                (
                  item,
                ) => (
                  <Link
                    key={
                      item.status
                    }
                    href={`/projects?status=${encodeURIComponent(
                      item.status,
                    )}`}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 transition hover:bg-slate-50"
                  >
                    <StatusBadge
                      value={
                        item.status
                      }
                      listType="project_status"
                    />

                    <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-slate-100 px-2 text-xs font-semibold text-slate-700">
                      {
                        item.count
                      }
                    </span>
                  </Link>
                ),
              )
            ) : (
              <p className="text-sm text-slate-400">
                —
              </p>
            )}
          </div>
        </div>
      </section>


      {/*
       * ======================================================
       * ANALYTICS
       * ======================================================
       */}

      <section className="mt-10">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[.14em] text-brand-600">
            {isAr
              ? 'التحليلات'
              : 'Analytics'}
          </div>

          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
            {isAdmin
              ? isAr
                ? 'أداء المؤسسة'
                : 'Organization performance'
              : isAr
                ? 'أداؤك'
                : 'Your performance'}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {isAdmin
              ? isAr
                ? 'راقب اتجاه الإنجاز والأداء حسب الفروع والأقسام.'
                : 'Monitor completion trends and performance across branches and departments.'
              : isAr
                ? 'تابع اتجاه إنجاز مهامك خلال الفترة الماضية.'
                : 'Track how your task workload has progressed over time.'}
          </p>
        </div>


        {statsError && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {
              statsError
            }
          </div>
        )}


        {statsLoading ? (
          <div className="mt-6 h-96 animate-pulse rounded-2xl bg-slate-100" />
        ) : (
          <>
            {/*
             * =================================================
             * MONTHLY CHART
             * =================================================
             */}

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 p-5 sm:p-6">
                <SectionHeader
                  title={
                    isAr
                      ? 'أداء المهام مع الوقت'
                      : 'Task performance over time'
                  }
                  description={
                    isAr
                      ? 'المهام المكتملة مقابل غير المكتملة خلال آخر 12 شهراً.'
                      : 'Completed versus not completed work during the last 12 months.'
                  }
                  action={
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="h-2 w-2 rounded-full bg-brand-500" />

                      {isAr
                        ? 'آخر 12 شهراً'
                        : '12 month trend'}
                    </div>
                  }
                />
              </div>


              {monthlyChartData.length ===
              0 ? (
                <ChartEmptyState
                  message={
                    isAr
                      ? 'لا توجد بيانات شهرية بعد'
                      : 'No monthly data yet'
                  }
                />
              ) : (
                <div className="h-[370px] p-4 sm:p-6">
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
                        right: 18,
                        bottom: 4,
                        left: -18,
                      }}
                    >
                      <CartesianGrid
                        vertical={
                          false
                        }
                        stroke="#e2e8f0"
                        strokeDasharray="3 6"
                      />


                      <XAxis
                        dataKey="month"
                        axisLine={
                          false
                        }
                        tickLine={
                          false
                        }
                        dy={
                          10
                        }
                        tick={{
                          fontSize: 11,
                          fill: '#64748b',
                        }}
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
                          fontSize: 11,
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
                            '12px',

                          border:
                            '1px solid #e2e8f0',

                          boxShadow:
                            '0 14px 35px rgba(15,23,42,.1)',

                          fontSize:
                            '12px',
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
                        strokeWidth={
                          2.5
                        }
                        dot={{
                          r: 2.5,
                        }}
                        activeDot={{
                          r: 5,
                        }}
                      />


                      <Line
                        type="monotone"
                        dataKey="Not completed"
                        stroke="var(--theme-primary)"
                        strokeWidth={
                          2.5
                        }
                        dot={{
                          r: 2.5,
                        }}
                        activeDot={{
                          r: 5,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>


            {/*
             * =================================================
             * BRANCH / DEPARTMENT
             * =================================================
             */}

            {isAdmin && (
              <div className="mt-6 grid gap-6 xl:grid-cols-2">
                {/*
                 * BRANCH
                 */}

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 p-5 sm:p-6">
                    <SectionHeader
                      title={
                        isAr
                          ? 'أداء الفروع'
                          : 'Branch performance'
                      }
                      description={
                        isAr
                          ? 'المهام المكتملة والمتأخرة حسب الفرع.'
                          : 'Completed and overdue work by branch.'
                      }
                    />
                  </div>


                  {branchChartData.length ===
                  0 ? (
                    <ChartEmptyState
                      message={
                        isAr
                          ? 'لا توجد بيانات للفروع'
                          : 'No branch data yet'
                      }
                    />
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
                              top: 4,
                              right: 28,
                              bottom: 4,
                              left: 8,
                            }}
                          >
                            <CartesianGrid
                              horizontal={
                                false
                              }
                              stroke="#e2e8f0"
                              strokeDasharray="3 6"
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
                                  10,

                                fill:
                                  '#94a3b8',
                              }}
                            />


                            <YAxis
                              dataKey="name"
                              type="category"
                              width={
                                110
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

                                fill:
                                  '#475569',
                              }}
                            />


                            <Tooltip
                              contentStyle={{
                                borderRadius:
                                  '12px',

                                border:
                                  '1px solid #e2e8f0',

                                boxShadow:
                                  '0 14px 35px rgba(15,23,42,.1)',

                                fontSize:
                                  '12px',
                              }}
                            />


                            <Legend
                              iconType="circle"
                              wrapperStyle={{
                                fontSize:
                                  '11px',
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
                              maxBarSize={
                                16
                              }
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
                              maxBarSize={
                                16
                              }
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>


                {/*
                 * DEPARTMENT
                 */}

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 p-5 sm:p-6">
                    <SectionHeader
                      title={
                        isAr
                          ? 'أداء الأقسام'
                          : 'Department performance'
                      }
                      description={
                        isAr
                          ? 'المهام المكتملة والمتأخرة حسب القسم.'
                          : 'Completed and overdue work by department.'
                      }
                    />
                  </div>


                  {departmentChartData.length ===
                  0 ? (
                    <ChartEmptyState
                      message={
                        isAr
                          ? 'لا توجد بيانات للأقسام'
                          : 'No department data yet'
                      }
                    />
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
                              top: 4,
                              right: 28,
                              bottom: 4,
                              left: 8,
                            }}
                          >
                            <CartesianGrid
                              horizontal={
                                false
                              }
                              stroke="#e2e8f0"
                              strokeDasharray="3 6"
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
                                  10,

                                fill:
                                  '#94a3b8',
                              }}
                            />


                            <YAxis
                              dataKey="name"
                              type="category"
                              width={
                                110
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

                                fill:
                                  '#475569',
                              }}
                            />


                            <Tooltip
                              contentStyle={{
                                borderRadius:
                                  '12px',

                                border:
                                  '1px solid #e2e8f0',

                                boxShadow:
                                  '0 14px 35px rgba(15,23,42,.1)',

                                fontSize:
                                  '12px',
                              }}
                            />


                            <Legend
                              iconType="circle"
                              wrapperStyle={{
                                fontSize:
                                  '11px',
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
                              maxBarSize={
                                16
                              }
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
                              maxBarSize={
                                16
                              }
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}


/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}