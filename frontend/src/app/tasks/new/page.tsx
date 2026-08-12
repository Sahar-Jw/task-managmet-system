'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  AttachmentsApi,
  BranchesApi,
  DepartmentsApi,
  ProjectsApi,
  TasksApi,
  UsersApi,
} from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
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

  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    // Bilingual title & description
    titleAr: '',
    titleEn: '',
    descriptionAr: '',
    descriptionEn: '',
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
    TasksApi.list({ limit: '100' }).then((res) => setTasks(res.items)).catch(() => {});
  }, []);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

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

    setSubmitting(true);
    try {
      const task = await TasksApi.create({
        titleAr: form.titleAr,
        titleEn: form.titleEn,
        descriptionAr: form.descriptionAr || undefined,
        descriptionEn: form.descriptionEn || undefined,
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

      if (file) {
        try {
          await AttachmentsApi.uploadToTask(task.id, file);
        } catch {
          // Task was created; surface the attachment failure but don't block navigation.
          setError('Task created, but the file could not be uploaded. You can attach it from the task page.');
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Title (English)</label>
              <input
                className="input"
                required
                maxLength={255}
                value={form.titleEn}
                onChange={(e) => set('titleEn', e.target.value)}
              />
            </div>
            <div>
              <label className="label">العنوان (Arabic)</label>
              <input
                dir="rtl"
                className="input"
                required
                maxLength={255}
                value={form.titleAr}
                onChange={(e) => set('titleAr', e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Description */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-600">Description</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Description (English)</label>
              <textarea
                className="input"
                rows={3}
                value={form.descriptionEn}
                onChange={(e) => set('descriptionEn', e.target.value)}
              />
            </div>
            <div>
              <label className="label">الوصف (Arabic)</label>
              <textarea
                dir="rtl"
                className="input"
                rows={3}
                value={form.descriptionAr}
                onChange={(e) => set('descriptionAr', e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* File attachment */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-600">Attachment</h2>
          <div>
            <label className="label">File (any kind, optional)</label>
            <input
              type="file"
              className="input"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
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
            <label className="label">For whom is this task (assignee, optional)</label>
            <select
              className="input"
              value={form.assignedToId}
              onChange={(e) => set('assignedToId', e.target.value)}
            >
              <option value="">Unassigned for now</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">The task creator is recorded automatically as you.</p>
          </div>
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
                {users.map((u) => (
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
