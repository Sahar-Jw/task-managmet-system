'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import ProtectedRoute from '@/components/ProtectedRoute';
import Avatar from '@/components/Avatar';

import {
  useAuth,
} from '@/lib/auth-context';

import {
  ApiError,
} from '@/lib/api';

import {
  DepartmentsApi,
  SettingsApi,
  UsersApi,
} from '@/lib/endpoints';

import type {
  Department,
  Setting,
} from '@/lib/types';

import {
  isValidPhone,
  PHONE_VALIDATION_MESSAGE,
} from '@/lib/validation';


const MAX_AVATAR_MB =
  5;


/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function getSettingLabel(
  setting:
    Setting | Department | null,
) {
  if (!setting) {
    return '—';
  }

  return (
    setting.valueEn ||
    setting.codeEn ||
    setting.valueAr ||
    setting.codeAr ||
    '—'
  );
}


function formatDate(
  value?:
    string,
) {
  if (!value) {
    return '—';
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '—';
  }

  return date.toLocaleDateString(
    undefined,
    {
      year:
        'numeric',

      month:
        'long',

      day:
        'numeric',
    },
  );
}


/*
 * ============================================================
 * SMALL UI
 * ============================================================
 */

function InfoItem({
  label,
  value,
}: {
  label:
    string;

  value:
    React.ReactNode;
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-slate-200
        bg-slate-50/70
        px-4
        py-3.5
      "
    >
      <div
        className="
          text-[11px]
          font-semibold
          uppercase
          tracking-[.08em]
          text-slate-400
        "
      >
        {label}
      </div>

      <div
        className="
          mt-1.5
          break-words
          text-sm
          font-medium
          text-slate-800
        "
      >
        {value}
      </div>
    </div>
  );
}


function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow:
    string;

  title:
    string;

  description:
    string;
}) {
  return (
    <div>
      <div
        className="
          text-[11px]
          font-semibold
          uppercase
          tracking-[.12em]
          text-brand-600
        "
      >
        {eyebrow}
      </div>

      <h2
        className="
          mt-1
          text-lg
          font-semibold
          tracking-[-0.02em]
          text-slate-900
        "
      >
        {title}
      </h2>

      <p
        className="
          mt-1
          max-w-2xl
          text-sm
          leading-6
          text-slate-500
        "
      >
        {description}
      </p>
    </div>
  );
}


/*
 * ============================================================
 * PROFILE
 * ============================================================
 */

