# What changed (Bestie Surprise 2.0 to Surprise4U 3.0)

## Fixed
- `src/middleware.ts`: the old cookie check imported its key with `["sign"]` but called `verify`, so every valid cookie was rejected and you were sent back to the unlock page. That check no longer exists: sessions are verified on the server.

## New files
- Auth: `src/lib/auth.ts`, `google.ts`, `sign.ts`, `password.ts`, `unlock.ts`, `admin-guard.ts`
- Data: `src/lib/catalog.ts` (themes, occasions, settings), `surprises.ts`
- Routes: `api/auth/google`, `api/auth/google/callback`, `api/auth/logout`, `api/surprises` (+ `[id]`, `[id]/duplicate`), `api/s/[slug]/unlock|lock|content`, `api/manage/db`, `api/manage/upload`, `api/admin/actions|catalog/[kind]|settings`
- Pages: `/` (home), `/login`, `/dashboard`, `/dashboard/new`, `/dashboard/s/[id]` (+ `stages`, `share`), `/s/[slug]`, `/admin` (+ `users`, `surprises`, `occasions`, `themes`, `settings`), `/privacy`, `/terms`, `robots.txt`
- Components: `AppHeader`, `SignOutButton`, `GoogleButton`, `UnlockForm`, `DashboardClient`, `NewSurpriseForm`, `SharePanel`, `MemoryManager`, `StagesEditor`, `admin/*`

## Changed files
- `src/lib/db.ts` (new schema and automatic, repeatable upgrade), `seed.ts` (starter occasions, themes, settings), `themes.ts`, `stages.ts`, `rate-limit.ts` (MySQL-backed, async), `request-security.ts` (stricter origin check), `admin-client.ts`
- `src/app/layout.tsx`, `src/middleware.ts`, `src/components/SurpriseExperience.tsx` (per-surprise content, occasion effects), `next.config.mjs`, `package.json`, `.env.example`, `README.md`
- `src/app/api/files/route.ts` (access is checked per surprise)

## Removed
- `/unlock` page (now only redirects to the original surprise), `/api/gate/*`, `/api/memories`, `/api/admin/login|db|upload`, `src/lib/admin-gate.ts`, `site-gate.ts`, `components/AdminGate.tsx`, the old `/admin` and `/admin/stages` pages (they became `MemoryManager` and `StagesEditor`), `db/schema.sql` (tables are created and upgraded by the app).
