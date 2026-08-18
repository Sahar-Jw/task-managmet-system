'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { ApiError } from '@/lib/api';
import {
  BranchesApi,
  DepartmentsApi,
  ProjectsApi,
  SettingsApi,
  TasksApi,
  UsersApi,
} from '@/lib/endpoints';
import type { Project, Setting, Task, User } from '@/lib/types';

type FormState = {
  title: string;
  description: string;
  taskType: string;
  priority: string;
  color: string;
  branchId: string;
  departmentId: string;
  projectId: string;
  parentTaskId: string;
  startDate: string;
  deadlineDate: string;
  needsApproval: boolean;
  approverId: string;
  needsBudget: boolean;
  budgetMin: string;
  budgetMax: string;
  budgetCurrency: string;
  assigneeCanDownloadAttachments: boolean;
};

function fromTask(task: Task): FormState {
  return {
    title: task.title || '',
    description: task.description || '',
    taskType: task.taskType || 'General',
    priority: task.priority || 'Medium',
    color: task.color || '#2563eb',
    branchId: task.branchId || '',
    departmentId: task.departmentId || '',
    projectId: task.projectId || '',
    parentTaskId: task.parentTaskId || '',
    startDate: task.startDate || '',
    deadlineDate: task.deadlineDate || '',
    needsApproval: task.needsApproval,
    approverId: task.approverId || '',
    needsBudget: task.needsBudget,
    budgetMin: task.budgetMin || '',
    budgetMax: task.budgetMax || '',
    budgetCurrency: task.budgetCurrency || 'SAR',
    assigneeCanDownloadAttachments: task.assigneeCanDownloadAttachments,
  };
}

