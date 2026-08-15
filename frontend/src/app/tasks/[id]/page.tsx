'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import StatusBadge from '@/components/StatusBadge';
import AttachmentCard from '@/components/AttachmentCard';
import AttachmentPreviewModal from '@/components/AttachmentPreviewModal';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { ATTACHMENT_ACCEPT } from '@/lib/file-kind';
import {
  AssignmentsApi,
  AttachmentsApi,
  BranchesApi,
  CommentsApi,
  DepartmentsApi,
  ProjectsApi,
  RatingsApi,
  TasksApi,
  UsersApi,
} from '@/lib/endpoints';
import type { Branch, Department, Project, Task, TaskAttachment, TaskComment, User } from '@/lib/types';
import ReasonModal from '@/components/ReasonModal';
import ConfirmModal from '@/components/ConfirmModal';

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
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // ---- Editing (Task creator / Admin only) ----
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    titleAr: '',
    titleEn: '',
    descriptionAr: '',
    descriptionEn: '',
    priority: 'Medium',
    branchId: '',
    departmentId: '',
    projectId: '',
    assignedToId: '',
    startDate: '',
    deadlineDate: '',
  });

  function startEditing() {
    if (!task) return;
    setEditForm({
      titleAr: task.titleAr || '',
      titleEn: task.titleEn || '',
      descriptionAr: task.descriptionAr || '',
      descriptionEn: task.descriptionEn || '',
      priority: task.priority || 'Medium',
      branchId: task.branchId || '',
      departmentId: task.departmentId || '',
      projectId: task.projectId || '',
      assignedToId: task.assignedToId || '',
      startDate: task.startDate || '',
      deadlineDate: task.deadlineDate || '',
    });
    setError('');
    setIsEditing(true);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!task) return;
    setSavingEdit(true);
    setError('');
    try {
      await TasksApi.update(task.id, {
        titleAr: editForm.titleAr,
        titleEn: editForm.titleEn,
        descriptionAr: editForm.descriptionAr || undefined,
        descriptionEn: editForm.descriptionEn || undefined,
        priority: editForm.priority,
        branchId: editForm.branchId || undefined,
        departmentId: editForm.departmentId || undefined,
        projectId: editForm.projectId || undefined,
        assignedToId: editForm.assignedToId || undefined,
        startDate: editForm.startDate || undefined,
        deadlineDate: editForm.deadlineDate || undefined,
      });
      setIsEditing(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save changes.');
    } finally {
      setSavingEdit(false);
    }
  }

  const [newComment, setNewComment] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [reassignSelections, setReassignSelections] = useState<Record<string, string>>({});
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<TaskAttachment | null>(null);
  const [attachmentToDelete, setAttachmentToDelete] = useState<TaskAttachment | null>(null);
  const [deletingAttachment, setDeletingAttachment] = useState(false);

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
      BranchesApi.list().then(setBranches).catch(() => {});
      DepartmentsApi.list().then(setDepartments).catch(() => {});
      ProjectsApi.list({ limit: '100' }).then((res) => setProjects(res.items)).catch(() => {});
    
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

  async function confirmDeleteAttachment() {
    if (!attachmentToDelete) return;
    setDeletingAttachment(true);
    try {
      await withFeedback(() => AttachmentsApi.remove(attachmentToDelete.id));
    } finally {
      setDeletingAttachment(false);
      setAttachmentToDelete(null);
    }
  }

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (!task) return <p className="text-red-600">{error || 'Task not found.'}</p>;

  const isAdmin = user?.role.name === 'ADMIN';
  const isCreator = task.createdById === user?.id;
  // Admins are never a valid assignee — a Task is always assigned to a
  // regular User, never to another Admin.
  const assignableUsers = users.filter((u) => u.role.name !== 'ADMIN');
  const isAssignee = task.assignedToId === user?.id;
  const isApprover = task.approverId === user?.id;
  const myAssignment = task.assignments?.find((a) => a.assigneeId === user?.id);
  const canRate = task.status === 'Completed' && (isAdmin || isCreator) && !isAssignee;
  // If any Assignment is Rejected, the creator/Admin reassigns it instead of
  // making a brand-new Assignment, so the plain "Assign" control is hidden.
  const hasRejectedAssignment = task.assignments?.some((a) => a.status === 'Rejected') ?? false;
  const canDecideApproval =
    task.needsApproval && task.approvalStatus === 'Pending' && (isAdmin || isApprover);

  // Attachments: only the Task creator (owner) or Admin may add/delete.
  // The assigned User(s) can always preview; download depends on the
  // creator's/Admin's toggle (assigneeCanDownloadAttachments).
  const isAssigneeOfTask = isAssignee || !!myAssignment;
  const canManageAttachments = isCreator || isAdmin;
  const canDownloadAttachments =
    canManageAttachments || (isAssigneeOfTask && task.assigneeCanDownloadAttachments);
  // Only the Task creator or Admin may edit the Task's fields, and only
  // while it isn't archived or awaiting an approval decision.
  const canEditTask =
    (isCreator || isAdmin) && task.status !== 'Archived' && task.status !== 'PendingApproval';

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
              {canEditTask && !isEditing && (
                <button className="btn-secondary" onClick={startEditing}>
                  Edit
                </button>
              )}
            </div>
          </div>

          {isEditing ? (
            <form onSubmit={saveEdit} className="mt-4 space-y-4 rounded-md border border-slate-200 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Title (English)</label>
                  <input
                    className="input"
                    required
                    maxLength={255}
                    value={editForm.titleEn}
                    onChange={(e) => setEditForm((f) => ({ ...f, titleEn: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">العنوان (Arabic)</label>
                  <input
                    dir="rtl"
                    className="input"
                    required
                    maxLength={255}
                    value={editForm.titleAr}
                    onChange={(e) => setEditForm((f) => ({ ...f, titleAr: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Description (English)</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={editForm.descriptionEn}
                    onChange={(e) => setEditForm((f) => ({ ...f, descriptionEn: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">الوصف (Arabic)</label>
                  <textarea
                    dir="rtl"
                    className="input"
                    rows={3}
                    value={editForm.descriptionAr}
                    onChange={(e) => setEditForm((f) => ({ ...f, descriptionAr: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="label">Level of importance</label>
                  <select
                    className="input"
                    value={editForm.priority}
                    onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value }))}
                  >
                    {['Low', 'Medium', 'High', 'Critical'].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Branch</label>
                  <select
                    className="input"
                    value={editForm.branchId}
                    onChange={(e) => setEditForm((f) => ({ ...f, branchId: e.target.value }))}
                  >
                    <option value="">None</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.valueEn} ({b.codeEn})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Department</label>
                  <select
                    className="input"
                    value={editForm.departmentId}
                    onChange={(e) => setEditForm((f) => ({ ...f, departmentId: e.target.value }))}
                  >
                    <option value="">None</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.valueEn} ({d.codeEn})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="label">Project</label>
                  <select
                    className="input"
                    value={editForm.projectId}
                    onChange={(e) => setEditForm((f) => ({ ...f, projectId: e.target.value }))}
                  >
                    <option value="">None</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">For whom</label>
                  <select
                    className="input"
                    value={editForm.assignedToId}
                    onChange={(e) => setEditForm((f) => ({ ...f, assignedToId: e.target.value }))}
                  >
                    <option value="">Unassigned</option>
                    {assignableUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Start date</label>
                  <input
                    type="date"
                    className="input"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm((f) => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Deadline</label>
                  <input
                    type="date"
                    className="input"
                    value={editForm.deadlineDate}
                    onChange={(e) => setEditForm((f) => ({ ...f, deadlineDate: e.target.value }))}
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setError('');
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={savingEdit}>
                  {savingEdit ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          ) : (
            <>
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
            </>
          )}

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

        {/* Attachments (images, PDF, Word, Excel — any kind, any number at once) */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Attachments</h2>
            {task.status !== 'Archived' && canManageAttachments && (
              <label className="btn-secondary cursor-pointer text-xs">
                {uploadingAttachments ? 'Uploading…' : 'Add files'}
                <input
                  type="file"
                  multiple
                  accept={ATTACHMENT_ACCEPT}
                  className="hidden"
                  disabled={uploadingAttachments}
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    e.target.value = '';
                    if (files.length === 0) return;
                    setUploadingAttachments(true);
                    await withFeedback(() => AttachmentsApi.uploadToTask(task.id, files));
                    setUploadingAttachments(false);
                  }}
                />
              </label>
            )}
          </div>

          {/* Creator/Admin-only: whether the assigned User(s) may download
              attachments. They can always preview regardless of this. */}
          {canManageAttachments && (
            <label className="mt-3 flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={task.assigneeCanDownloadAttachments}
                onChange={(e) =>
                  withFeedback(() =>
                    TasksApi.updateAttachmentPermissions(task.id, e.target.checked),
                  )
                }
              />
              Allow assigned User(s) to download attachments
            </label>
          )}

          {(task.attachments || []).length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No files attached.</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(task.attachments || []).map((a) => (
                <AttachmentCard
                  key={a.id}
                  attachment={a}
                  canDelete={task.status !== 'Archived' && canManageAttachments}
                  canDownload={canDownloadAttachments}
                  onPreview={() => setPreviewAttachment(a)}
                  onDelete={() => setAttachmentToDelete(a)}
                />
              ))}
            </div>
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
                <div key={a.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{a.assignee?.fullName || 'Unknown'}</span>
                    <StatusBadge value={a.status} />
                  </div>
                  {a.rejectionReason && a.status === 'Rejected' && (
                    <p className="mt-1 text-xs text-red-600">Reason: {a.rejectionReason}</p>
                  )}

                  {/* Reassign: only the Task creator (or an Admin) can pick someone new after a rejection. */}
                  {a.status === 'Rejected' && (isCreator || isAdmin) && (
                    <div className="mt-2 flex gap-2">
                      <select
                        className="input"
                        value={reassignSelections[a.id] || ''}
                        onChange={(e) =>
                          setReassignSelections((prev) => ({ ...prev, [a.id]: e.target.value }))
                        }
                      >
                        <option value="">Reassign to…</option>
                        {assignableUsers
                          .filter((u) => u.id !== a.assigneeId)
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.fullName}
                            </option>
                          ))}
                      </select>
                      <button
                        className="btn-secondary shrink-0"
                        onClick={() => {
                          const newAssigneeId = reassignSelections[a.id];
                          if (!newAssigneeId) return;
                          withFeedback(async () => {
                            await AssignmentsApi.reassign(a.id, newAssigneeId);
                            setReassignSelections((prev) => ({ ...prev, [a.id]: '' }));
                          });
                        }}
                      >
                        Reassign
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No additional assignments.</p>
          )}

          {/* Accept/Reject: only visible to the User the Assignment was given to. */}
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

          {/* Assign: only the Task creator (or an Admin) can hand this Task to someone. */}
          {/* Hidden when the Task already has a direct assignee or when a rejected assignment is showing its reassign control. */}
          {(isCreator || isAdmin) &&
            !hasRejectedAssignment &&
            !task.assignedToId &&
            !(task.assignments && task.assignments.length > 0) && (
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                <select className="input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                  <option value="">Assign to…</option>
                  {assignableUsers.map((u) => (
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
            )}
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

      {previewAttachment && (
        <AttachmentPreviewModal
          attachment={previewAttachment}
          canDownload={canDownloadAttachments}
          onClose={() => setPreviewAttachment(null)}
        />
      )}

      <ConfirmModal
        open={attachmentToDelete !== null}
        title="Delete attachment?"
        description={
          attachmentToDelete
            ? `"${attachmentToDelete.fileName}" will be permanently deleted. This cannot be undone.`
            : undefined
        }
        confirmLabel={deletingAttachment ? 'Deleting…' : 'Delete'}
        danger
        confirmDisabled={deletingAttachment}
        onCancel={() => {
          if (!deletingAttachment) setAttachmentToDelete(null);
        }}
        onConfirm={confirmDeleteAttachment}
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