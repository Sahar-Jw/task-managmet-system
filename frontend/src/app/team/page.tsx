'use client';

import {
  useEffect,
  useState,
} from 'react';

import { useLocale } from 'next-intl';

import ProtectedRoute from '@/components/ProtectedRoute';
import InlineLoader from '@/components/InlineLoader';
import { ApiError } from '@/lib/api';
import { TeamsApi } from '@/lib/endpoints';
import type { Team } from '@/lib/types';
import { isValidPhone } from '@/lib/validation';
import PasswordInput from '@/components/PasswordInput';


function t(isArabic: boolean, en: string, ar: string) {
  return isArabic ? ar : en;
}


function TeamContent() {
  const locale = useLocale();
  const isArabic = locale === 'ar';

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const [employeeForm, setEmployeeForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
  });
  const [employeeError, setEmployeeError] = useState('');
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [addedMessage, setAddedMessage] = useState('');


  async function load() {
    setLoading(true);
    setError('');

    try {
      const data = await TeamsApi.my();
      setTeam(data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : t(isArabic, 'Could not load your team.', 'تعذر تحميل فريقك.'),
      );
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  async function copyInviteLink() {
    if (!team?.inviteLink) return;

    try {
      await navigator.clipboard.writeText(team.inviteLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail (permissions, non-secure context); the
      // link is still visible in the input for manual copy.
    }
  }


  async function regenerateLink() {
    setRegenerating(true);
    setError('');

    try {
      const result = await TeamsApi.regenerateInviteLink();

      setTeam((prev) =>
        prev
          ? { ...prev, inviteToken: result.inviteToken, inviteLink: result.inviteLink }
          : prev,
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : t(isArabic, 'Could not regenerate the invite link.', 'تعذر تجديد رابط الدعوة.'),
      );
    } finally {
      setRegenerating(false);
    }
  }


  async function addEmployee(event: React.FormEvent) {
    event.preventDefault();
    setEmployeeError('');
    setAddedMessage('');

    if (employeeForm.phone && !isValidPhone(employeeForm.phone)) {
      setEmployeeError(
        t(isArabic, 'Please enter a valid phone number.', 'يرجى إدخال رقم هاتف صالح.'),
      );
      return;
    }

    setAddingEmployee(true);

    try {
      await TeamsApi.addEmployee({
        fullName: employeeForm.fullName.trim(),
        email: employeeForm.email.trim(),
        password: employeeForm.password,
        phone: employeeForm.phone || undefined,
      });

      setEmployeeForm({ fullName: '', email: '', password: '', phone: '' });
      setAddedMessage(
        t(isArabic, 'Employee added to your team.', 'تمت إضافة الموظف إلى فريقك.'),
      );
      await load();
    } catch (err) {
      setEmployeeError(
        err instanceof ApiError
          ? err.message
          : t(isArabic, 'Could not add this employee.', 'تعذرت إضافة هذا الموظف.'),
      );
    } finally {
      setAddingEmployee(false);
    }
  }


  if (loading) {
    return <InlineLoader className="min-h-[40vh]" />;
  }

  if (error && !team) {
    return (
      <div className="card mt-8 p-8 text-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!team) {
    return null;
  }

  return (
    <div className="space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-xl font-semibold text-slate-800">{team.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {t(
            isArabic,
            'Employees who register through your invite link, or that you add directly, land here. Tasks and projects in this group stay between you and them.',
            'الموظفون الذين يسجّلون عبر رابط الدعوة الخاص بك، أو الذين تضيفهم مباشرة، يظهرون هنا. تبقى المهام والمشاريع في هذه المجموعة بينك وبينهم فقط.',
          )}
        </p>
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-slate-800">
          {t(isArabic, 'Invite link', 'رابط الدعوة')}
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          {t(
            isArabic,
            'Share this link with employees you want on your team. They register through it and are linked to you automatically.',
            'شارك هذا الرابط مع الموظفين الذين تريدهم في فريقك. يسجّلون من خلاله ويُربطون بك تلقائياً.',
          )}
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            className="input flex-1"
            value={team.inviteLink ?? ''}
            onFocus={(event) => event.target.select()}
          />

          <button
            type="button"
            className="btn-secondary shrink-0"
            onClick={() => void copyInviteLink()}
          >
            {copied
              ? t(isArabic, 'Copied!', 'تم النسخ!')
              : t(isArabic, 'Copy', 'نسخ')}
          </button>

          <button
            type="button"
            className="btn shrink-0"
            disabled={regenerating}
            onClick={() => void regenerateLink()}
          >
            {regenerating
              ? t(isArabic, 'Regenerating\u2026', 'جارٍ التجديد\u2026')
              : t(isArabic, 'Regenerate link', 'تجديد الرابط')}
          </button>
        </div>

        <p className="mt-2 text-xs text-amber-600">
          {t(
            isArabic,
            'Regenerating invalidates the old link immediately.',
            'تجديد الرابط يلغي الرابط القديم فوراً.',
          )}
        </p>
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-slate-800">
          {t(isArabic, 'Add an employee directly', 'إضافة موظف مباشرة')}
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          {t(
            isArabic,
            'An alternative to the invite link \u2014 create the account yourself.',
            'بديل عن رابط الدعوة \u2014 أنشئ الحساب بنفسك.',
          )}
        </p>

        <form onSubmit={addEmployee} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="employeeFullName">
              {t(isArabic, 'Full name', 'الاسم الكامل')}
            </label>
            <input
              id="employeeFullName"
              className="input"
              required
              maxLength={150}
              value={employeeForm.fullName}
              onChange={(event) =>
                setEmployeeForm({ ...employeeForm, fullName: event.target.value })
              }
            />
          </div>

          <div>
            <label className="label" htmlFor="employeeEmail">
              {t(isArabic, 'Email', 'البريد الإلكتروني')}
            </label>
            <input
              id="employeeEmail"
              type="email"
              className="input"
              required
              value={employeeForm.email}
              onChange={(event) =>
                setEmployeeForm({ ...employeeForm, email: event.target.value })
              }
            />
          </div>

          <div>
            <label className="label" htmlFor="employeePhone">
              {t(isArabic, 'Phone', 'الهاتف')}{' '}
              <span className="font-normal text-slate-400">
                ({t(isArabic, 'optional', 'اختياري')})
              </span>
            </label>
            <input
              id="employeePhone"
              type="tel"
              inputMode="numeric"
              maxLength={15}
              placeholder="963912345678"
              className="input"
              value={employeeForm.phone}
              onChange={(event) =>
                setEmployeeForm({
                  ...employeeForm,
                  phone: event.target.value.replace(/\D/g, '').slice(0, 15),
                })
              }
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="employeePassword">
              {t(isArabic, 'Temporary password', 'كلمة مرور مؤقتة')}
            </label>
            <PasswordInput
              id="employeePassword"
              required
              minLength={8}
              className="input"
              value={employeeForm.password}
              onChange={(event) =>
                setEmployeeForm({ ...employeeForm, password: event.target.value })
              }
            />
          </div>

          {employeeError && (
            <div className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {employeeError}
            </div>
          )}

          {addedMessage && (
            <div className="sm:col-span-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {addedMessage}
            </div>
          )}

          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary" disabled={addingEmployee}>
              {addingEmployee
                ? t(isArabic, 'Adding\u2026', 'جارٍ الإضافة\u2026')
                : t(isArabic, 'Add employee', 'إضافة موظف')}
            </button>
          </div>
        </form>
      </div>

      <div className="card divide-y divide-slate-100">
        <div className="px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">
            {t(isArabic, 'Members', 'الأعضاء')} ({team.members.length})
          </h2>
        </div>

        {team.members.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">
            {t(
              isArabic,
              'No employees yet. Share your invite link or add one above.',
              'لا يوجد موظفون بعد. شارك رابط الدعوة أو أضف واحداً أعلاه.',
            )}
          </p>
        ) : (
          team.members.map((member) => (
            <div key={member.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-medium text-slate-800">{member.fullName}</div>
                <div className="text-xs text-slate-500">{member.email}</div>
              </div>

              {!member.isActive && (
                <span className="badge bg-slate-100 text-slate-500">
                  {t(isArabic, 'Inactive', 'غير نشط')}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}


export default function TeamPage() {
  return (
    <ProtectedRoute allowedRoles={['TEAM_LEADER']}>
      <TeamContent />
    </ProtectedRoute>
  );
}
