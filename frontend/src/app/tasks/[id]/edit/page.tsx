'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import ProtectedRoute from '@/components/ProtectedRoute';
import InlineLoader from '@/components/InlineLoader';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import {
  BranchesApi,
  DepartmentsApi,
  ProjectsApi,
  SettingsApi,
  TasksApi,
} from '@/lib/endpoints';
import { canEditTask } from '@/lib/task-permissions';
import type { Project, Setting, Task } from '@/lib/types';

type EditForm = {
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  taskType: string;
  priority: string;
  color: string;
  branchId: string;
  departmentId: string;
  projectId: string;
  startDate: string;
  deadlineDate: string;
  needsBudget: boolean;
  budgetMin: string;
  budgetMax: string;
  budgetCurrency: string;
};

const emptyForm: EditForm = {
  titleAr: '',
  titleEn: '',
  descriptionAr: '',
  descriptionEn: '',
  taskType: 'General',
  priority: 'Medium',
  color: '',
  branchId: '',
  departmentId: '',
  projectId: '',
  startDate: '',
  deadlineDate: '',
  needsBudget: false,
  budgetMin: '',
  budgetMax: '',
  budgetCurrency: 'USD',
};

function settingLabel(setting: Setting, isArabic: boolean) {
  return isArabic
    ? setting.valueAr || setting.codeAr || setting.valueEn || setting.codeEn
    : setting.valueEn || setting.codeEn || setting.valueAr || setting.codeAr;
}

function EditTaskContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [form, setForm] = useState<EditForm>(emptyForm);
  const [branches, setBranches] = useState<Setting[]>([]);
  const [departments, setDepartments] = useState<Setting[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskTypes, setTaskTypes] = useState<Setting[]>([]);
  const [priorities, setPriorities] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [loadedTask, loadedBranches, loadedDepartments, loadedProjects, loadedTypes, loadedPriorities] =
          await Promise.all([
            TasksApi.get(params.id),
            BranchesApi.list(),
            DepartmentsApi.list(),
            ProjectsApi.list({ limit: '100' }),
            SettingsApi.list('task_type', true),
            SettingsApi.list('task_priority', true),
          ]);

        if (cancelled) return;
        setTask(loadedTask);
        setBranches(loadedBranches.filter((item) => item.isActive || item.id === loadedTask.branchId));
        setDepartments(loadedDepartments.filter((item) => item.isActive || item.id === loadedTask.departmentId));
        setProjects(loadedProjects.items);
        setTaskTypes(loadedTypes);
        setPriorities(loadedPriorities);
        setForm({
          titleAr: loadedTask.titleAr || '',
          titleEn: loadedTask.titleEn || '',
          descriptionAr: loadedTask.descriptionAr || '',
          descriptionEn: loadedTask.descriptionEn || '',
          taskType: loadedTask.taskType || 'General',
          priority: loadedTask.priority || 'Medium',
          color: loadedTask.color || '',
          branchId: loadedTask.branchId || '',
          departmentId: loadedTask.departmentId || '',
          projectId: loadedTask.projectId || '',
          startDate: loadedTask.startDate || '',
          deadlineDate: loadedTask.deadlineDate || '',
          needsBudget: loadedTask.needsBudget,
          budgetMin: loadedTask.budgetMin || '',
          budgetMax: loadedTask.budgetMax || '',
          budgetCurrency: loadedTask.budgetCurrency || 'USD',
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof ApiError ? loadError.message : isArabic ? 'تعذّر تحميل المهمة.' : 'Could not load the task.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [params.id, isArabic]);

  const allowed = useMemo(() => task && canEditTask(task, user), [task, user]);

  function update<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!task || !allowed || saving) return;

    if (form.startDate && form.deadlineDate && form.deadlineDate < form.startDate) {
      setError(isArabic ? 'يجب أن يكون الموعد النهائي بعد تاريخ البدء.' : 'Deadline must be on or after the start date.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await TasksApi.update(task.id, {
        titleAr: form.titleAr.trim(),
        titleEn: form.titleEn.trim(),
        descriptionAr: form.descriptionAr.trim() || null,
        descriptionEn: form.descriptionEn.trim() || null,
        taskType: form.taskType,
        priority: form.priority,
        color: form.color || null,
        branchId: form.branchId || null,
        departmentId: form.departmentId || null,
        projectId: form.projectId || null,
        startDate: form.startDate || null,
        deadlineDate: form.deadlineDate || null,
        needsBudget: form.needsBudget,
        budgetMin: form.needsBudget && form.budgetMin ? form.budgetMin : null,
        budgetMax: form.needsBudget && form.budgetMax ? form.budgetMax : null,
        budgetCurrency: form.needsBudget && form.budgetCurrency ? form.budgetCurrency : null,
      });
      router.push(`/tasks/${task.id}`);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.message : isArabic ? 'تعذّر حفظ التغييرات.' : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <InlineLoader className="min-h-[50vh]" />;

  if (!task || error && !task) {
    return <div className="card p-6 text-sm text-red-600">{error || (isArabic ? 'المهمة غير موجودة.' : 'Task not found.')}</div>;
  }

  if (!allowed) {
    return (
      <div className="card mx-auto max-w-xl p-6 text-center">
        <h1 className="text-lg font-semibold text-slate-900">{isArabic ? 'لا يمكنك تعديل هذه المهمة' : 'You cannot edit this task'}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {isArabic ? 'يمكن للمسؤول تعديل أي مهمة، ويمكن للمستخدم تعديل المهام التي أنشأها فقط.' : 'Admins can edit any task. Users can edit only tasks they created.'}
        </p>
        <button className="btn-secondary mt-5" onClick={() => router.push(`/tasks/${task.id}`)}>
          {isArabic ? 'العودة إلى المهمة' : 'Back to task'}
        </button>
      </div>
    );
  }

  const field = 'space-y-1.5';
  const label = 'label';

  return (
    <form onSubmit={submit} className="mx-auto max-w-5xl space-y-6 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">{isArabic ? 'تعديل المهمة' : 'Edit task'}</h1>
          <p className="mt-1 text-sm text-slate-500">{isArabic ? 'حدّث معلومات المهمة ثم احفظ التغييرات.' : 'Update the task information and save your changes.'}</p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => router.push(`/tasks/${task.id}`)}>
          {isArabic ? 'إلغاء' : 'Cancel'}
        </button>
      </div>

      <section className="card space-y-5 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={field}>
            <label className={label}>Title (English)</label>
            <input required maxLength={255} className="input" value={form.titleEn} onChange={(e) => update('titleEn', e.target.value)} />
          </div>
          <div className={field}>
            <label className={label}>العنوان (العربية)</label>
            <input required dir="rtl" maxLength={255} className="input" value={form.titleAr} onChange={(e) => update('titleAr', e.target.value)} />
          </div>
          <div className={field}>
            <label className={label}>Description (English)</label>
            <textarea rows={4} className="input" value={form.descriptionEn} onChange={(e) => update('descriptionEn', e.target.value)} />
          </div>
          <div className={field}>
            <label className={label}>الوصف (العربية)</label>
            <textarea dir="rtl" rows={4} className="input" value={form.descriptionAr} onChange={(e) => update('descriptionAr', e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className={field}>
            <label className={label}>{isArabic ? 'نوع المهمة' : 'Task type'}</label>
            <select className="input" value={form.taskType} onChange={(e) => update('taskType', e.target.value)}>
              {!taskTypes.some((item) => item.key === form.taskType) && <option value={form.taskType}>{form.taskType}</option>}
              {taskTypes.filter((item) => item.key).map((item) => <option key={item.id} value={item.key}>{settingLabel(item, isArabic)}</option>)}
            </select>
          </div>
          <div className={field}>
            <label className={label}>{isArabic ? 'الأهمية' : 'Priority'}</label>
            <select className="input" value={form.priority} onChange={(e) => update('priority', e.target.value)}>
              {!priorities.some((item) => item.key === form.priority) && <option value={form.priority}>{form.priority}</option>}
              {priorities.filter((item) => item.key).map((item) => <option key={item.id} value={item.key}>{settingLabel(item, isArabic)}</option>)}
            </select>
          </div>
          <div className={field}>
            <label className={label}>{isArabic ? 'تاريخ البدء' : 'Start date'}</label>
            <input type="date" className="input" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} />
          </div>
          <div className={field}>
            <label className={label}>{isArabic ? 'الموعد النهائي' : 'Deadline'}</label>
            <input type="date" min={form.startDate || undefined} className="input" value={form.deadlineDate} onChange={(e) => update('deadlineDate', e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className={field}>
            <label className={label}>{isArabic ? 'الفرع' : 'Branch'}</label>
            <select className="input" value={form.branchId} onChange={(e) => update('branchId', e.target.value)}>
              <option value="">{isArabic ? 'بدون فرع' : 'No branch'}</option>
              {branches.map((item) => <option key={item.id} value={item.id}>{settingLabel(item, isArabic)}</option>)}
            </select>
          </div>
          <div className={field}>
            <label className={label}>{isArabic ? 'القسم' : 'Department'}</label>
            <select className="input" value={form.departmentId} onChange={(e) => update('departmentId', e.target.value)}>
              <option value="">{isArabic ? 'بدون قسم' : 'No department'}</option>
              {departments.map((item) => <option key={item.id} value={item.id}>{settingLabel(item, isArabic)}</option>)}
            </select>
          </div>
          <div className={field}>
            <label className={label}>{isArabic ? 'المشروع' : 'Project'}</label>
            <select className="input" value={form.projectId} onChange={(e) => update('projectId', e.target.value)}>
              <option value="">{isArabic ? 'بدون مشروع' : 'No project'}</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </div>
          <div className={field}>
            <label className={label}>{isArabic ? 'لون المهمة' : 'Task color'}</label>
            <input type="color" className="input h-11 p-1" value={form.color || '#2563eb'} onChange={(e) => update('color', e.target.value)} />
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-5 sm:p-6">
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={form.needsBudget} onChange={(e) => update('needsBudget', e.target.checked)} />
          {isArabic ? 'تتطلب المهمة ميزانية' : 'This task requires a budget'}
        </label>
        {form.needsBudget && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className={field}><label className={label}>{isArabic ? 'الحد الأدنى' : 'Minimum'}</label><input inputMode="decimal" className="input" value={form.budgetMin} onChange={(e) => update('budgetMin', e.target.value)} /></div>
            <div className={field}><label className={label}>{isArabic ? 'الحد الأعلى' : 'Maximum'}</label><input inputMode="decimal" className="input" value={form.budgetMax} onChange={(e) => update('budgetMax', e.target.value)} /></div>
            <div className={field}><label className={label}>{isArabic ? 'العملة' : 'Currency'}</label><input maxLength={10} className="input" value={form.budgetCurrency} onChange={(e) => update('budgetCurrency', e.target.value.toUpperCase())} /></div>
          </div>
        )}
      </section>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="flex justify-end gap-3">
        <button type="button" className="btn-secondary" disabled={saving} onClick={() => router.push(`/tasks/${task.id}`)}>{isArabic ? 'إلغاء' : 'Cancel'}</button>
        <button type="submit" className="btn-primary" disabled={saving || !form.titleAr.trim() || !form.titleEn.trim()}>{saving ? (isArabic ? 'جارٍ الحفظ…' : 'Saving…') : (isArabic ? 'حفظ التغييرات' : 'Save changes')}</button>
      </div>
    </form>
  );
}

export default function EditTaskPage() {
  return (
    <ProtectedRoute>
      <EditTaskContent />
    </ProtectedRoute>
  );
}
