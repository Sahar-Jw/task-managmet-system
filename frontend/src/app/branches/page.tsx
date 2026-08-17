'use client';

import {
  useEffect,
  useState,
} from 'react';

import ProtectedRoute from '@/components/ProtectedRoute';
import {
  ApiError,
} from '@/lib/api';
import {
  BranchesApi,
  DepartmentsApi,
  SettingsApi,
} from '@/lib/endpoints';
import type {
  Branch,
  Department,
} from '@/lib/types';
import { useLocale } from 'next-intl';
import { uiText } from '@/lib/ui-text';


function BranchesContent() {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const [
    branches,
    setBranches,
  ] = useState<Branch[]>([]);

  const [
    departments,
    setDepartments,
  ] = useState<Department[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  const [
    branchForm,
    setBranchForm,
  ] = useState({
    name: '',
    code: '',
    address: '',
  });

  const [
    deptForm,
    setDeptForm,
  ] = useState({
    name: '',
    code: '',
  });


  async function load() {
    setLoading(
      true,
    );

    try {
      const [
        branchItems,
        departmentItems,
      ] = await Promise.all([
        BranchesApi.list(),
        DepartmentsApi.list(),
      ]);

      setBranches(
        branchItems,
      );

      setDepartments(
        departmentItems,
      );
    } catch (
      err
    ) {
      setError(
        err instanceof ApiError
          ? err.message
          : uiText(isArabic, 'text0924'),
      );
    } finally {
      setLoading(
        false,
      );
    }
  }


  useEffect(() => {
    void load();
  }, []);


  async function createBranch(
    event:
      React.FormEvent,
  ) {
    event.preventDefault();
    setError('');

    try {
      const name =
        branchForm.name.trim();

      const code =
        branchForm.code.trim();

      await BranchesApi.create({
        codeEn:
          code,
        codeAr:
          code,
        valueEn:
          name,
        valueAr:
          name,
        address:
          branchForm.address.trim() ||
          undefined,
      });

      setBranchForm({
        name: '',
        code: '',
        address: '',
      });

      await load();
    } catch (
      err
    ) {
      setError(
        err instanceof ApiError
          ? err.message
          : uiText(isArabic, 'text0925'),
      );
    }
  }


  async function createDepartment(
    event:
      React.FormEvent,
  ) {
    event.preventDefault();
    setError('');

    try {
      const name =
        deptForm.name.trim();

      const code =
        deptForm.code.trim();

      await DepartmentsApi.create({
        codeEn:
          code,
        codeAr:
          code,
        valueEn:
          name,
        valueAr:
          name,
      });

      setDeptForm({
        name: '',
        code: '',
      });

      await load();
    } catch (
      err
    ) {
      setError(
        err instanceof ApiError
          ? err.message
          : uiText(isArabic, 'text0926'),
      );
    }
  }


  async function toggleBranchActive(
    branch:
      Branch,
  ) {
    setError('');

    try {
      await SettingsApi.update(
        branch.id,
        {
          isActive:
            !branch.isActive,
        },
      );

      await load();
    } catch (
      err
    ) {
      setError(
        err instanceof ApiError
          ? err.message
          : uiText(isArabic, 'text0927'),
      );
    }
  }


  function settingName(
    item:
      Branch |
      Department,
  ) {
    return (
      item.valueEn ||
      item.codeEn ||
      item.valueAr ||
      item.codeAr ||
      '—'
    );
  }


  function settingCode(
    item:
      Branch |
      Department,
  ) {
    return (
      item.codeEn ||
      item.codeAr ||
      '—'
    );
  }


  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" dir={isArabic ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-xl font-semibold text-slate-800">
          {uiText(isArabic, 'text0942')}
        </h1>

        <form
          onSubmit={
            createBranch
          }
          className="card mt-4 space-y-3 p-6"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">
                {uiText(isArabic, 'text0858')}
              </label>
              <input
                className="input"
                required
                value={
                  branchForm.name
                }
                onChange={(
                  event,
                ) =>
                  setBranchForm({
                    ...branchForm,
                    name:
                      event.target.value,
                  })
                }
              />
            </div>

            <div>
              <label className="label">
                {uiText(isArabic, 'text0943')}
              </label>
              <input
                className="input"
                required
                value={
                  branchForm.code
                }
                onChange={(
                  event,
                ) =>
                  setBranchForm({
                    ...branchForm,
                    code:
                      event.target.value,
                  })
                }
              />
            </div>
          </div>

          <div>
            <label className="label">
              {uiText(isArabic, 'text0944')}
            </label>
            <input
              className="input"
              value={
                branchForm.address
              }
              onChange={(
                event,
              ) =>
                setBranchForm({
                  ...branchForm,
                  address:
                    event.target.value,
                })
              }
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
          >
            {uiText(isArabic, 'text0945')}
          </button>
        </form>

        <div className="mt-4 card divide-y divide-slate-100">
          {loading ? (
            null
          ) : (
            branches.map(
              (
                branch,
              ) => (
                <div
                  key={
                    branch.id
                  }
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <div className="font-medium text-slate-800">
                      {settingName(
                        branch,
                      )}{' '}
                      <span className="text-xs text-slate-400">
                        ({settingCode(
                          branch,
                        )})
                      </span>
                    </div>

                    {branch.address && (
                      <div className="text-xs text-slate-500">
                        {branch.address}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className={`btn ${
                      branch.isActive
                        ? 'btn-secondary'
                        : 'btn-primary'
                    }`}
                    onClick={() =>
                      void toggleBranchActive(
                        branch,
                      )
                    }
                  >
                    {branch.isActive
                      ? uiText(isArabic, 'text0936')
                      : uiText(isArabic, 'text0946')}
                  </button>
                </div>
              ),
            )
          )}
        </div>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-slate-800">
          {uiText(isArabic, 'text0947')}
        </h1>

        <form
          onSubmit={
            createDepartment
          }
          className="card mt-4 space-y-3 p-6"
        >
          <p className="text-xs text-slate-400">
            {uiText(isArabic, 'text0948')}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">
                {uiText(isArabic, 'text0858')}
              </label>
              <input
                className="input"
                required
                value={
                  deptForm.name
                }
                onChange={(
                  event,
                ) =>
                  setDeptForm({
                    ...deptForm,
                    name:
                      event.target.value,
                  })
                }
              />
            </div>

            <div>
              <label className="label">
                {uiText(isArabic, 'text0943')}
              </label>
              <input
                className="input"
                required
                value={
                  deptForm.code
                }
                onChange={(
                  event,
                ) =>
                  setDeptForm({
                    ...deptForm,
                    code:
                      event.target.value,
                  })
                }
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
          >
            {uiText(isArabic, 'text0949')}
          </button>
        </form>

        <div className="mt-4 card divide-y divide-slate-100">
          {loading ? (
            null
          ) : (
            departments.map(
              (
                department,
              ) => (
                <div
                  key={
                    department.id
                  }
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="font-medium text-slate-800">
                    {settingName(
                      department,
                    )}{' '}
                    <span className="text-xs text-slate-400">
                      ({settingCode(
                        department,
                      )})
                    </span>
                  </div>

                  {!department.isActive && (
                    <span className="badge bg-slate-100 text-slate-500">
                      {uiText(isArabic, 'text0092')}
                    </span>
                  )}
                </div>
              ),
            )
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 lg:col-span-2">
          {error}
        </p>
      )}
    </div>
  );
}


export default function BranchesPage() {
  return (
    <ProtectedRoute adminOnly>
      <BranchesContent />
    </ProtectedRoute>
  );
}
