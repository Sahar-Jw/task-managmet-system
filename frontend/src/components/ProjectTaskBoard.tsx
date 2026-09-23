'use client';


import { uiText } from '@/lib/ui-text';
import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import ReasonModal from '@/components/ReasonModal';
import { ApiError } from '@/lib/api';
import { TasksApi } from '@/lib/endpoints';
import type { Project, Task, TaskStatus, User } from '@/lib/types';

const STATUS_ORDER: TaskStatus[] = [
  'InProgress',
  'Completed',
  'Finished',
  'Archived',
];

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  InProgress: ['Completed', 'Finished'],
  Completed: ['Reopened', 'Archived'],
  Reopened: ['InProgress'],
  Finished: ['Archived'],
  Archived: [],
};

function formatDate(value: string | undefined, locale: string) {
  if (!value) return '-';
  return new Date(`${value}T00:00:00`).toLocaleDateString(locale);
}

function dayNumber(value: string) {
  return new Date(`${value}T00:00:00`).getTime();
}

function progressForStatus(status: TaskStatus) {
  if (status === 'Completed' || status === 'Finished' || status === 'Archived') return 100;
  if (status === 'InProgress') return 50;
  if (status === 'Reopened') return 25;
  return 0;
}

function canMoveTask(task: Task, project: Project, user: User | null) {
  if (!user || user.role.name === 'ADMIN') return true;
  if (task.assignedToId === user.id) return true;
  return user.role.name === 'TEAM_LEADER' && project.teamId === user.teamId;
}