function Switch({ checked, label, onChange }: { checked: boolean; label: string; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition focus:outline-none focus:ring-2 focus:ring-brand-200 ${checked ? 'bg-brand-600' : 'bg-slate-200'}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${checked ? 'end-1' : 'start-1'}`} />
    </button>
  );
}

export default function TaskEditPanel({
  task,
  user,
  onCancel,
  onSaved,
}: {
  task: Task;
  user: User;
  onCancel: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const isAdmin = user.role.name === 'ADMIN';
  const [form, setForm] = useState<FormState>(() => fromTask(task));
  const [branches, setBranches] = useState<Setting[]>([]);
  const [departments, setDepartments] = useState<Setting[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskTypes, setTaskTypes] = useState<Setting[]>([]);
  const [priorities, setPriorities] = useState<Setting[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setForm(fromTask(task)), [task]);

  useEffect(() => {
    let cancelled = false;
    const taskRequest = isAdmin
      ? TasksApi.list({ limit: '100', excludeArchived: 'true' })
      : TasksApi.mine({ limit: '100' });

    Promise.all([
      BranchesApi.list(),
      DepartmentsApi.list(),
      ProjectsApi.list({ limit: '100', excludeArchived: 'true' }),
      SettingsApi.list('task_type', true),
      SettingsApi.list('task_priority', true),
      UsersApi.list({ limit: '100' }),
      taskRequest,
    ])
      .then(([branchItems, departmentItems, projectResult, typeItems, priorityItems, userResult, taskResult]) => {
        if (cancelled) return;
        setBranches(branchItems.filter((item) => item.isActive || item.id === task.branchId));
        setDepartments(departmentItems.filter((item) => item.isActive || item.id === task.departmentId));
        setProjects(projectResult.items);
        setTaskTypes(typeItems);
        setPriorities(priorityItems);
        setUsers(userResult.items.filter((item) => item.isActive));
        setTasks(taskResult.items);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof ApiError ? loadError.message : isArabic ? 'تعذّر تحميل خيارات التعديل.' : 'Could not load editing options.');
      })
      .finally(() => {
        if (!cancelled) setLoadingLookups(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, isArabic, task.branchId, task.departmentId]);

  const currentAssigneeId = task.assignments?.find((item) => ['PendingAcceptance', 'Accepted'].includes(item.status))?.assigneeId;
  const approvers = users.filter((item) => item.id !== currentAssigneeId);
  const parentTasks = useMemo(
    () => tasks.filter((item) => item.id !== task.id && !item.parentTaskId && !['Completed', 'Finished', 'Archived'].includes(item.status)),
    [task.id, tasks],
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function settingLabel(item: Setting) {
    return isArabic
      ? item.valueAr || item.codeAr || item.valueEn || item.codeEn
      : item.valueEn || item.codeEn || item.valueAr || item.codeAr;
  }

  function changeParent(parentTaskId: string) {
    const parent = parentTasks.find((item) => item.id === parentTaskId);
    if (!parent) {
      set('parentTaskId', parentTaskId);
      return;
    }
    setForm((current) => ({
      ...current,
      parentTaskId,
      branchId: parent.branchId || '',
      departmentId: parent.departmentId || current.departmentId,
      projectId: parent.projectId || '',
      startDate: parent.startDate || current.startDate,
      deadlineDate: parent.deadlineDate || current.deadlineDate,
    }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    if (!form.title.trim() || !form.taskType || !form.priority || !form.departmentId) {
      setError(isArabic ? 'أكمل جميع الحقول المطلوبة.' : 'Complete all required fields.');
      return;
    }
    if (form.startDate && form.deadlineDate && form.deadlineDate < form.startDate) {
      setError(isArabic ? 'يجب أن يكون الموعد النهائي بعد تاريخ البدء.' : 'Deadline must be on or after the start date.');
      return;
    }
    if (form.needsApproval && !form.approverId) {
      setError(isArabic ? 'اختر الشخص المسؤول عن الموافقة.' : 'Choose an approver.');
      return;
    }
    if (form.needsBudget && (!form.budgetMin || !form.budgetMax)) {
      setError(isArabic ? 'أدخل الحد الأدنى والأعلى للميزانية.' : 'Enter both minimum and maximum budget.');
      return;
    }
    if (form.needsBudget && Number(form.budgetMin) > Number(form.budgetMax)) {
      setError(isArabic ? 'الحد الأدنى للميزانية لا يمكن أن يتجاوز الحد الأعلى.' : 'Minimum budget cannot exceed maximum budget.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await TasksApi.update(task.id, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        taskType: form.taskType,
        priority: form.priority,
        color: form.color || null,
        branchId: form.branchId || null,
        departmentId: form.departmentId,
        projectId: form.projectId || null,
        parentTaskId: form.parentTaskId || null,
        needsApproval: form.needsApproval,
        approverId: form.needsApproval ? form.approverId : null,
        needsBudget: form.needsBudget,
        budgetMin: form.needsBudget ? form.budgetMin : null,
        budgetMax: form.needsBudget ? form.budgetMax : null,
        budgetCurrency: form.needsBudget ? form.budgetCurrency || 'SAR' : null,
        startDate: form.startDate || null,
        deadlineDate: form.deadlineDate || null,
      });

      if (form.assigneeCanDownloadAttachments !== task.assigneeCanDownloadAttachments) {
        await TasksApi.updateAttachmentPermissions(task.id, form.assigneeCanDownloadAttachments);
      }
      await onSaved();
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.message : isArabic ? 'تعذّر حفظ التغييرات.' : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  const field = 'space-y-1.5';
  const section = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-6';

  return (
    <form id="task-edit-panel" onSubmit={submit} className="mt-6 space-y-5" dir={isArabic ? 'rtl' : 'ltr'}>
      <section className={section}>
        <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{isArabic ? 'تعديل المهمة' : 'Edit task'}</h2>
            <p className="mt-1 text-sm text-slate-500">{isArabic ? 'يمكنك تعديل جميع معلومات المهمة وتفعيل الميزانية أو الموافقة.' : 'Edit all task information and enable budget or approval when needed.'}</p>
          </div>
          <button type="button" className="btn-secondary" disabled={saving} onClick={onCancel}>{isArabic ? 'إلغاء' : 'Cancel'}</button>
        </div>

        <div className="grid gap-4">
          <div className={field}><label className="label">{isArabic ? 'العنوان *' : 'Title *'}</label><input required maxLength={255} className="input" dir={isArabic ? 'rtl' : 'ltr'} value={form.title} onChange={(e) => set('title', e.target.value)} /></div>
          <div className={field}><label className="label">{isArabic ? 'الوصف' : 'Description'}</label><textarea rows={5} className="input" dir={isArabic ? 'rtl' : 'ltr'} value={form.description} onChange={(e) => set('description', e.target.value)} /></div>
        </div>
      </section>

      <section className={section}>
        <h3 className="mb-4 text-sm font-semibold text-slate-900">{isArabic ? 'التصنيف والتنظيم' : 'Classification and organization'}</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className={field}><label className="label">{isArabic ? 'نوع المهمة *' : 'Task type *'}</label><select required className="input" value={form.taskType} onChange={(e) => set('taskType', e.target.value)}>{!taskTypes.some((item) => item.key === form.taskType) && <option value={form.taskType}>{form.taskType}</option>}{taskTypes.filter((item) => item.key).map((item) => <option key={item.id} value={item.key}>{settingLabel(item)}</option>)}</select></div>
          <div className={field}><label className="label">{isArabic ? 'الأهمية *' : 'Priority *'}</label><select required className="input" value={form.priority} onChange={(e) => set('priority', e.target.value)}>{!priorities.some((item) => item.key === form.priority) && <option value={form.priority}>{form.priority}</option>}{priorities.filter((item) => item.key).map((item) => <option key={item.id} value={item.key}>{settingLabel(item)}</option>)}</select></div>
          <div className={field}><label className="label">{isArabic ? 'لون المهمة' : 'Task color'}</label><input type="color" className="input h-11 p-1" value={form.color} onChange={(e) => set('color', e.target.value)} /></div>
          <div className={field}><label className="label">{isArabic ? 'الفرع' : 'Branch'}</label><select className="input" value={form.branchId} onChange={(e) => set('branchId', e.target.value)}><option value="">{isArabic ? 'بدون فرع' : 'No branch'}</option>{branches.map((item) => <option key={item.id} value={item.id}>{settingLabel(item)}</option>)}</select></div>
          <div className={field}><label className="label">{isArabic ? 'القسم *' : 'Department *'}</label><select required className="input" value={form.departmentId} onChange={(e) => set('departmentId', e.target.value)}><option value="">{isArabic ? 'اختر القسم' : 'Choose department'}</option>{departments.map((item) => <option key={item.id} value={item.id}>{settingLabel(item)}</option>)}</select></div>
          <div className={field}><label className="label">{isArabic ? 'المشروع' : 'Project'}</label><select className="input" value={form.projectId} onChange={(e) => set('projectId', e.target.value)}><option value="">{isArabic ? 'بدون مشروع' : 'No project'}</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
          <div className={field}><label className="label">{isArabic ? 'المهمة الرئيسية' : 'Parent task'}</label><select className="input" value={form.parentTaskId} onChange={(e) => changeParent(e.target.value)}><option value="">{isArabic ? 'بدون مهمة رئيسية' : 'No parent task'}</option>{parentTasks.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
          <div className={field}><label className="label">{isArabic ? 'تاريخ البدء' : 'Start date'}</label><input type="date" className="input" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} /></div>
          <div className={field}><label className="label">{isArabic ? 'الموعد النهائي' : 'Deadline'}</label><input type="date" min={form.startDate || undefined} className="input" value={form.deadlineDate} onChange={(e) => set('deadlineDate', e.target.value)} /></div>
        </div>
        {loadingLookups && <p className="mt-3 text-xs text-slate-400">{isArabic ? 'جارٍ تحميل الخيارات…' : 'Loading options…'}</p>}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={`${section} overflow-hidden`}>
          <div className="flex items-start justify-between gap-4">
            <div><h3 className="text-sm font-semibold text-slate-900">{isArabic ? 'تتطلب موافقة' : 'Requires approval'}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{isArabic ? 'فعّل هذا الخيار وحدد الشخص المسؤول عن الموافقة.' : 'Enable this and choose the person responsible for approval.'}</p></div>
            <Switch checked={form.needsApproval} label={isArabic ? 'تفعيل الموافقة' : 'Enable approval'} onChange={(value) => setForm((current) => ({ ...current, needsApproval: value, approverId: value ? current.approverId : '' }))} />
          </div>
          {form.needsApproval && <div className="mt-4 border-t border-slate-100 pt-4"><label className="label">{isArabic ? 'الموافق *' : 'Approver *'}</label><select required className="input" value={form.approverId} onChange={(e) => set('approverId', e.target.value)}><option value="">{isArabic ? 'اختر الموافق' : 'Choose approver'}</option>{approvers.map((item) => <option key={item.id} value={item.id}>{item.fullName}{item.role.name === 'ADMIN' ? ' — Admin' : ''}</option>)}</select></div>}
        </section>

        <section className={`${section} overflow-hidden`}>
          <div className="flex items-start justify-between gap-4">
            <div><h3 className="text-sm font-semibold text-slate-900">{isArabic ? 'الميزانية' : 'Budget'}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{isArabic ? 'فعّل هذا الخيار لإضافة ميزانية للمهمة.' : 'Enable this option to add a task budget.'}</p></div>
            <Switch checked={form.needsBudget} label={isArabic ? 'تفعيل الميزانية' : 'Enable budget'} onChange={(value) => setForm((current) => ({ ...current, needsBudget: value, budgetMin: value ? current.budgetMin : '', budgetMax: value ? current.budgetMax : '', budgetCurrency: value ? current.budgetCurrency || 'SAR' : 'SAR' }))} />
          </div>
          {form.needsBudget && <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3"><div><label className="label">{isArabic ? 'الحد الأدنى *' : 'Minimum *'}</label><input required type="number" min="0" step="0.01" className="input" value={form.budgetMin} onChange={(e) => set('budgetMin', e.target.value)} /></div><div><label className="label">{isArabic ? 'الحد الأعلى *' : 'Maximum *'}</label><input required type="number" min="0" step="0.01" className="input" value={form.budgetMax} onChange={(e) => set('budgetMax', e.target.value)} /></div><div><label className="label">{isArabic ? 'العملة' : 'Currency'}</label><select className="input" value={form.budgetCurrency} onChange={(e) => set('budgetCurrency', e.target.value)}><option>SAR</option><option>USD</option><option>EUR</option><option>AED</option></select></div></div>}
        </section>
      </div>

      <section className={section}>
        <div className="flex items-start justify-between gap-4">
          <div><h3 className="text-sm font-semibold text-slate-900">{isArabic ? 'تنزيل المرفقات' : 'Attachment downloads'}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{isArabic ? 'السماح للمستخدم المعيّن بتنزيل مرفقات المهمة. تبقى المعاينة متاحة دائماً.' : 'Allow the assigned user to download task attachments. Preview remains available.'}</p></div>
          <Switch checked={form.assigneeCanDownloadAttachments} label={isArabic ? 'السماح بتنزيل المرفقات' : 'Allow attachment downloads'} onChange={(value) => set('assigneeCanDownloadAttachments', value)} />
        </div>
      </section>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="sticky bottom-3 z-20 flex flex-col-reverse gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:justify-end">
        <button type="button" className="btn-secondary" disabled={saving} onClick={onCancel}>{isArabic ? 'إلغاء' : 'Cancel'}</button>
        <button type="submit" className="btn-primary" disabled={saving || loadingLookups}>{saving ? (isArabic ? 'جارٍ الحفظ…' : 'Saving…') : (isArabic ? 'حفظ التغييرات' : 'Save changes')}</button>
      </div>
    </form>
  );
}
