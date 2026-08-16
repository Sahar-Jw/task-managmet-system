'use client';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import Link from 'next/link';

import {
  useRouter,
} from 'next/navigation';

import {
  useLocale,
  useTranslations,
} from 'next-intl';

import {
  useAuth,
} from '@/lib/auth-context';

import {
  ApiError,
} from '@/lib/api';

import {
  isValidPhone,
  PHONE_VALIDATION_MESSAGE,
} from '@/lib/validation';

import PasswordInput from '@/components/PasswordInput';


/*
 * ============================================================
 * TYPES
 * ============================================================
 */

type AuthMode =
  | 'login'
  | 'register'
  | null;


type BranchOrDept = {
  id: string;

  codeAr?: string;
  codeEn?: string;

  valueAr?: string;
  valueEn?: string;
};


/*
 * ============================================================
 * MAIN PAGE
 * ============================================================
 */

export default function Home() {
  const {
    user,
    loading,
    login,
    register,
  } = useAuth();

  const router =
    useRouter();

  const locale =
    useLocale();

  const isArabic =
    locale === 'ar';

  const t =
    useTranslations(
      'home',
    );


  /*
   * ==========================================================
   * AUTH PANEL
   * ==========================================================
   */

  const authRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const [
    mode,
    setMode,
  ] = useState<AuthMode>(
    null,
  );

  const [
    authError,
    setAuthError,
  ] = useState('');

  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  /*
   * ==========================================================
   * FORM
   * ==========================================================
   */

  const [
    email,
    setEmail,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    fullName,
    setFullName,
  ] = useState('');

  const [
    phone,
    setPhone,
  ] = useState('');

  const [
    phoneError,
    setPhoneError,
  ] = useState('');

  const [
    branchId,
    setBranchId,
  ] = useState('');

  const [
    departmentId,
    setDepartmentId,
  ] = useState('');


  /*
   * ==========================================================
   * PUBLIC DATA
   * ==========================================================
   */

  const [
    branches,
    setBranches,
  ] = useState<
    BranchOrDept[]
  >([]);

  const [
    departments,
    setDepartments,
  ] = useState<
    BranchOrDept[]
  >([]);

  const [
    loadingBranches,
    setLoadingBranches,
  ] = useState(true);

  const [
    loadingDepartments,
    setLoadingDepartments,
  ] = useState(true);


  /*
   * ==========================================================
   * REDIRECT AUTHENTICATED USERS
   * ==========================================================
   */

  useEffect(() => {
    if (
      !loading &&
      user
    ) {
      router.replace(
        '/dashboard',
      );
    }
  }, [
    user,
    loading,
    router,
  ]);


  /*
   * ==========================================================
   * READ ?auth=login / register
   * ==========================================================
   */

  useEffect(() => {
    if (
      typeof window ===
      'undefined'
    ) {
      return;
    }

    const params =
      new URLSearchParams(
        window.location.search,
      );

    const auth =
      params.get(
        'auth',
      );

    const requestedMode:
      AuthMode =
      auth ===
      'register'
        ? 'register'
        : auth ===
            'login'
          ? 'login'
          : null;

    setMode(
      requestedMode,
    );
  }, []);


  /*
   * ==========================================================
   * SCROLL TO AUTH
   * ==========================================================
   */

  useEffect(() => {
    if (!mode) {
      return;
    }

    window.setTimeout(
      () => {
        authRef.current?.scrollIntoView({
          behavior:
            'smooth',

          block:
            'center',
        });
      },
      50,
    );
  }, [
    mode,
  ]);


  /*
   * ==========================================================
   * PUBLIC BRANCH / DEPARTMENT DATA
   * ==========================================================
   */

  useEffect(() => {
    async function loadPublicData() {
      const baseUrl =
        process.env
          .NEXT_PUBLIC_API_URL ||
        'http://localhost:3000/api/v1';

      try {
        const [
          branchesResponse,
          departmentsResponse,
        ] =
          await Promise.all([
            fetch(
              `${baseUrl}/public/branches`,
            ),

            fetch(
              `${baseUrl}/public/departments`,
            ),
          ]);


        if (
          !branchesResponse.ok ||
          !departmentsResponse.ok
        ) {
          throw new Error(
            'Failed to load registration data.',
          );
        }


        const branchesJson =
          await branchesResponse.json();

        const departmentsJson =
          await departmentsResponse.json();


        setBranches(
          branchesJson.data ??
            branchesJson,
        );

        setDepartments(
          departmentsJson.data ??
            departmentsJson,
        );
      } catch {
        setAuthError(
          isArabic
            ? 'تعذر تحميل بيانات الفروع والأقسام. يرجى تحديث الصفحة.'
            : 'Could not load branch or department data. Please refresh the page.',
        );
      } finally {
        setLoadingBranches(
          false,
        );

        setLoadingDepartments(
          false,
        );
      }
    }

    loadPublicData();
  }, [
    isArabic,
  ]);


  /*
   * ==========================================================
   * LANGUAGE HELPERS
   * ==========================================================
   */

  function directoryLabel(
    item: BranchOrDept,
  ) {
    if (
      isArabic
    ) {
      return (
        item.valueAr ||
        item.codeAr ||
        item.valueEn ||
        item.codeEn ||
        '—'
      );
    }

    return (
      item.valueEn ||
      item.codeEn ||
      item.valueAr ||
      item.codeAr ||
      '—'
    );
  }


  const visibleBranches =
    branches.filter(
      (item) =>
        Boolean(
          isArabic
            ? item.codeAr ||
                item.valueAr
            : item.codeEn ||
                item.valueEn,
        ),
    );


  const visibleDepartments =
    departments.filter(
      (item) =>
        Boolean(
          isArabic
            ? item.codeAr ||
                item.valueAr
            : item.codeEn ||
                item.valueEn,
        ),
    );


  /*
   * ==========================================================
   * AUTH PANEL
   * ==========================================================
   */

  function openAuth(
    selectedMode:
      AuthMode,
  ) {
    setMode(
      selectedMode,
    );

    if (
      typeof window ===
      'undefined'
    ) {
      return;
    }


    const url =
      new URL(
        window.location.href,
      );


    if (
      selectedMode
    ) {
      url.searchParams.set(
        'auth',
        selectedMode,
      );

      url.hash =
        'auth';
    } else {
      url.searchParams.delete(
        'auth',
      );

      url.hash =
        '';
    }


    window.history.replaceState(
      {},
      '',
      url.toString(),
    );
  }


  function resetForm() {
    setAuthError('');
    setEmail('');
    setPassword('');
    setFullName('');
    setPhone('');
    setPhoneError('');
    setBranchId('');
    setDepartmentId('');
  }


  function handleModeChange(
    selectedMode:
      Exclude<
        AuthMode,
        null
      >,
  ) {
    resetForm();

    openAuth(
      mode ===
        selectedMode
        ? null
        : selectedMode,
    );
  }


  /*
   * ==========================================================
   * PHONE
   * ==========================================================
   */

  function handlePhoneChange(
    event:
      React.ChangeEvent<HTMLInputElement>,
  ) {
    const digitsOnly =
      event.target.value
        .replace(
          /\D/g,
          '',
        )
        .slice(
          0,
          12,
        );

    setPhone(
      digitsOnly,
    );

    if (
      phoneError
    ) {
      setPhoneError('');
    }
  }


  /*
   * ==========================================================
   * AUTH SUBMIT
   * ==========================================================
   */

  async function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setAuthError('');
    setPhoneError('');
    setSubmitting(
      true,
    );


    if (
      mode ===
        'register' &&
      phone &&
      !isValidPhone(
        phone,
      )
    ) {
      setPhoneError(
        PHONE_VALIDATION_MESSAGE,
      );

      setSubmitting(
        false,
      );

      return;
    }


    try {
      if (
        mode ===
        'login'
      ) {
        await login(
          email,
          password,
        );
      }


      if (
        mode ===
        'register'
      ) {
        await register({
          fullName,
          email,
          password,

          phone:
            phone ||
            undefined,

          branchId,
          departmentId,
        });
      }


      router.push(
        '/dashboard',
      );
    } catch (
      err
    ) {
      setAuthError(
        err instanceof ApiError
          ? err.message
          : isArabic
            ? 'تعذر إكمال الطلب. يرجى المحاولة مرة أخرى.'
            : 'Unable to submit. Please try again.',
      );

      setSubmitting(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * CONTENT
   * ==========================================================
   */

  const features = [
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path
            d="M4 20V8l8-4 8 4v12"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />

          <path
            d="M8 20v-6h8v6M8 10h.01M12 10h.01M16 10h.01"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ),

      title:
        isArabic
          ? 'هيكل تنظيمي واضح'
          : 'Structured organization',

      description:
        isArabic
          ? 'نظّم المستخدمين والمهام حسب الفروع والأقسام مع بقاء البيانات واضحة وسهلة الإدارة.'
          : 'Organize people and work across branches and departments without losing visibility.',
    },

    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path
            d="M8 12.5 10.5 15 16 9"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <circle
            cx="12"
            cy="12"
            r="9"
            strokeWidth="1.8"
          />
        </svg>
      ),

      title:
        isArabic
          ? 'تكليف وموافقة حقيقية'
          : 'Real assignment workflow',

      description:
        isArabic
          ? 'التكليف يحتاج قبولاً، ويمكن رفضه مع السبب، ثم إعادة التكليف حسب قواعد واضحة.'
          : 'Assignments can be accepted, rejected with a reason, and reassigned through a controlled workflow.',
    },

    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path
            d="M6 4h12v16H6z"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />

          <path
            d="M9 8h6M9 12h6M9 16h4"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ),

      title:
        isArabic
          ? 'سجل تدقيق'
          : 'Full audit trail',

      description:
        isArabic
          ? 'احتفظ بسجل واضح للتغييرات والإجراءات والموافقات لمعرفة ما حدث ومن قام به.'
          : 'Track changes, status updates and approvals so important actions remain accountable.',
    },

    {
      icon: (
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
      ),

      title:
        isArabic
          ? 'تقارير ولوحات متابعة'
          : 'Reports and dashboards',

      description:
        isArabic
          ? 'راقب تقدم العمل والمشاريع والأداء من نفس البيانات المستخدمة يومياً.'
          : 'Turn daily task activity into project, branch, department and performance insights.',
    },
  ];


  const workflow = [
    {
      number:
        '01',

      title:
        isArabic
          ? 'إنشاء المهمة'
          : 'Create',

      description:
        isArabic
          ? 'حدد التفاصيل، القسم، الأهمية والمواعيد.'
          : 'Define the task, department, importance and schedule.',
    },

    {
      number:
        '02',

      title:
        isArabic
          ? 'التكليف'
          : 'Assign',

      description:
        isArabic
          ? 'أرسل المهمة للمستخدم المناسب بانتظار القبول.'
          : 'Send the task to the right person for acceptance.',
    },

    {
      number:
        '03',

      title:
        isArabic
          ? 'التنفيذ'
          : 'Work',

      description:
        isArabic
          ? 'تابع الحالة والملاحظات والمرفقات أثناء التنفيذ.'
          : 'Track status, comments and attachments while work progresses.',
    },

    {
      number:
        '04',

      title:
        isArabic
          ? 'الموافقة'
          : 'Approve',

      description:
        isArabic
          ? 'مرّر المهام التي تحتاج موافقة عبر سير واضح قبل الإكمال.'
          : 'Route approval-required work through a clear sign-off step.',
    },
  ];


  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-[var(--page-bg,#f8fafc)] text-slate-900"
      dir={
        isArabic
          ? 'rtl'
          : 'ltr'
      }
    >
      {/*
       * ======================================================
       * NAVBAR
       * ======================================================
       */}

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  d="M7 12.5 10 15.5 17 8.5"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <rect
                  x="4"
                  y="4"
                  width="16"
                  height="16"
                  rx="4"
                  strokeWidth="1.8"
                />
              </svg>
            </div>

            <div>
              <div className="text-sm font-semibold tracking-tight text-slate-900 sm:text-base">
                Task &amp; Project Manager
              </div>

              <div className="hidden text-[11px] text-slate-400 sm:block">
                {isArabic
                  ? 'إدارة العمل بوضوح'
                  : 'Work, organized clearly'}
              </div>
            </div>
          </Link>


          <nav className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                handleModeChange(
                  'login',
                )
              }
              className="hidden rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:block"
            >
              {t(
                'signIn',
              )}
            </button>


            <button
              type="button"
              onClick={() =>
                handleModeChange(
                  'register',
                )
              }
              className="btn-primary"
            >
              {t(
                'createAccount',
              )}
            </button>
          </nav>
        </div>
      </header>


      {/*
       * ======================================================
       * HERO
       * ======================================================
       */}

      <main>
        <section className="relative overflow-hidden">
          {/*
           * Soft decorative background
           */}

          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-brand-100/70 blur-3xl" />

            <div className="absolute -right-48 top-32 h-[520px] w-[520px] rounded-full bg-brand-50 blur-3xl" />

            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:64px_64px] opacity-[0.18]" />
          </div>


          <div className="relative mx-auto grid min-h-[650px] max-w-7xl gap-14 px-5 py-20 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-8 lg:py-24">
            {/*
             * HERO COPY
             */}

            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-brand-500" />

                {isArabic
                  ? 'نظام واحد للمهام والمشاريع'
                  : 'One workspace for tasks and projects'}
              </div>


              <h1 className="mt-7 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-[64px]">
                {isArabic
                  ? 'حوّل العمل اليومي إلى سير واضح يمكن متابعته.'
                  : 'Turn daily work into a workflow everyone can follow.'}
              </h1>


              <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
                {isArabic
                  ? 'أنشئ المهام، كلّف الأشخاص، تابع القبول والرفض والموافقات والمشاريع من مكان واحد مع سجل واضح لكل خطوة.'
                  : 'Create tasks, assign ownership, manage acceptance, rejection, approvals and projects from one place—with a clear record of every important step.'}
              </p>


              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() =>
                    handleModeChange(
                      'register',
                    )
                  }
                  className="btn-primary min-h-[46px] px-6 text-sm"
                >
                  {isArabic
                    ? 'ابدأ الآن'
                    : 'Get started'}

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="ml-2 h-4 w-4"
                  >
                    <path
                      d="m9 18 6-6-6-6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>


                <button
                  type="button"
                  onClick={() =>
                    handleModeChange(
                      'login',
                    )
                  }
                  className="btn-secondary min-h-[46px] px-6 text-sm"
                >
                  {isArabic
                    ? 'تسجيل الدخول'
                    : 'Sign in'}
                </button>
              </div>


              <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-slate-500">
                {[
                  isArabic
                    ? 'قبول ورفض التكليف'
                    : 'Assignment acceptance',

                  isArabic
                    ? 'سير الموافقات'
                    : 'Approval workflow',

                  isArabic
                    ? 'سجل التدقيق'
                    : 'Audit history',
                ].map(
                  (
                    label,
                  ) => (
                    <div
                      key={
                        label
                      }
                      className="flex items-center gap-2"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                        ✓
                      </span>

                      {
                        label
                      }
                    </div>
                  ),
                )}
              </div>
            </div>


            {/*
             * HERO PRODUCT MOCKUP
             */}

            <div className="relative">
              <div className="absolute -inset-5 rounded-[36px] bg-brand-200/30 blur-2xl" />


              <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,.35)]">
                {/*
                 * Window header
                 */}

                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-4">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  </div>

                  <div className="text-[11px] font-medium text-slate-400">
                    {isArabic
                      ? 'مساحة العمل'
                      : 'Workspace overview'}
                  </div>

                  <div className="w-10" />
                </div>


                <div className="p-5 sm:p-6">
                  {/*
                   * Mini dashboard
                   */}

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        label:
                          isArabic
                            ? 'قيد التنفيذ'
                            : 'In progress',

                        value:
                          '12',
                      },

                      {
                        label:
                          isArabic
                            ? 'بانتظار الموافقة'
                            : 'Approval',

                        value:
                          '4',
                      },

                      {
                        label:
                          isArabic
                            ? 'مكتملة'
                            : 'Completed',

                        value:
                          '28',
                      },
                    ].map(
                      (
                        item,
                      ) => (
                        <div
                          key={
                            item.label
                          }
                          className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                        >
                          <div className="text-xl font-semibold text-slate-900">
                            {
                              item.value
                            }
                          </div>

                          <div className="mt-1 truncate text-[10px] text-slate-400">
                            {
                              item.label
                            }
                          </div>
                        </div>
                      ),
                    )}
                  </div>


                  {/*
                   * Main task
                   */}

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />

                          <span className="text-xs font-medium text-slate-400">
                            {isArabic
                              ? 'المهمة'
                              : 'TASK-024'}
                          </span>
                        </div>


                        <div className="mt-2 text-sm font-semibold text-slate-800">
                          {isArabic
                            ? 'إعداد تقرير الأداء الشهري'
                            : 'Prepare monthly performance report'}
                        </div>
                      </div>


                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                        {isArabic
                          ? 'أهمية عالية'
                          : 'High'}
                      </span>
                    </div>


                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <div className="text-[10px] uppercase tracking-wide text-slate-400">
                          {isArabic
                            ? 'المكلف'
                            : 'Assigned to'}
                        </div>

                        <div className="mt-1 text-xs font-medium text-slate-700">
                          Sarah Ahmed
                        </div>
                      </div>


                      <div className="rounded-lg bg-slate-50 p-3">
                        <div className="text-[10px] uppercase tracking-wide text-slate-400">
                          {isArabic
                            ? 'الحالة'
                            : 'Status'}
                        </div>

                        <div className="mt-1 text-xs font-medium text-brand-700">
                          {isArabic
                            ? 'قيد التنفيذ'
                            : 'In Progress'}
                        </div>
                      </div>
                    </div>


                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          {isArabic
                            ? 'سير العمل'
                            : 'Workflow'}
                        </span>

                        <span className="text-[10px] text-slate-400">
                          3 / 5
                        </span>
                      </div>


                      <div className="flex items-center">
                        {[
                          true,
                          true,
                          true,
                          false,
                          false,
                        ].map(
                          (
                            active,
                            index,
                          ) => (
                            <div
                              key={
                                index
                              }
                              className="flex flex-1 items-center last:flex-none"
                            >
                              <div
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${
                                  active
                                    ? 'bg-brand-600 text-white'
                                    : 'border border-slate-200 bg-white text-slate-400'
                                }`}
                              >
                                {active
                                  ? '✓'
                                  : index +
                                    1}
                              </div>

                              {index <
                                4 && (
                                <div
                                  className={`h-px flex-1 ${
                                    index <
                                    2
                                      ? 'bg-brand-300'
                                      : 'bg-slate-200'
                                  }`}
                                />
                              )}
                            </div>
                          ),
                        )}
                      </div>


                      <div className="mt-3 grid grid-cols-5 text-center text-[8px] text-slate-400">
                        <span>
                          {isArabic
                            ? 'إنشاء'
                            : 'Create'}
                        </span>

                        <span>
                          {isArabic
                            ? 'تكليف'
                            : 'Assign'}
                        </span>

                        <span>
                          {isArabic
                            ? 'تنفيذ'
                            : 'Work'}
                        </span>

                        <span>
                          {isArabic
                            ? 'موافقة'
                            : 'Approve'}
                        </span>

                        <span>
                          {isArabic
                            ? 'إكمال'
                            : 'Done'}
                        </span>
                      </div>
                    </div>
                  </div>


                  {/*
                   * Activity
                   */}

                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {isArabic
                        ? 'آخر نشاط'
                        : 'Recent activity'}
                    </div>


                    <div className="mt-3 space-y-3">
                      {[
                        {
                          dot:
                            'bg-brand-500',

                          text:
                            isArabic
                              ? 'تم قبول التكليف'
                              : 'Assignment accepted',

                          time:
                            '09:42',
                        },

                        {
                          dot:
                            'bg-amber-400',

                          text:
                            isArabic
                              ? 'تم تحديث الموعد النهائي'
                              : 'Deadline updated',

                          time:
                            '09:18',
                        },

                        {
                          dot:
                            'bg-slate-300',

                          text:
                            isArabic
                              ? 'تم إضافة تعليق'
                              : 'Comment added',

                          time:
                            '08:51',
                        },
                      ].map(
                        (
                          row,
                        ) => (
                          <div
                            key={
                              row.text
                            }
                            className="flex items-center gap-3"
                          >
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${row.dot}`}
                            />

                            <span className="min-w-0 flex-1 truncate text-xs text-slate-600">
                              {
                                row.text
                              }
                            </span>

                            <span className="text-[10px] text-slate-400">
                              {
                                row.time
                              }
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/*
         * ======================================================
         * AUTH
         * ======================================================
         */}

        {mode && (
          <section
            id="auth"
            ref={
              authRef
            }
            className="relative border-y border-slate-200 bg-white py-16"
          >
            <div className="mx-auto max-w-5xl px-5 sm:px-6">
              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl">
                <div className="grid lg:grid-cols-[.85fr_1.15fr]">
                  {/*
                   * AUTH SIDE
                   */}

                  <div className="relative hidden overflow-hidden bg-brand-600 p-8 text-white lg:block">
                    <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />
                    <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full border border-white/10" />


                    <div className="relative flex h-full min-h-[520px] flex-col">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          className="h-5 w-5"
                        >
                          <path
                            d="M7 12.5 10 15.5 17 8.5"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          <rect
                            x="4"
                            y="4"
                            width="16"
                            height="16"
                            rx="4"
                            strokeWidth="1.8"
                          />
                        </svg>
                      </div>


                      <h2 className="mt-8 text-3xl font-semibold tracking-tight">
                        {mode ===
                        'login'
                          ? isArabic
                            ? 'مرحباً بعودتك.'
                            : 'Welcome back.'
                          : isArabic
                            ? 'ابدأ العمل مع فريقك.'
                            : 'Start working with your team.'}
                      </h2>


                      <p className="mt-4 max-w-sm text-sm leading-7 text-white/70">
                        {mode ===
                        'login'
                          ? isArabic
                            ? 'سجّل الدخول للوصول إلى مهامك ومشاريعك وإشعاراتك ولوحة المتابعة.'
                            : 'Sign in to access your tasks, projects, notifications and dashboard.'
                          : isArabic
                            ? 'أنشئ حسابك وحدد الفرع والقسم للانضمام إلى مساحة العمل.'
                            : 'Create your account, select your branch and department, and join your workspace.'}
                      </p>


                      <div className="mt-auto space-y-3 pt-10">
                        {[
                          isArabic
                            ? 'إدارة المهام والمشاريع'
                            : 'Tasks and projects',

                          isArabic
                            ? 'سير التكليف والموافقة'
                            : 'Assignment and approvals',

                          isArabic
                            ? 'تقارير وإشعارات'
                            : 'Reports and notifications',
                        ].map(
                          (
                            item,
                          ) => (
                            <div
                              key={
                                item
                              }
                              className="flex items-center gap-3 text-sm text-white/80"
                            >
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs">
                                ✓
                              </span>

                              {
                                item
                              }
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>


                  {/*
                   * AUTH FORM
                   */}

                  <div className="p-6 sm:p-8 lg:p-10">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[.16em] text-brand-600">
                          {mode ===
                          'login'
                            ? isArabic
                              ? 'تسجيل الدخول'
                              : 'Sign in'
                            : isArabic
                              ? 'حساب جديد'
                              : 'Create account'}
                        </div>

                        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                          {mode ===
                          'login'
                            ? isArabic
                              ? 'ادخل إلى مساحة العمل'
                              : 'Access your workspace'
                            : isArabic
                              ? 'أنشئ حسابك'
                              : 'Create your workspace account'}
                        </h2>
                      </div>


                      <button
                        type="button"
                        onClick={() =>
                          openAuth(
                            null,
                          )
                        }
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Close"
                      >
                        ✕
                      </button>
                    </div>


                    {/*
                     * Mode tabs
                     */}

                    <div className="mt-7 flex rounded-xl bg-slate-100 p-1">
                      <button
                        type="button"
                        onClick={() =>
                          handleModeChange(
                            'login',
                          )
                        }
                        className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                          mode ===
                          'login'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {isArabic
                          ? 'تسجيل الدخول'
                          : 'Sign in'}
                      </button>


                      <button
                        type="button"
                        onClick={() =>
                          handleModeChange(
                            'register',
                          )
                        }
                        className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                          mode ===
                          'register'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {isArabic
                          ? 'إنشاء حساب'
                          : 'Create account'}
                      </button>
                    </div>


                    <form
                      onSubmit={
                        handleSubmit
                      }
                      className="mt-7 space-y-5"
                    >
                      {mode ===
                        'register' && (
                        <div className="grid gap-5 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <label
                              className="label"
                              htmlFor="fullName"
                            >
                              {isArabic
                                ? 'الاسم الكامل'
                                : 'Full name'}
                            </label>

                            <input
                              id="fullName"
                              type="text"
                              required
                              maxLength={
                                150
                              }
                              autoFocus
                              autoComplete="name"
                              className="input"
                              value={
                                fullName
                              }
                              onChange={(
                                event,
                              ) =>
                                setFullName(
                                  event
                                    .target
                                    .value,
                                )
                              }
                            />
                          </div>


                          <div className="sm:col-span-2">
                            <label
                              className="label"
                              htmlFor="phone"
                            >
                              {isArabic
                                ? 'رقم الهاتف'
                                : 'Phone'}{' '}

                              <span className="font-normal text-slate-400">
                                {isArabic
                                  ? '(اختياري)'
                                  : '(optional)'}
                              </span>
                            </label>

                            <input
                              id="phone"
                              type="tel"
                              inputMode="numeric"
                              maxLength={
                                12
                              }
                              placeholder="091234567890"
                              className="input"
                              value={
                                phone
                              }
                              onChange={
                                handlePhoneChange
                              }
                            />

                            {phoneError ? (
                              <p className="mt-1.5 text-xs text-red-600">
                                {
                                  phoneError
                                }
                              </p>
                            ) : (
                              <p className="mt-1.5 text-xs text-slate-400">
                                {isArabic
                                  ? '12 رقماً'
                                  : '12 digits'}
                              </p>
                            )}
                          </div>
                        </div>
                      )}


                      <div>
                        <label
                          className="label"
                          htmlFor="email"
                        >
                          {isArabic
                            ? 'البريد الإلكتروني'
                            : 'Email'}
                        </label>

                        <input
                          id="email"
                          type="email"
                          required
                          autoComplete="email"
                          autoFocus={
                            mode ===
                            'login'
                          }
                          className="input"
                          value={
                            email
                          }
                          onChange={(
                            event,
                          ) =>
                            setEmail(
                              event
                                .target
                                .value,
                            )
                          }
                        />
                      </div>


                      <div>
                        <div className="flex items-center justify-between">
                          <label
                            className="label"
                            htmlFor="password"
                          >
                            {isArabic
                              ? 'كلمة المرور'
                              : 'Password'}
                          </label>


                          {mode ===
                            'login' && (
                            <Link
                              href="/forgot-password"
                              className="mb-1 text-xs font-medium text-brand-600 hover:underline"
                            >
                              {isArabic
                                ? 'نسيت كلمة المرور؟'
                                : 'Forgot password?'}
                            </Link>
                          )}
                        </div>

                        <PasswordInput
                          id="password"
                          required
                          minLength={
                            8
                          }
                          autoComplete={
                            mode ===
                            'login'
                              ? 'current-password'
                              : 'new-password'
                          }
                          className="input"
                          value={
                            password
                          }
                          onChange={(
                            event,
                          ) =>
                            setPassword(
                              event
                                .target
                                .value,
                            )
                          }
                        />

                        {mode ===
                          'register' && (
                          <p className="mt-1.5 text-xs text-slate-400">
                            {isArabic
                              ? '8 أحرف على الأقل.'
                              : 'At least 8 characters.'}
                          </p>
                        )}
                      </div>


                      {mode ===
                        'register' && (
                        <div className="grid gap-5 sm:grid-cols-2">
                          <div>
                            <label
                              className="label"
                              htmlFor="branch"
                            >
                              {isArabic
                                ? 'الفرع'
                                : 'Branch'}
                            </label>

                            <select
                              id="branch"
                              required
                              className="input"
                              value={
                                branchId
                              }
                              onChange={(
                                event,
                              ) =>
                                setBranchId(
                                  event
                                    .target
                                    .value,
                                )
                              }
                              disabled={
                                loadingBranches
                              }
                            >
                              <option
                                value=""
                                disabled
                              >
                                {loadingBranches
                                  ? isArabic
                                    ? 'جاري تحميل الفروع…'
                                    : 'Loading branches…'
                                  : isArabic
                                    ? 'اختر الفرع'
                                    : 'Select a branch'}
                              </option>

                              {visibleBranches.map(
                                (
                                  branch,
                                ) => (
                                  <option
                                    key={
                                      branch.id
                                    }
                                    value={
                                      branch.id
                                    }
                                  >
                                    {directoryLabel(
                                      branch,
                                    )}
                                  </option>
                                ),
                              )}
                            </select>
                          </div>


                          <div>
                            <label
                              className="label"
                              htmlFor="department"
                            >
                              {isArabic
                                ? 'القسم'
                                : 'Department'}
                            </label>

                            <select
                              id="department"
                              required
                              className="input"
                              value={
                                departmentId
                              }
                              onChange={(
                                event,
                              ) =>
                                setDepartmentId(
                                  event
                                    .target
                                    .value,
                                )
                              }
                              disabled={
                                loadingDepartments
                              }
                            >
                              <option
                                value=""
                                disabled
                              >
                                {loadingDepartments
                                  ? isArabic
                                    ? 'جاري تحميل الأقسام…'
                                    : 'Loading departments…'
                                  : isArabic
                                    ? 'اختر القسم'
                                    : 'Select a department'}
                              </option>

                              {visibleDepartments.map(
                                (
                                  department,
                                ) => (
                                  <option
                                    key={
                                      department.id
                                    }
                                    value={
                                      department.id
                                    }
                                  >
                                    {directoryLabel(
                                      department,
                                    )}
                                  </option>
                                ),
                              )}
                            </select>
                          </div>
                        </div>
                      )}


                      {authError && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          {
                            authError
                          }
                        </div>
                      )}


                      <button
                        type="submit"
                        className="btn-primary min-h-[46px] w-full"
                        disabled={
                          submitting
                        }
                      >
                        {submitting
                          ? mode ===
                            'login'
                            ? isArabic
                              ? 'جاري تسجيل الدخول…'
                              : 'Signing in…'
                            : isArabic
                              ? 'جاري إنشاء الحساب…'
                              : 'Creating account…'
                          : mode ===
                              'login'
                            ? isArabic
                              ? 'تسجيل الدخول'
                              : 'Sign in'
                            : isArabic
                              ? 'إنشاء الحساب'
                              : 'Create account'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}


        {/*
         * ======================================================
         * FEATURES
         * ======================================================
         */}

        <section className="border-b border-slate-200 bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <div className="text-xs font-semibold uppercase tracking-[.16em] text-brand-600">
                {isArabic
                  ? 'نظام متكامل'
                  : 'Built for real workflows'}
              </div>

              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
                {isArabic
                  ? 'ليس مجرد قائمة مهام.'
                  : 'More than a list of tasks.'}
              </h2>

              <p className="mt-4 text-base leading-7 text-slate-600">
                {isArabic
                  ? 'اربط الأشخاص والعمل والمشاريع وسير الموافقات في نظام واحد بدلاً من توزيعها على أدوات مختلفة.'
                  : 'Connect people, work, projects and approvals in one system instead of spreading them across disconnected tools.'}
              </p>
            </div>


            <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {features.map(
                (
                  feature,
                ) => (
                  <article
                    key={
                      feature.title
                    }
                    className="group rounded-2xl border border-slate-200 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-100">
                      {
                        feature.icon
                      }
                    </div>

                    <h3 className="mt-5 text-base font-semibold text-slate-900">
                      {
                        feature.title
                      }
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {
                        feature.description
                      }
                    </p>
                  </article>
                ),
              )}
            </div>
          </div>
        </section>


        {/*
         * ======================================================
         * WORKFLOW
         * ======================================================
         */}

        <section className="bg-slate-50 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[.16em] text-brand-600">
                  {isArabic
                    ? 'من البداية إلى النهاية'
                    : 'From start to finish'}
                </div>

                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
                  {isArabic
                    ? 'كل مهمة لها مسار مفهوم.'
                    : 'Every task has a clear path.'}
                </h2>

                <p className="mt-4 max-w-md text-base leading-7 text-slate-600">
                  {isArabic
                    ? 'بدلاً من تغيير الحالة فقط، يتابع النظام من قام بالتكليف ومن قبله أو رفضه ومن وافق عليه.'
                    : 'Instead of merely changing a status field, the system keeps the responsibility and decisions around the work visible.'}
                </p>


                <div className="mt-8 rounded-2xl border border-brand-100 bg-brand-50 p-5">
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
                      ✓
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-brand-900">
                        {isArabic
                          ? 'المساءلة بدون تعقيد'
                          : 'Accountability without complexity'}
                      </div>

                      <p className="mt-1 text-sm leading-6 text-brand-800/70">
                        {isArabic
                          ? 'المستخدم يرى ما يحتاج فعله، والمدير يستطيع معرفة حالة العمل وما حدث له.'
                          : 'Users see what needs their attention while managers retain visibility into how the work moved.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>


              <div className="grid gap-3 sm:grid-cols-2">
                {workflow.map(
                  (
                    item,
                    index,
                  ) => (
                    <div
                      key={
                        item.number
                      }
                      className={`rounded-2xl border bg-white p-6 ${
                        index ===
                        0
                          ? 'border-brand-200 shadow-sm'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold tracking-wider text-brand-600">
                          {
                            item.number
                          }
                        </span>

                        <span
                          className={`h-2 w-2 rounded-full ${
                            index ===
                            0
                              ? 'bg-brand-500'
                              : 'bg-slate-200'
                          }`}
                        />
                      </div>

                      <h3 className="mt-6 text-lg font-semibold text-slate-900">
                        {
                          item.title
                        }
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {
                          item.description
                        }
                      </p>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>


        {/*
         * ======================================================
         * CTA
         * ======================================================
         */}

        <section className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-[28px] bg-brand-600 px-6 py-12 text-white sm:px-10 lg:px-14 lg:py-14">
              <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full border border-white/10" />
              <div className="absolute -bottom-48 right-32 h-96 w-96 rounded-full border border-white/10" />


              <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                    {isArabic
                      ? 'اجعل العمل واضحاً من أول تكليف حتى الإكمال.'
                      : 'Make work clear from first assignment to completion.'}
                  </h2>

                  <p className="mt-4 max-w-xl text-sm leading-7 text-white/75 sm:text-base">
                    {isArabic
                      ? 'أنشئ حسابك وابدأ باستخدام نظام موحد للمهام والمشاريع والموافقات.'
                      : 'Create your account and start managing tasks, projects and approvals in one connected workspace.'}
                  </p>
                </div>


                <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() =>
                      handleModeChange(
                        'register',
                      )
                    }
                    className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"
                  >
                    {isArabic
                      ? 'إنشاء حساب'
                      : 'Create account'}
                  </button>


                  <button
                    type="button"
                    onClick={() =>
                      handleModeChange(
                        'login',
                      )
                    }
                    className="rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    {isArabic
                      ? 'تسجيل الدخول'
                      : 'Sign in'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>


      {/*
       * ======================================================
       * FOOTER
       * ======================================================
       */}

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="h-4 w-4"
              >
                <path
                  d="M7 12.5 10 15.5 17 8.5"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <rect
                  x="4"
                  y="4"
                  width="16"
                  height="16"
                  rx="4"
                  strokeWidth="1.8"
                />
              </svg>
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-800">
                Task &amp; Project Manager
              </div>

              <div className="text-xs text-slate-400">
                {isArabic
                  ? 'نظام إدارة العمل والمشاريع'
                  : 'Task and project management system'}
              </div>
            </div>
          </div>


          <div className="text-xs text-slate-400">
            © {new Date().getFullYear()}{' '}
            Task &amp; Project Manager
          </div>
        </div>
      </footer>
    </div>
  );
}