# Bestie Surprise 💗

A private, step-by-step friendship scrapbook built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, **Framer Motion** and **MySQL**.

Your friend enters a secret password, then clicks through animated slides (the "want to see it?" cat, balloons, a photo-printing camera, memories with music, letters and a final note). You manage everything from a private `/admin` page.

## Features

- Password gate for the surprise (signed, HTTP-only cookie).
- Separate admin password for `/admin` (12-hour signed cookie).
- Slides you can reorder, hide, duplicate and edit, plus six colour themes.
- Memories with stories, dates, captions and multiple photos, and background music.
- All data **and uploaded files** live in MySQL, so the app itself is stateless (no disk or object storage needed).
- Tables and default content are created automatically on first start.
- Basic rate limiting on both password forms.

## How it works

| Piece | Where |
| --- | --- |
| Text, slides, settings | MySQL tables `memories`, `memory_photos`, `surprise_settings`, `stages` |
| Photos and music | MySQL table `files` (`LONGBLOB`), served by `/api/files` only to visitors with the password cookie (or the admin) |
| Passwords and secrets | Environment variables only |

Photos are limited to 8 MB each and music to 15 MB. Keeping photos around 1–2 MB keeps the database small and pages fast.

---

## Deploy on Railway (recommended)

### 1. Push to GitHub

```bash
npm install            # creates package-lock.json (commit it)
git add .
git commit -m "Bestie Surprise"
git push
```

Keep the repository **private**. Never commit `.env` files (they are git-ignored).

### 2. Create the Railway project

1. In Railway choose **New Project → Deploy from GitHub repo** and pick this repo. The first deploy may fail until the variables below exist. That is normal.
2. In the same project click **+ New → Database → Add MySQL**. Keep the service name `MySQL` (if you rename it, use the new name in the variable below).

### 3. Add variables to the app service

Open the app service → **Variables** → add:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | `${{MySQL.MYSQL_URL}}` |
| `DB_SSL` | `false` |
| `SITE_PASSWORD` | the password your friend types |
| `ADMIN_PASSWORD` | a different password only you know |
| `SITE_COOKIE_SECRET` | a random 32+ character string (`openssl rand -hex 32`) |

`${{MySQL.MYSQL_URL}}` is a Railway reference: it fills in the database's private connection string automatically, so traffic never leaves Railway's network.

### 4. Get your public URL

App service → **Settings → Networking → Generate Domain**. Open it, then visit `/admin`, sign in and add your memories.

`railway.json` already sets the start command, the `/api/health` health check and the restart policy. Railway detects Next.js and builds it automatically.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | `mysql://USER:PASSWORD@HOST:PORT/DATABASE` (on Railway: `${{MySQL.MYSQL_URL}}`) |
| `SITE_PASSWORD` | yes | Password your friend types to open the surprise |
| `ADMIN_PASSWORD` | yes | Your admin password for `/admin` (use a different one) |
| `SITE_COOKIE_SECRET` | yes | Random 32+ character secret that signs both cookies |
| `DB_SSL` | no | `true` if the database requires TLS (default `false`) |
| `DB_SSL_CA` | no | Provider CA certificate in PEM format |
| `DB_SSL_REJECT_UNAUTHORIZED` | no | Set `false` only as a last resort to skip certificate checks |
| `DB_POOL_SIZE` | no | Max database connections (default `5`) |

If `DATABASE_URL` is missing, the app falls back to Railway's `MYSQL_URL` or `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`. You can also use `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

## Run locally

You need Node.js 18.18+ and MySQL 8 (or MariaDB 10.5+). Quick MySQL with Docker:

```bash
docker run --name bestie-mysql -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=bestie_surprise -e MYSQL_USER=bestie -e MYSQL_PASSWORD=change-me \
  -p 3306:3306 -d mysql:8
```

```bash
npm install
cp .env.example .env.local     # edit the values (on Windows: copy .env.example .env.local)
npm run dev
```

- Surprise: http://localhost:3000 (asks for `SITE_PASSWORD`)
- Admin: http://localhost:3000/admin (asks for `ADMIN_PASSWORD`)

The first request creates the tables and default slides. To create them yourself instead, run `db/schema.sql`.

## Other hosts

Anything that runs Node 18.18+ works (Render, Fly.io, a VPS). Use build command `npm install --include=dev && npm run build`, start command `npm start`, health check `/api/health`, and point `DATABASE_URL` at any MySQL 8 / MariaDB 10.5+ server. Set `DB_SSL=true` (and `DB_SSL_CA` if needed) when the database requires TLS. Make sure the server's `max_allowed_packet` is at least **32M**, because uploads are stored in the database.

## Security notes

- Anyone who knows the surprise password can view the published content, so pick a unique one and share it only with your friend.
- `/admin` is protected by its own password, a signed `HttpOnly`, `SameSite=Strict` cookie and server-side checks on every admin API call. The browser never receives database credentials.
- Photos and music are only served to visitors holding a valid password cookie, or to the signed-in admin.
- Rate limiting is in memory per instance, which is fine for a single Railway service.
- Changing `SITE_COOKIE_SECRET` signs everyone out. Change `SITE_PASSWORD` and redeploy to revoke access.
- Only upload photos your friend is happy for you to share.

## Backups

Everything, including photos and music, is in MySQL, so a database backup is a full backup of the site, for example `mysqldump --single-transaction -u USER -p DATABASE > backup.sql`.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Build fails | Open the deploy logs. Run `npm install` locally and commit `package-lock.json`. |
| "Server database is not available" | Check `DATABASE_URL` (the reference name must match your MySQL service name) and that the MySQL service is running. |
| `Got a packet bigger than 'max_allowed_packet'` | Raise `max_allowed_packet` to 32M or more on the MySQL server. |
| Can't sign in to `/admin` | Make sure `ADMIN_PASSWORD` and `SITE_COOKIE_SECRET` (16+ characters) are set, then redeploy. |
| "Too many attempts" | Wait ten minutes, or redeploy. |
| Music won't play | Use MP3 or M4A, up to 15 MB. |

## Project layout

```text
railway.json                     # Railway start command, health check, restart policy
db/schema.sql                    # optional manual schema (the app creates it automatically)
src/
  middleware.ts                  # sends visitors without the password cookie to /unlock
  app/
    page.tsx                     # the surprise
    unlock/page.tsx              # password page
    admin/page.tsx               # memories + settings dashboard
    admin/stages/page.tsx        # slides, themes, music
    api/gate/                    # surprise password check + logout
    api/memories/route.ts        # published content for the surprise
    api/files/route.ts           # serves photos/music from MySQL
    api/admin/login/route.ts     # admin password check
    api/admin/db/route.ts        # admin data operations (whitelisted tables and columns)
    api/admin/upload/route.ts    # photo and music uploads
    api/health/route.ts          # health check
  components/                    # SurpriseExperience, AdminGate
  lib/db.ts                      # MySQL pool, auto-migration, helpers
  lib/seed.ts                    # default slides and text
```
