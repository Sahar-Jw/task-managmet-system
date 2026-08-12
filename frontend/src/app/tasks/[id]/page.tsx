'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import StatusBadge from '@/components/StatusBadge';
import { useAuth } from '@/lib/auth-context';
import { ApiError, downloadFile } from '@/lib/api';
import {
  AssignmentsApi,
  AttachmentsApi,
  CommentsApi,
  RatingsApi,
  TasksApi,
  UsersApi,
} from '@/lib/endpoints';
import type { Task, TaskComment, User } from '@/lib/types';
import ReasonModal from '@/components/ReasonModal';

const NEXT_STATUS_OPTIONS: Record<string, string[]> = {
  Pending: ['InProgress', 'Finished'],
  Unassigned: ['InProgress', 'Finished'],
  InProgress: ['PendingApproval', 'Completed', 'Finished'],
  PendingApproval: ['InProgress', 'Completed'],
  Completed: ['Archived'],
  Reopened: ['InProgress'],
  Finished: ['Archived'],
  Archived: [],
};

function TaskDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [newComment, setNewComment] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');

  // Which "reason" modal (if any) is currently open, and what to do with the reason once confirmed.
  const [reasonModal, setReasonModal] = useState<{
    title: string;
    description?: string;
    minLength: number;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: (reason: string) => void;
  } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [t, c] = await Promise.all([TasksApi.get(id), CommentsApi.list(id)]);
      setTask(t);
      setComments(c);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load this task.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    
      UsersApi.list({ limit: '100' }).then((res) => setUsers(res.items));
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function withFeedback(action: () => Promise<any>) {
    setError('');
    setNotice('');
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  }

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (!task) return <p className="text-red-600">{error || 'Task not found.'}</p>;

  const isAdmin = user?.role.name === 'ADMIN';
  const isCreator = task.createdById === user?.id;
  const isAssignee = task.assignedToId === user?.id;
  const isApprover = task.approverId === user?.id;
  const myAssignment = task.assignments?.find((a) => a.assigneeId === user?.id);
  const canRate = task.status === 'Completed' && (isAdmin || isCreator) && !isAssignee;
  const canDecideApproval =
    task.needsApproval && task.approvalStatus === 'Pending' && (isAdmin || isApprover);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <div className="card p-6" style={task.color ? { borderTop: `4px solid ${task.color}` } : undefined}>
          <button onClick={() => router.push('/tasks')} className="text-sm text-brand-600 hover:underline">
            ← Back to tasks
          </button>

          <div className="mt-2 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">{task.titleEn}</h1>
              <h2 dir="rtl" className="text-lg text-slate-500">{task.titleAr}</h2>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <StatusBadge value={task.taskType} />
              <StatusBadge value={task.priority} />
              <StatusBadge value={task.status} />
            </div>
          </div>

          {(task.descriptionEn || task.descriptionAr) && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {task.descriptionEn && <p className="text-sm text-slate-600">{task.descriptionEn}</p>}
              {task.descriptionAr && <p dir="rtl" className="text-sm text-slate-600">{task.descriptionAr}</p>}
            </div>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-400">Branch</dt>
              <dd className="text-slate-700">{task.branch?.valueEn || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Department</dt>
              <dd className="text-slate-700">{task.department?.valueEn || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Project</dt>
              <dd className="text-slate-700">{task.project?.name || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">For whom</dt>
              <dd className="text-slate-700">{task.assignedTo?.fullName || 'Unassigned'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Created by</dt>
              <dd className="text-slate-700">{task.createdBy?.fullName || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Father task</dt>
              <dd className="text-slate-700">{task.parentTask?.titleEn || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Start date</dt>
              <dd className="text-slate-700">{task.startDate || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Deadline</dt>
              <dd className="text-slate-700">{task.deadlineDate || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Actually ended</dt>
              <dd className="text-slate-700">
                {task.actualEndDate ? new Date(task.actualEndDate).toLocaleDateString() : '—'}
              </dd>
            </div>
          </dl>

          {task.needsBudget && (
            <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm">
              <span className="font-medium text-slate-600">Money range: </span>
              <span className="text-slate-700">
                {task.budgetMin ?? '—'} – {task.budgetMax ?? '—'} {task.budgetCurrency}
              </span>
            </div>
          )}

          {task.needsApproval && (
            <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-600">Approval</span>
                <StatusBadge value={task.approvalStatus} />
              </div>
              <p className="mt-1 text-slate-500">Approver: {task.approver?.fullName || '—'}</p>
              {task.approvalStatus === 'Rejected' && task.rejectionReason && (
                <p className="mt-1 text-red-600">Rejection reason: {task.rejectionReason}</p>
              )}
              {canDecideApproval && (
                <div className="mt-3 flex gap-2">
                  <button
                    className="btn-primary"
                    onClick={() => withFeedback(() => TasksApi.decideApproval(task.id, true))}
                  >
                    Approve
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() =>
                      setReasonModal({
                        title: 'Reject task approval',
                        description: 'Please explain why this task is being rejected.',
                        minLength: 5,
                        confirmLabel: 'Reject',
                        danger: true,
                        onConfirm: (reason) => {
                          setReasonModal(null);
                          withFeedback(() => TasksApi.decideApproval(task.id, false, reason));
                        },
                      })
                    }
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          )}

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          {notice && <p className="mt-4 text-sm text-green-600">{notice}</p>}

          {/* Status controls */}
          {NEXT_STATUS_OPTIONS[task.status]?.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {NEXT_STATUS_OPTIONS[task.status].map((next) => (
                <button
                  key={next}
                  className="btn-secondary"
                  onClick={() => {
                    if (next === 'Finished') {
                      setReasonModal({
                        title: 'Finish this task',
                        description: 'Please provide a reason for marking this task as finished.',
                        minLength: 10,
                        confirmLabel: 'Move to Finished',
                        onConfirm: (reason) => {
                          setReasonModal(null);
                          withFeedback(() => TasksApi.changeStatus(task.id, next, reason));
                        },
                      });
                      return;
                    }
                    withFeedback(() => TasksApi.changeStatus(task.id, next));
                  }}
                >
                  Move to {next}
                </button>
              ))}
              {isAdmin && (task.status === 'Completed' || task.status === 'Finished') && (
                <button
                  className="btn-secondary"
                  onClick={() =>
                    setReasonModal({
                      title: 'Reopen this task',
                      description: 'Please provide a reason for reopening this task.',
                      minLength: 10,
                      confirmLabel: 'Reopen',
                      onConfirm: (reason) => {
                        setReasonModal(null);
                        withFeedback(() => TasksApi.reopen(task.id, reason));
                      },
                    })
                  }
                >
                  Reopen
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sub-tasks */}
        {task.subTasks && task.subTasks.length > 0 && (
          <div className="card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Sub-tasks</h2>
            <div className="mt-3 space-y-2">
              {task.subTasks.map((st) => (
                <button
                  key={st.id}
                  onClick={() => router.push(`/tasks/${st.id}`)}
                  className="flex w-full items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-left text-sm hover:bg-slate-100"
                >
                  <span className="text-slate-700">{st.titleEn}</span>
                  <StatusBadge value={st.status} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Comments</h2>
          <div className="mt-3 space-y-3">
            {comments.length === 0 && <p className="text-sm text-slate-500">No comments yet.</p>}
            {comments.map((c) => (
              <div key={c.id} className="rounded-md bg-slate-50 p-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium text-slate-700">{c.author?.fullName || 'Unknown'}</span>
                  <span>{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-sm text-slate-700">{c.content}</p>
              </div>
            ))}
          </div>

          {task.status !== 'Archived' && (
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newComment.trim()) return;
                withFeedback(async () => {
                  await CommentsApi.add(task.id, newComment);
                  setNewComment('');
                });
              }}
            >
              <input
                className="input"
                placeholder="Add a comment…"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button className="btn-primary shrink-0" type="submit">
                Post
              </button>
            </form>
          )}
        </div>

        {/* Attachments (file, any kind) */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Attachments</h2>
          <div className="mt-3 space-y-2">
            {(task.attachments || []).length === 0 && (
              <p className="text-sm text-slate-500">No files attached.</p>
            )}
            {(task.attachments || []).map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{a.fileName}</span>
                <button
                  className="text-brand-600 hover:underline"
                  onClick={() => downloadFile(`/attachments/${a.id}`, a.fileName)}
                >
                  Download
                </button>
              </div>
            ))}
          </div>
          {task.status !== 'Archived' && (
            <input
              type="file"
              className="mt-3 text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                withFeedback(() => AttachmentsApi.uploadToTask(task.id, file));
                e.target.value = '';
              }}
            />
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Assignment (legacy multi-assignee workflow, optional/secondary to "For whom") */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Assignment</h2>
          {task.assignments && task.assignments.length > 0 ? (
            <div className="mt-3 space-y-2">
              {task.assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{a.assignee?.fullName || 'Unknown'}</span>
                  <StatusBadge value={a.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No additional assignments.</p>
          )}

          {myAssignment?.status === 'PendingAcceptance' && (
            <div className="mt-4 flex gap-2">
              <button
                className="btn-primary"
                onClick={() => withFeedback(() => AssignmentsApi.accept(myAssignment.id))}
              >
                Accept
              </button>
              <button
                className="btn-danger"
                onClick={() =>
                  setReasonModal({
                    title: 'Reject this assignment',
                    description: 'Please explain why you are rejecting this assignment.',
                    minLength: 10,
                    confirmLabel: 'Reject',
                    danger: true,
                    onConfirm: (reason) => {
                      setReasonModal(null);
                      withFeedback(() => AssignmentsApi.reject(myAssignment.id, reason));
                    },
                  })
                }
              >
                Reject
              </button>
            </div>
          )}

            <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
              <select className="input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">Assign to…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </select>
              <button
                className="btn-secondary shrink-0"
                onClick={() => {
                  if (!assigneeId) return;
                  withFeedback(async () => {
                    await AssignmentsApi.assign(task.id, assigneeId);
                    setAssigneeId('');
                  });
                }}
              >
                Assign
              </button>
            </div>
  
        </div>

        {/* Evaluation: the creator rates the finished task; the doer sees it */}
        {canRate && (
          <div className="card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Evaluate this task</h2>
            <div className="mt-3 space-y-3">
              <select
                className="input"
                value={ratingScore}
                onChange={(e) => setRatingScore(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} / 5
                  </option>
                ))}
              </select>
              <textarea
                className="input"
                rows={2}
                placeholder="Optional feedback"
                value={ratingFeedback}
                onChange={(e) => setRatingFeedback(e.target.value)}
              />
              <button
                className="btn-primary w-full"
                onClick={() =>
                  withFeedback(async () => {
                    await RatingsApi.rate(task.id, ratingScore, ratingFeedback || undefined);
                    setNotice('Evaluation saved.');
                  })
                }
              >
                Submit evaluation
              </button>
            </div>
          </div>
        )}

        {task.ratings && task.ratings.length > 0 && (
          <div className="card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Evaluation {isAssignee ? '(for you)' : ''}
            </h2>
            <div className="mt-3 space-y-2">
              {task.ratings.map((r) => (
                <div key={r.id} className="text-sm">
                  <span className="font-medium text-slate-700">{r.score} / 5</span>
                  {r.feedback && <p className="text-slate-500">{r.feedback}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ReasonModal
        open={reasonModal !== null}
        title={reasonModal?.title || ''}
        description={reasonModal?.description}
        minLength={reasonModal?.minLength ?? 0}
        confirmLabel={reasonModal?.confirmLabel}
        danger={reasonModal?.danger}
        onCancel={() => setReasonModal(null)}
        onConfirm={(reason) => reasonModal?.onConfirm(reason)}
      />
    </div>
  );
}

export default function TaskDetailPage() {
  return (
    <ProtectedRoute>
      <TaskDetailContent />
    </ProtectedRoute>
  );
}
