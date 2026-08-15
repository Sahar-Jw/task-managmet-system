'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth-context';
import {
  AttachmentsApi,
  BranchesApi,
  DepartmentsApi,
  ProjectsApi,
  TasksApi,
  UsersApi,
} from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import { ATTACHMENT_ACCEPT, formatFileSize, getFileTypeLabel } from '@/lib/file-kind';
import type { Branch, Department, Project, Task, TaskType, User } from '@/lib/types';

const TASK_TYPES: TaskType[] = [
  'General',
  'Administrative',
  'Financial',
  'Technical',
  'Maintenance',
  'HR',
  'Procurement',
  'Other',
];

const COLORS = [
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Green', value: '#22C55E' },
  { label: 'Amber', value: '#F59E0B' },
  { label: 'Red', value: '#EF4444' },
  { label: 'Purple', value: '#8B5CF6' },
  { label: 'Slate', value: '#64748B' },
];

function NewTaskContent() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role.name === 'ADMIN';

  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  // Appends newly picked/dropped files, skipping ones already selected
  // (same name + size) so re-browsing the same folder doesn't duplicate rows.
  function addFiles(incoming: FileList | File[]) {
    const incomingArr = Array.from(incoming);
    setFiles((prev) => {
      const isDuplicate = (f: File) =>
        prev.some((p) => p.name === f.name && p.size === f.size);
      return [...prev, ...incomingArr.filter((f) => !isDuplicate(f))];
    });
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  const [form, setForm] = useState({
    title: '',
    description: '',
    // Classification
    taskType: 'General',
    priority: 'Medium',
    color: COLORS[0].value,
    // Organizational placement — each independent (Branch/Department/
    // Project have no relation to one another; only the Task ties them
    // together)
    branchId: '',
    departmentId: '',
    projectId: '',
    parentTaskId: '',
    // People
    assignedToId: '',
    // Approval
    needsApproval: false,
    approverId: '',
    // Money range
    needsBudget: false,
    budgetMin: '',
    budgetMax: '',
    budgetCurrency: 'SAR',
    // Dates
    startDate: '',
    deadlineDate: '',
  });

  useEffect(() => {
    BranchesApi.list().then(setBranches).catch(() => {});
    DepartmentsApi.list().then(setDepartments).catch(() => {});
    ProjectsApi.list({ limit: '100' }).then((res) => setProjects(res.items)).catch(() => {});
    UsersApi.list({ limit: '200', isActive: 'true' }).then((res) => setUsers(res.items)).catch(() => {});
    // Admin can pick any task as the parent; a regular User can only pick
    // from their own tasks (GET /tasks is Admin-only).
    const fetchTasks = isAdmin ? TasksApi.list({ limit: '100' }) : TasksApi.mine({ limit: '100' });
    fetchTasks.then((res) => setTasks(res.items)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Admins are never a valid assignee — a Task is always assigned to a
  // regular User, never to another Admin.
  const assignableUsers = users.filter((u) => u.role.name !== 'ADMIN');
  const approvers = users.length > 0 ? users : user ? [user] : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (form.needsApproval && !form.approverId) {
      setError('Please choose who needs to approve this task.');
      return;
    }
    if (form.needsBudget && form.budgetMin && form.budgetMax && Number(form.budgetMin) > Number(form.budgetMax)) {
      setError('The money range minimum cannot exceed the maximum.');
      return;
    }
    if (form.needsBudget && (!form.budgetMin || !form.budgetMax)) {
      setError('Enter both minimum and maximum amounts when this task needs a budget.');
      return;
    }

    setSubmitting(true);
    try {
      const task = await TasksApi.create({
        // The database retains bilingual columns, so this single form value
        // is stored in both until localized content is introduced again.
        titleAr: form.title,
        titleEn: form.title,
        descriptionAr: form.description || undefined,
        descriptionEn: form.description || undefined,
        taskType: form.taskType,
        priority: form.priority,
        color: form.color,
        branchId: form.branchId || undefined,
        departmentId: form.departmentId,
        projectId: form.projectId || undefined,
        parentTaskId: form.parentTaskId || undefined,
        assignedToId: form.assignedToId || undefined,
        needsApproval: form.needsApproval,
        approverId: form.needsApproval ? form.approverId : undefined,
        needsBudget: form.needsBudget,
        budgetMin: form.needsBudget ? form.budgetMin || undefined : undefined,
        budgetMax: form.needsBudget ? form.budgetMax || undefined : undefined,
        budgetCurrency: form.needsBudget ? form.budgetCurrency : undefined,
        startDate: form.startDate || undefined,
        deadlineDate: form.deadlineDate || undefined,
      });

      if (files.length > 0) {
        try {
          await AttachmentsApi.uploadToTask(task.id, files);
        } catch {
          // Task was created; surface the attachment failure but don't block navigation.
          setError('Task created, but the file(s) could not be uploaded. You can attach them from the task page.');
        }
      }

      router.push(`/tasks/${task.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the task.');
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <h1 className="text-xl font-semibold text-slate-800">New task</h1>

      <form onSubmit={handleSubmit} className="card mt-4 space-y-6 p-6">
        {/* Title */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-600">Title</h2>
          <div className="w-full">
            <div>
              <input
                className="input"
                required
                maxLength={255}
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
              />
            </div>
           
          </div>
        </section>

        {/* Description */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-600">Description</h2>
          <div className="w-full">
            <div>
              <textarea
                className="input"
                rows={3}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>
           
          </div>
        </section>

        {/* File attachment */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-600">Attachment</h2>
          <div>
            <label className="label">Files (any kind, optional — you can select more than one)</label>

            <label
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
                dragOver
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-slate-300 bg-slate-50 hover:border-brand-400 hover:bg-slate-100'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
              }}
            >
              <svg
                className="h-8 w-8 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 8.25 12 3.75m0 0L7.5 8.25M12 3.75v13.5"
                />
              </svg>
              <span className="text-sm font-medium text-slate-600">
                <span className="text-brand-600">Click to browse</span> or drag files here
              </span>
              <span className="text-xs text-slate-400">Images, PDF, Word, Excel, PowerPoint, txt, csv, zip</span>
              <input
                type="file"
                multiple
                accept={ATTACHMENT_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>

            {files.length > 0 && (
              <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {files.map((f, i) => (
                  <div key={`${f.name}-${f.size}-${i}`} className="flex items-center gap-3 px-3 py-2">
                    <span className="badge shrink-0 bg-slate-100 text-slate-600">
                      {getFileTypeLabel(f.type, f.name)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700" title={f.name}>
                      {f.name}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">{formatFileSize(f.size)}</span>
                    <button
                      type="button"
                      className="icon-btn-danger shrink-0"
                      onClick={() => removeFile(i)}
                      aria-label={`Remove ${f.name}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Classification */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-600">Classification</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Task type</label>
              <select className="input" value={form.taskType} onChange={(e) => set('taskType', e.target.value)}>
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Level of importance</label>
              <select className="input" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                {['Low', 'Medium', 'High', 'Critical'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Color</label>
              <select className="input" value={form.color} onChange={(e) => set('color', e.target.value)}>
                {COLORS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Organizational placement */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-600">
            Branch / Department / Project
            <span className="ml-2 font-normal text-slate-400">(each independent — pick any combination)</span>
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Branch (optional)</label>
              <select className="input" value={form.branchId} onChange={(e) => set('branchId', e.target.value)}>
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
                required
                value={form.departmentId}
                onChange={(e) => set('departmentId', e.target.value)}
              >
                <option value="" disabled>Select…</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.valueEn} ({d.codeEn})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Project (optional)</label>
              <select className="input" value={form.projectId} onChange={(e) => set('projectId', e.target.value)}>
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* People */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-600">People &amp; hierarchy</h2>
          
          <div>
            <label className="label">Father task (optional — makes this a sub-task/step)</label>
            <select
              className="input"
              value={form.parentTaskId}
              onChange={(e) => set('parentTaskId', e.target.value)}
            >
              <option value="">None — this is a standalone task</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>{t.titleEn}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Approval */}
        <section className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.needsApproval}
              onChange={(e) => set('needsApproval', e.target.checked)}
            />
            <span className="text-sm font-semibold text-slate-600">This task needs approval</span>
          </label>
          {form.needsApproval && (
            <div>
              <label className="label">Who needs to approve it</label>
              <select
                className="input"
                required
                value={form.approverId}
                onChange={(e) => set('approverId', e.target.value)}
              >
                <option value="" disabled>Select an approver…</option>
                {approvers.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                ))}
              </select>
            </div>
          )}
        </section>

        {/* Money range */}
        <section className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.needsBudget}
              onChange={(e) => set('needsBudget', e.target.checked)}
            />
            <span className="text-sm font-semibold text-slate-600">This task needs a money range / budget</span>
          </label>
          {form.needsBudget && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="label">Minimum</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  className="input"
                  value={form.budgetMin}
                  onChange={(e) => set('budgetMin', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Maximum</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  className="input"
                  value={form.budgetMax}
                  onChange={(e) => set('budgetMax', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Currency</label>
                <input
                  className="input"
                  maxLength={10}
                  value={form.budgetCurrency}
                  onChange={(e) => set('budgetCurrency', e.target.value)}
                />
              </div>
            </div>
          )}
        </section>

        {/* Dates */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-600">Dates</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Start date (optional)</label>
              <input
                type="date"
                className="input"
                value={form.startDate}
                onChange={(e) => set('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Deadline (optional)</label>
              <input
                type="date"
                className="input"
                value={form.deadlineDate}
                onChange={(e) => set('deadlineDate', e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-slate-400">
            &ldquo;When it really ends&rdquo; is recorded automatically once the task is marked Completed.
          </p>
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={() => router.back()}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create task'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewTaskPage() {
  return (
    <ProtectedRoute>
      <NewTaskContent />
    </ProtectedRoute>
  );
}