export default function ProjectTaskBoard({
  project,
  tasks,
  user,
  locale,
  getLabel,
  onTaskChanged,
}: {
  project: Project;
  tasks: Task[];
  user: User | null;
  locale: string;
  getLabel: (type: 'task_status', key: string) => string;
  onTaskChanged: (task: Task) => void;
}) {
  const isArabic = locale === 'ar';
  const [view, setView] = useState<'tracker' | 'board'>('tracker');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [boardError, setBoardError] = useState('');
  const draggedRef = useRef(false);
  const [reasonRequest, setReasonRequest] = useState<{
    task: Task;
    nextStatus: string;
  } | null>(null);

  const statuses = STATUS_ORDER;

  const taskStartDates = tasks
    .map((task) => task.startDate || task.createdAt.slice(0, 10))
    .filter(Boolean);
  const taskEndDates = tasks
    .map((task) => task.deadlineDate || task.startDate || task.createdAt.slice(0, 10))
    .filter(Boolean);
  const timelineStart = [project.startDate, ...taskStartDates]
    .filter(Boolean)
    .sort()[0];
  const timelineEnd = [project.endDate, ...taskEndDates]
    .filter(Boolean)
    .sort()
    .at(-1);
  const start = timelineStart ? dayNumber(timelineStart) : 0;
  const end = timelineEnd ? dayNumber(timelineEnd) : start;
  const span = Math.max(end - start, 86400000);
  const timelineTicks = useMemo(() => {
    if (!timelineStart || !timelineEnd) return [];

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start + (span * index) / 6);

      return {
        label: date.toLocaleDateString(locale, { month: 'short', day: 'numeric' }),
        position: (index / 6) * 100,
      };
    });
  }, [locale, span, start, timelineEnd, timelineStart]);

  async function moveTask(task: Task, nextStatus: string) {
    if (task.status === nextStatus || !canMoveTask(task, project, user)) return;
    if (!(ALLOWED_TRANSITIONS[task.status] || []).includes(nextStatus)) {
      setBoardError(uiText(isArabic, 'text1137'));
      return;
    }

    if (nextStatus === 'Finished') {
      setReasonRequest({ task, nextStatus });
      return;
    }

    await saveStatus(task, nextStatus);
  }

  async function saveStatus(task: Task, nextStatus: string, reason?: string) {
    setBoardError('');
    setSavingTaskId(task.id);
    try {
      const updated = await TasksApi.changeStatus(task.id, nextStatus, reason);
      onTaskChanged(updated);
    } catch (error) {
      setBoardError(error instanceof ApiError ? error.message : (uiText(isArabic, 'text1140')));
    } finally {
      setSavingTaskId(null);
      setDraggedTaskId(null);
      setReasonRequest(null);
    }
  }

  function dropOnStatus(status: string) {
    if (!draggedTaskId) return;
    const task = tasks.find((item) => item.id === draggedTaskId);
    if (task) void moveTask(task, status);
  }

  return (
    <div className="card p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {uiText(isArabic, 'text1141')}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {uiText(isArabic, 'text1142')}
          </p>
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button type="button" className={`rounded-md px-3 py-1.5 text-xs ${view === 'tracker' ? 'bg-white font-semibold text-slate-800 shadow-sm' : 'text-slate-500'}`} onClick={() => setView('tracker')}>
            {uiText(isArabic, 'text1143')}
          </button>
          <button type="button" className={`rounded-md px-3 py-1.5 text-xs ${view === 'board' ? 'bg-white font-semibold text-slate-800 shadow-sm' : 'text-slate-500'}`} onClick={() => setView('board')}>
            {uiText(isArabic, 'text1144')}
          </button>
        </div>
      </div>

      {boardError && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{boardError}</p>}

      {view === 'tracker' ? (
        <div className="mt-5 overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="mb-2 grid grid-cols-[minmax(220px,1.2fr)_minmax(520px,2fr)] gap-3 text-xs font-medium text-slate-400">
              <span>{uiText(isArabic, 'text1145')}</span>
              <div className="relative h-6">
                {timelineTicks.map((tick) => (
                  <span
                    key={tick.position}
                    className="absolute -translate-x-1/2 whitespace-nowrap"
                    style={{ left: `${tick.position}%` }}
                  >
                    {tick.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">{uiText(isArabic, 'text1146')}</p>
              ) : tasks.map((task) => {
                const taskStart = task.startDate || task.createdAt.slice(0, 10);
                const taskEnd = task.deadlineDate || taskStart;
                const left = timelineStart
                  ? Math.min(100, Math.max(0, ((dayNumber(taskStart) - start) / span) * 100))
                  : 0;
                const width = timelineStart
                  ? Math.max(2, ((dayNumber(taskEnd) - dayNumber(taskStart)) / span) * 100)
                  : 100;
                const progress = progressForStatus(task.status);
                const barWidth = Math.max(2, Math.min(width, 100 - left));
                const today = new Date().toISOString().slice(0, 10);
                const isCompleted = task.status === 'Completed';
                const isFinished = task.status === 'Finished';
                const isOverdue = Boolean(
                  task.deadlineDate &&
                  task.deadlineDate < today &&
                  !['Completed', 'Finished', 'Archived'].includes(task.status),
                );
                const barTrackClass = isFinished
                  ? 'bg-slate-200'
                  : isCompleted
                  ? 'bg-green-100'
                  : isOverdue
                    ? 'bg-red-100'
                    : 'bg-brand-200';
                const barProgressClass = isFinished
                  ? 'bg-slate-900'
                  : isCompleted
                  ? 'bg-green-600'
                  : isOverdue
                    ? 'bg-red-600'
                    : 'bg-brand-500';
                return (
                  <div key={task.id} className="grid grid-cols-[minmax(220px,1.2fr)_minmax(520px,2fr)] items-center gap-3 rounded-lg border border-slate-100 px-3 py-2">
                    <Link href={`/tasks/view?id=${task.id}`} className="min-w-0 hover:text-brand-700">
                      <div className="truncate text-sm font-medium text-slate-800">{task.title}</div>
                      <div className="mt-1 text-xs text-slate-400">{formatDate(taskStart, locale)} - {formatDate(task.deadlineDate, locale)}</div>
                    </Link>
                    <div
                      className="relative h-8 overflow-hidden rounded border border-slate-100 bg-slate-50"
                      style={{
                        backgroundImage: 'linear-gradient(to right, rgba(148, 163, 184, 0.2) 1px, transparent 1px)',
                        backgroundSize: '14.2857% 100%',
                      }}
                    >
                      <div
                        className="absolute top-1.5 h-5 overflow-hidden rounded"
                        style={{ left: `${left}%`, width: `${barWidth}%` }}
                        title={getLabel('task_status', task.status)}
                      >
                        <div className={`absolute inset-0 ${barTrackClass}`} />
                        <div
                          className={`absolute inset-y-0 left-0 ${barProgressClass}`}
                          style={{
                            width: `${progress}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 overflow-x-auto md:grid-cols-2 xl:grid-cols-4">
          {statuses.map((status) => (
            <div key={status} className="min-h-[250px] min-w-[220px] rounded-lg bg-slate-50 p-3" onDragOver={(event) => event.preventDefault()} onDrop={() => dropOnStatus(status)}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-700">{getLabel('task_status', status)}</h3>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">{tasks.filter((task) => task.status === status).length}</span>
              </div>
              <div className="space-y-2">
                {tasks.filter((task) => task.status === status).map((task) => {
                  const movable = canMoveTask(task, project, user);
                  return (
                    <div key={task.id} draggable={movable && savingTaskId !== task.id} onDragStart={() => { draggedRef.current = true; setDraggedTaskId(task.id); }} className={`rounded-lg border bg-white p-3 shadow-sm ${movable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default opacity-80'}`}>
                      <Link href={`/tasks/view?id=${task.id}`} onClick={(event) => { if (draggedRef.current) { event.preventDefault(); draggedRef.current = false; } }} className="block text-sm font-medium text-slate-800 hover:text-brand-700">{task.title}</Link>
                      <div className="mt-2 flex flex-wrap gap-1.5"><StatusBadge value={task.priority} listType="task_priority" />{task.assignedTo && <span className="text-xs text-slate-500">{task.assignedTo.fullName}</span>}</div>
                      <div className="mt-2 text-xs text-slate-400">{formatDate(task.startDate, locale)} - {formatDate(task.deadlineDate, locale)}</div>
                      {!movable && <div className="mt-2 text-[11px] text-slate-400">{uiText(isArabic, 'text1147')}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <ReasonModal
        open={reasonRequest !== null}
        title={uiText(isArabic, 'text0103')}
        description={uiText(isArabic, 'text0109')}
        minLength={10}
        confirmLabel={uiText(isArabic, 'text0110')}
        onCancel={() => setReasonRequest(null)}
        onConfirm={(reason) => {
          if (reasonRequest) {
            void saveStatus(reasonRequest.task, reasonRequest.nextStatus, reason);
          }
        }}
      />
    </div>
  );
}
