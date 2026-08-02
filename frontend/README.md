# Task & Project Manager — Frontend

A simple Next.js (App Router) frontend for the NestJS backend. Plain `fetch`
calls, React state, no extra data-fetching or state-management libraries —
kept intentionally minimal.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS for styling
- No Redux/Zustand/React Query — a small `api()` wrapper plus `useState`/`useEffect` throughout

## Structure

```
src/
├── app/
│   ├── layout.tsx           # wraps everything in <Shell>
│   ├── page.tsx             # redirects to /dashboard or /login
│   ├── login/page.tsx
│   ├── dashboard/page.tsx
│   ├── tasks/page.tsx        # list + status filter
│   ├── tasks/new/page.tsx
│   ├── tasks/[id]/page.tsx   # detail: status, assignment, comments, ratings, attachments
│   ├── projects/page.tsx
│   ├── branches/page.tsx     # Admin — branches + departments
│   ├── users/page.tsx        # Admin — user management
│   ├── notifications/page.tsx
│   ├── audit-logs/page.tsx   # Admin
│   └── profile/page.tsx
├── components/
│   ├── Shell.tsx             # Navbar + AuthProvider wrapper
│   ├── Navbar.tsx
│   ├── ProtectedRoute.tsx    # redirects to /login if signed out; adminOnly flag
│   └── StatusBadge.tsx
└── lib/
    ├── api.ts                # one fetch wrapper: adds JWT, unwraps { data }, throws ApiError
    ├── endpoints.ts           # typed helper per resource (AuthApi, TasksApi, UsersApi, …)
    ├── auth-context.tsx       # current user, login(), logout()
    └── types.ts               # shapes matching the backend DTOs
```

## Getting started

```bash
npm install
cp .env.local.example .env.local   # point at your running backend
npm run dev
```

Sign in with the seeded Admin account from the backend (`admin@example.com` /
`ChangeMe123!`, or whatever you configured in the backend's seed).

## How auth works here

The backend issues a short-lived JWT plus an HttpOnly refresh cookie. For
simplicity, this frontend stores only the access token (in `localStorage`)
and does not implement silent refresh — when it expires, API calls will
401 and the user is redirected to `/login`. If you need long sessions,
the natural next step is a `/auth/refresh` call in `api()`'s 401 handler;
it's a small addition once the basic flow is working end to end.

## Notes

- Every page that needs the signed-in user wraps its content in
  `<ProtectedRoute>` (add `adminOnly` for Admin-only pages).
- All data-fetching goes through `lib/endpoints.ts` — if the backend adds an
  endpoint, add one function there and use it from any page.
- Styling uses a handful of reusable classes (`.btn-primary`, `.card`,
  `.input`, `.badge`, …) defined once in `globals.css` so page markup stays short.