function ProfileContent() {
  const {
    user,
    refreshUser,
  } =
    useAuth();


  /*
   * ==========================================================
   * PROFILE STATE
   * ==========================================================
   */

  const [
    fullName,
    setFullName,
  ] =
    useState(
      user?.fullName ||
        '',
    );


  const [
    phone,
    setPhone,
  ] =
    useState(
      user?.phone ||
        '',
    );


  const [
    phoneError,
    setPhoneError,
  ] =
    useState('');


  const [
    profileError,
    setProfileError,
  ] =
    useState('');


  const [
    profileSaved,
    setProfileSaved,
  ] =
    useState(
      false,
    );


  const [
    profileSaving,
    setProfileSaving,
  ] =
    useState(
      false,
    );


  /*
   * ==========================================================
   * ORGANIZATION STATE
   * ==========================================================
   */

  const [
    department,
    setDepartment,
  ] =
    useState<
      Department | null
    >(
      null,
    );


  const [
    branch,
    setBranch,
  ] =
    useState<
      Setting | null
    >(
      null,
    );


  /*
   * ==========================================================
   * AVATAR STATE
   * ==========================================================
   */

  const [
    avatarError,
    setAvatarError,
  ] =
    useState('');


  const [
    avatarUploading,
    setAvatarUploading,
  ] =
    useState(
      false,
    );


  const [
    selectedAvatar,
    setSelectedAvatar,
  ] =
    useState<
      File | null
    >(
      null,
    );


  const [
    avatarPreview,
    setAvatarPreview,
  ] =
    useState<
      string | null
    >(
      null,
    );


  const fileInputRef =
    useRef<HTMLInputElement>(
      null,
    );


  /*
   * ==========================================================
   * PASSWORD STATE
   * ==========================================================
   */

  const [
    currentPassword,
    setCurrentPassword,
  ] =
    useState('');


  const [
    newPassword,
    setNewPassword,
  ] =
    useState('');


  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState('');


  const [
    passwordError,
    setPasswordError,
  ] =
    useState('');


  const [
    passwordSaved,
    setPasswordSaved,
  ] =
    useState(
      false,
    );


  const [
    passwordSaving,
    setPasswordSaving,
  ] =
    useState(
      false,
    );


  const [
    showCurrentPassword,
    setShowCurrentPassword,
  ] =
    useState(
      false,
    );


  const [
    showNewPassword,
    setShowNewPassword,
  ] =
    useState(
      false,
    );


  /*
   * ==========================================================
   * SYNC USER
   * ==========================================================
   */

  useEffect(() => {
    if (!user) {
      return;
    }

    setFullName(
      user.fullName ||
        '',
    );

    setPhone(
      user.phone ||
        '',
    );
  }, [
    user?.id,
    user?.fullName,
    user?.phone,
  ]);


  /*
   * ==========================================================
   * LOAD ORGANIZATION
   * ==========================================================
   */

  useEffect(() => {
    let active =
      true;


    async function loadOrganization() {
      if (!user) {
        return;
      }

      try {
        const [
          departments,
          branches,
        ] =
          await Promise.all([
            DepartmentsApi.list(),

            SettingsApi.list(
              'branch',
              true,
            ),
          ]);


        if (!active) {
          return;
        }


        setDepartment(
          user.departmentId
            ? departments.find(
                (
                  item,
                ) =>
                  item.id ===
                  user.departmentId,
              ) ??
                null
            : null,
        );


        setBranch(
          user.branchId
            ? branches.find(
                (
                  item,
                ) =>
                  item.id ===
                  user.branchId,
              ) ??
                null
            : null,
        );
      } catch {
        if (!active) {
          return;
        }

        setDepartment(
          null,
        );

        setBranch(
          null,
        );
      }
    }


    loadOrganization();


    return () => {
      active =
        false;
    };
  }, [
    user?.id,
    user?.departmentId,
    user?.branchId,
  ]);


  /*
   * ==========================================================
   * AVATAR PREVIEW CLEANUP
   * ==========================================================
   */

  useEffect(() => {
    return () => {
      if (
        avatarPreview
      ) {
        URL.revokeObjectURL(
          avatarPreview,
        );
      }
    };
  }, [
    avatarPreview,
  ]);


  /*
   * ==========================================================
   * DERIVED
   * ==========================================================
   */

  const hasProfileChanges =
    useMemo(
      () => {
        if (!user) {
          return false;
        }

        return (
          fullName.trim() !==
            user.fullName.trim() ||
          phone.trim() !==
            (
              user.phone ||
              ''
            ).trim()
        );
      },
      [
        user,
        fullName,
        phone,
      ],
    );


  if (!user) {
    return null;
  }


  /*
   * ==========================================================
   * PROFILE
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

    setProfileSaved(
      false,
    );


    if (
      phoneError
    ) {
      setPhoneError('');
    }
  }


  async function handleProfileSubmit(
    event:
      React.FormEvent,
  ) {
    event.preventDefault();


    setProfileError('');
    setPhoneError('');
    setProfileSaved(
      false,
    );


    const cleanName =
      fullName.trim();


    const cleanPhone =
      phone.trim();


    if (!cleanName) {
      setProfileError(
        'Full name is required.',
      );

      return;
    }


    if (
      cleanName.length >
      150
    ) {
      setProfileError(
        'Full name cannot exceed 150 characters.',
      );

      return;
    }


    if (
      cleanPhone &&
      !isValidPhone(
        cleanPhone,
      )
    ) {
      setPhoneError(
        PHONE_VALIDATION_MESSAGE,
      );

      return;
    }


    setProfileSaving(
      true,
    );


    try {
      await UsersApi.updateOwnProfile({
        fullName:
          cleanName,

        phone:
          cleanPhone,
      });


      await refreshUser();


      setProfileSaved(
        true,
      );
    } catch (
      err
    ) {
      setProfileError(
        err instanceof
          ApiError
          ? err.message
          : 'Could not save your profile.',
      );
    } finally {
      setProfileSaving(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * AVATAR
   * ==========================================================
   */

  function clearSelectedAvatar() {
    if (
      avatarPreview
    ) {
      URL.revokeObjectURL(
        avatarPreview,
      );
    }


    setSelectedAvatar(
      null,
    );

    setAvatarPreview(
      null,
    );


    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        '';
    }
  }


  function handleAvatarSelect(
    event:
      React.ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[
        0
      ];


    event.target.value =
      '';


    if (!file) {
      return;
    }


    setAvatarError('');


    if (
      !file.type.startsWith(
        'image/',
      )
    ) {
      setAvatarError(
        'Please choose an image file.',
      );

      return;
    }


    if (
      file.size >
      MAX_AVATAR_MB *
        1024 *
        1024
    ) {
      setAvatarError(
        `Image must be under ${MAX_AVATAR_MB}MB.`,
      );

      return;
    }


    if (
      avatarPreview
    ) {
      URL.revokeObjectURL(
        avatarPreview,
      );
    }


    const preview =
      URL.createObjectURL(
        file,
      );


    setSelectedAvatar(
      file,
    );

    setAvatarPreview(
      preview,
    );
  }


  async function handleAvatarUpload() {
    if (
      !selectedAvatar
    ) {
      return;
    }


    setAvatarError('');

    setAvatarUploading(
      true,
    );


    try {
      await UsersApi.uploadAvatar(
        selectedAvatar,
      );


      await refreshUser();


      clearSelectedAvatar();
    } catch (
      err
    ) {
      setAvatarError(
        err instanceof
          ApiError
          ? err.message
          : 'Could not upload photo.',
      );
    } finally {
      setAvatarUploading(
        false,
      );
    }
  }


  async function handleRemoveAvatar() {
    setAvatarError('');

    setAvatarUploading(
      true,
    );


    try {
      await UsersApi.removeAvatar();

      await refreshUser();

      clearSelectedAvatar();
    } catch (
      err
    ) {
      setAvatarError(
        err instanceof
          ApiError
          ? err.message
          : 'Could not remove photo.',
      );
    } finally {
      setAvatarUploading(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * PASSWORD
   * ==========================================================
   */

  async function handlePasswordSubmit(
    event:
      React.FormEvent,
  ) {
    event.preventDefault();


    setPasswordError('');
    setPasswordSaved(
      false,
    );


    if (
      !currentPassword
    ) {
      setPasswordError(
        'Enter your current password.',
      );

      return;
    }


    if (
      newPassword.length <
      8
    ) {
      setPasswordError(
        'New password must contain at least 8 characters.',
      );

      return;
    }


    if (
      newPassword ===
      currentPassword
    ) {
      setPasswordError(
        'Your new password must be different from your current password.',
      );

      return;
    }


    if (
      newPassword !==
      confirmPassword
    ) {
      setPasswordError(
        'New passwords do not match.',
      );

      return;
    }


    setPasswordSaving(
      true,
    );


    try {
      await UsersApi.changeOwnPassword({
        currentPassword,
        newPassword,
      });


      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');


      setPasswordSaved(
        true,
      );
    } catch (
      err
    ) {
      setPasswordError(
        err instanceof
          ApiError
          ? err.message
          : 'Could not change your password.',
      );
    } finally {
      setPasswordSaving(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div
      className="
        mx-auto
        max-w-[1200px]
        pb-12
      "
    >
      {/*
       * ======================================================
       * HERO
       * ======================================================
       */}

      <section
        className="
          relative
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          p-6
          sm:p-7
        "
      >
        <div
          className="
            pointer-events-none
            absolute
            -right-20
            -top-20
            h-60
            w-60
            rounded-full
            bg-brand-50
            blur-3xl
          "
        />


        <div
          className="
            relative
            flex
            flex-col
            gap-6
            md:flex-row
            md:items-center
          "
        >
          <div
            className="
              relative
              shrink-0
            "
          >
            {avatarPreview ? (
              <img
                src={
                  avatarPreview
                }
                alt="Avatar preview"
                className="
                  h-24
                  w-24
                  rounded-2xl
                  border
                  border-slate-200
                  object-cover
                  shadow-sm
                "
              />
            ) : (
              <div
                className="
                  overflow-hidden
                  rounded-2xl
                  shadow-sm
                "
              >
                <Avatar
                  name={
                    user.fullName
                  }
                  avatarUrl={
                    user.avatarUrl
                  }
                  size="lg"
                />
              </div>
            )}


            <button
              type="button"
              title="Change photo"
              disabled={
                avatarUploading
              }
              onClick={() =>
                fileInputRef.current?.click()
              }
              className="
                absolute
                -bottom-2
                -right-2
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-xl
                border
                border-slate-200
                bg-white
                text-sm
                font-semibold
                text-slate-600
                shadow-sm
                transition
                hover:border-brand-300
                hover:text-brand-700
                disabled:opacity-50
              "
            >
              ✎
            </button>
          </div>


          <div
            className="
              min-w-0
              flex-1
            "
          >
            <div
              className="
                flex
                flex-wrap
                items-center
                gap-2
              "
            >
              <h1
                className="
                  truncate
                  text-2xl
                  font-semibold
                  tracking-[-0.03em]
                  text-slate-950
                  sm:text-3xl
                "
              >
                {
                  user.fullName
                }
              </h1>


              <span
                className="
                  rounded-full
                  bg-brand-50
                  px-2.5
                  py-1
                  text-[11px]
                  font-semibold
                  text-brand-700
                "
              >
                {
                  user.role.name
                }
              </span>


              <span
                className={`
                  rounded-full
                  px-2.5
                  py-1
                  text-[11px]
                  font-semibold
                  ${
                    user.isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-red-50 text-red-700'
                  }
                `}
              >
                {user.isActive
                  ? 'Active'
                  : 'Inactive'}
              </span>
            </div>


            <p
              className="
                mt-1
                text-sm
                text-slate-500
              "
            >
              {
                user.email
              }
            </p>


            <div
              className="
                mt-4
                flex
                flex-wrap
                gap-x-5
                gap-y-2
                text-xs
                text-slate-500
              "
            >
              <span>
                <strong className="font-medium text-slate-700">
                  Department:
                </strong>{' '}

                {getSettingLabel(
                  department,
                )}
              </span>


              <span>
                <strong className="font-medium text-slate-700">
                  Branch:
                </strong>{' '}

                {getSettingLabel(
                  branch,
                )}
              </span>


              <span>
                <strong className="font-medium text-slate-700">
                  Member since:
                </strong>{' '}

                {formatDate(
                  user.createdAt,
                )}
              </span>
            </div>
          </div>
        </div>


        {/*
         * ====================================================
         * AVATAR PREVIEW ACTIONS
         * ====================================================
         */}

        {selectedAvatar && (
          <div
            className="
              relative
              mt-6
              flex
              flex-col
              gap-3
              rounded-xl
              border
              border-brand-200
              bg-brand-50/40
              p-4
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div>
              <div
                className="
                  text-sm
                  font-semibold
                  text-slate-800
                "
              >
                New profile photo selected
              </div>

              <div
                className="
                  mt-0.5
                  max-w-md
                  truncate
                  text-xs
                  text-slate-500
                "
              >
                {
                  selectedAvatar.name
                }
              </div>
            </div>


            <div
              className="
                flex
                flex-wrap
                gap-2
              "
            >
              <button
                type="button"
                className="btn-secondary"
                disabled={
                  avatarUploading
                }
                onClick={
                  clearSelectedAvatar
                }
              >
                Cancel
              </button>


              <button
                type="button"
                className="btn-primary"
                disabled={
                  avatarUploading
                }
                onClick={
                  handleAvatarUpload
                }
              >
                {avatarUploading
                  ? 'Uploading…'
                  : 'Save photo'}
              </button>
            </div>
          </div>
        )}


        {!selectedAvatar && (
          <div
            className="
              relative
              mt-5
              flex
              flex-wrap
              items-center
              gap-3
            "
          >
            <button
              type="button"
              className="btn-secondary"
              disabled={
                avatarUploading
              }
              onClick={() =>
                fileInputRef.current?.click()
              }
            >
              {avatarUploading
                ? 'Working…'
                : 'Change photo'}
            </button>


            {user.avatarUrl && (
              <button
                type="button"
                disabled={
                  avatarUploading
                }
                onClick={
                  handleRemoveAvatar
                }
                className="
                  text-sm
                  font-medium
                  text-red-600
                  hover:text-red-700
                  disabled:opacity-50
                "
              >
                Remove photo
              </button>
            )}


            <span
              className="
                text-xs
                text-slate-400
              "
            >
              PNG, JPG, WEBP or GIF · Max {MAX_AVATAR_MB}MB
            </span>
          </div>
        )}


        <input
          ref={
            fileInputRef
          }
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={
            handleAvatarSelect
          }
        />


        {avatarError && (
          <div
            className="
              relative
              mt-3
              rounded-xl
              border
              border-red-200
              bg-red-50
              px-4
              py-3
              text-sm
              text-red-700
            "
          >
            {
              avatarError
            }
          </div>
        )}
      </section>


      {/*
       * ======================================================
       * MAIN GRID
       * ======================================================
       */}

      <div
        className="
          mt-5
          grid
          gap-5
          lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]
        "
      >
        {/*
         * ====================================================
         * LEFT
         * ====================================================
         */}

        <div className="space-y-5">
          {/*
           * ==================================================
           * PERSONAL INFORMATION
           * ==================================================
           */}

          <form
            onSubmit={
              handleProfileSubmit
            }
            className="
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-5
              sm:p-6
            "
          >
            <SectionHeader
              eyebrow="Profile"
              title="Personal information"
              description="Keep your name and contact information up to date."
            />


            <div
              className="
                mt-6
                grid
                gap-4
                sm:grid-cols-2
              "
            >
              <div className="sm:col-span-2">
                <label className="label">
                  Full name
                </label>

                <input
                  className="input"
                  value={
                    fullName
                  }
                  maxLength={
                    150
                  }
                  autoComplete="name"
                  onChange={(
                    event,
                  ) => {
                    setFullName(
                      event.target.value,
                    );

                    setProfileSaved(
                      false,
                    );
                  }}
                />
              </div>


              <div>
                <label className="label">
                  Phone
                </label>

                <input
                  className="input"
                  value={
                    phone
                  }
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={
                    12
                  }
                  placeholder="963912345690"
                  onChange={
                    handlePhoneChange
                  }
                />

                {phoneError ? (
                  <p
                    className="
                      mt-1.5
                      text-xs
                      text-red-600
                    "
                  >
                    {
                      phoneError
                    }
                  </p>
                ) : (
                  <p
                    className="
                      mt-1.5
                      text-xs
                      text-slate-400
                    "
                  >
                    12 digits.
                  </p>
                )}
              </div>


              <div>
                <label className="label">
                  Email
                </label>

                <input
                  className="
                    input
                    cursor-not-allowed
                    bg-slate-50
                    text-slate-500
                  "
                  value={
                    user.email
                  }
                  disabled
                />

                <p
                  className="
                    mt-1.5
                    text-xs
                    text-slate-400
                  "
                >
                  Email changes require Admin action.
                </p>
              </div>
            </div>


            {profileError && (
              <div
                className="
                  mt-4
                  rounded-xl
                  border
                  border-red-200
                  bg-red-50
                  px-4
                  py-3
                  text-sm
                  text-red-700
                "
              >
                {
                  profileError
                }
              </div>
            )}


            {profileSaved && (
              <div
                className="
                  mt-4
                  rounded-xl
                  border
                  border-emerald-200
                  bg-emerald-50
                  px-4
                  py-3
                  text-sm
                  text-emerald-700
                "
              >
                Profile changes saved successfully.
              </div>
            )}


            <div
              className="
                mt-6
                flex
                justify-end
              "
            >
              <button
                type="submit"
                className="btn-primary"
                disabled={
                  profileSaving ||
                  !hasProfileChanges
                }
              >
                {profileSaving
                  ? 'Saving…'
                  : 'Save changes'}
              </button>
            </div>
          </form>


          {/*
           * ==================================================
           * SECURITY
           * ==================================================
           */}

          <form
            onSubmit={
              handlePasswordSubmit
            }
            className="
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-5
              sm:p-6
            "
          >
            <SectionHeader
              eyebrow="Security"
              title="Change password"
              description="Use your current password to set a new password for your account."
            />


            <div
              className="
                mt-6
                space-y-4
              "
            >
              <div>
                <label className="label">
                  Current password
                </label>

                <div className="relative">
                  <input
                    type={
                      showCurrentPassword
                        ? 'text'
                        : 'password'
                    }
                    className="input pr-16"
                    value={
                      currentPassword
                    }
                    autoComplete="current-password"
                    onChange={(
                      event,
                    ) => {
                      setCurrentPassword(
                        event.target.value,
                      );

                      setPasswordSaved(
                        false,
                      );
                    }}
                  />

                  <button
                    type="button"
                    className="
                      absolute
                      right-3
                      top-1/2
                      -translate-y-1/2
                      text-xs
                      font-medium
                      text-slate-500
                      hover:text-slate-800
                    "
                    onClick={() =>
                      setShowCurrentPassword(
                        (
                          value,
                        ) =>
                          !value,
                      )
                    }
                  >
                    {showCurrentPassword
                      ? 'Hide'
                      : 'Show'}
                  </button>
                </div>
              </div>


              <div
                className="
                  grid
                  gap-4
                  sm:grid-cols-2
                "
              >
                <div>
                  <label className="label">
                    New password
                  </label>

                  <div className="relative">
                    <input
                      type={
                        showNewPassword
                          ? 'text'
                          : 'password'
                      }
                      className="input pr-16"
                      value={
                        newPassword
                      }
                      minLength={
                        8
                      }
                      autoComplete="new-password"
                      onChange={(
                        event,
                      ) => {
                        setNewPassword(
                          event.target.value,
                        );

                        setPasswordSaved(
                          false,
                        );
                      }}
                    />

                    <button
                      type="button"
                      className="
                        absolute
                        right-3
                        top-1/2
                        -translate-y-1/2
                        text-xs
                        font-medium
                        text-slate-500
                        hover:text-slate-800
                      "
                      onClick={() =>
                        setShowNewPassword(
                          (
                            value,
                          ) =>
                            !value,
                        )
                      }
                    >
                      {showNewPassword
                        ? 'Hide'
                        : 'Show'}
                    </button>
                  </div>

                  <p
                    className="
                      mt-1.5
                      text-xs
                      text-slate-400
                    "
                  >
                    Minimum 8 characters.
                  </p>
                </div>


                <div>
                  <label className="label">
                    Confirm new password
                  </label>

                  <input
                    type={
                      showNewPassword
                        ? 'text'
                        : 'password'
                    }
                    className="input"
                    value={
                      confirmPassword
                    }
                    minLength={
                      8
                    }
                    autoComplete="new-password"
                    onChange={(
                      event,
                    ) => {
                      setConfirmPassword(
                        event.target.value,
                      );

                      setPasswordSaved(
                        false,
                      );
                    }}
                  />
                </div>
              </div>
            </div>


            {passwordError && (
              <div
                className="
                  mt-4
                  rounded-xl
                  border
                  border-red-200
                  bg-red-50
                  px-4
                  py-3
                  text-sm
                  text-red-700
                "
              >
                {
                  passwordError
                }
              </div>
            )}


            {passwordSaved && (
              <div
                className="
                  mt-4
                  rounded-xl
                  border
                  border-emerald-200
                  bg-emerald-50
                  px-4
                  py-3
                  text-sm
                  text-emerald-700
                "
              >
                Password changed successfully.
              </div>
            )}


            <div
              className="
                mt-6
                flex
                justify-end
              "
            >
              <button
                type="submit"
                className="btn-primary"
                disabled={
                  passwordSaving ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                }
              >
                {passwordSaving
                  ? 'Updating…'
                  : 'Change password'}
              </button>
            </div>
          </form>
        </div>


        {/*
         * ====================================================
         * RIGHT
         * ====================================================
         */}

        <div className="space-y-5">
          {/*
           * ==================================================
           * ORGANIZATION
           * ==================================================
           */}

          <section
            className="
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-5
            "
          >
            <SectionHeader
              eyebrow="Organization"
              title="Work information"
              description="Organization details are managed by an Administrator."
            />


            <div
              className="
                mt-5
                space-y-3
              "
            >
              <InfoItem
                label="Role"
                value={
                  user.role.name
                }
              />

              <InfoItem
                label="Department"
                value={getSettingLabel(
                  department,
                )}
              />

              <InfoItem
                label="Branch"
                value={getSettingLabel(
                  branch,
                )}
              />
            </div>


            <div
              className="
                mt-4
                rounded-xl
                bg-slate-50
                px-4
                py-3
                text-xs
                leading-5
                text-slate-500
              "
            >
              Contact an Administrator if your role, department,
              branch or email needs to be changed.
            </div>
          </section>


          {/*
           * ==================================================
           * ACCOUNT
           * ==================================================
           */}

          <section
            className="
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-5
            "
          >
            <SectionHeader
              eyebrow="Account"
              title="Account information"
              description="Basic information about your system account."
            />


            <div
              className="
                mt-5
                space-y-3
              "
            >
              <InfoItem
                label="Status"
                value={
                  <span
                    className={`
                      inline-flex
                      items-center
                      gap-2
                      ${
                        user.isActive
                          ? 'text-emerald-700'
                          : 'text-red-700'
                      }
                    `}
                  >
                    <span
                      className={`
                        h-2
                        w-2
                        rounded-full
                        ${
                          user.isActive
                            ? 'bg-emerald-500'
                            : 'bg-red-500'
                        }
                      `}
                    />

                    {user.isActive
                      ? 'Active'
                      : 'Inactive'}
                  </span>
                }
              />


              <InfoItem
                label="Member since"
                value={formatDate(
                  user.createdAt,
                )}
              />


              {user.updatedAt && (
                <InfoItem
                  label="Last profile update"
                  value={formatDate(
                    user.updatedAt,
                  )}
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}


/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}