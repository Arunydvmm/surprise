# Bestie Surprise 💗

A private, step-by-step friendship scrapbook built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, **Framer Motion** and **MySQL**.

Your friend enters a secret password, then clicks through animated slides (the "want to see it?" cat, balloons, a photo-printing camera, memories with music, letters, and a final note). You manage everything from a private `/admin` page.

## Features

- Password gate for the surprise (signed, HTTP-only cookie).
- Separate admin password for `/admin` (12-hour signed cookie).
- Slides you can reorder, hide, duplicate and edit, plus six colour themes.
- Memories with stories, dates, captions and multiple photos.
- Background music for the memories slide.
- All data **and uploaded files** live in MySQL, so the app itself is stateless and runs on Render's free tier with no disk.
- Tables and default content are created automatically on first start.
- Basic rate limiting on both password forms.

## How it works

| Piece | Where |
| --- | --- |
| Text content, slides, settings | MySQL tables `memories`, `memory_photos`, `surprise_settings`, `stages` |
| Photos and music | MySQL table `files` (`LONGBLOB`), served by `/api/files` only to visitors with the password cookie (or the admin) |
| Passwords and secrets | Environment variables only |

Photos are limited to 8 MB each and music to 15 MB. Because files are stored in the database, keeping photos reasonably small (a phone photo resized to ~1–2 MB is plenty) keeps the database light and pages fast.

---

## 1. Run locally

You need Node.js 18.18+ and a MySQL 8 (or MariaDB 10.5+) server. The quickest way to get MySQL is Docker:

```bash
docker run --name bestie-mysql -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=bestie_surprise -e MYSQL_USER=bestie -e MYSQL_PASSWORD=change-me \
  -p 3306:3306 -d mysql:8
```

Then:

```bash
npm install
cp .env.example .env.local     # edit the values
npm run dev
```

- Surprise: http://localhost:3000 (asks for `SITE_PASSWORD`)
- Admin: http://localhost:3000/admin (asks for `ADMIN_PASSWORD`)

The first request creates the tables and the default slides automatically. If you would rather create them yourself, run `db/schema.sql`.

## 2. Deploy to Render

Render does not offer managed MySQL, so you need a MySQL database from somewhere else first.

### a) Get a MySQL database

Use any MySQL 8 / MariaDB 10.5+ host that Render can reach over the internet, for example a managed MySQL service (Aiven, Railway, DigitalOcean, AWS RDS, etc.) or your own VPS. Free tiers change often, so check the current terms. Create an empty database and a user, then build the connection string:

```
mysql://USER:PASSWORD@HOST:PORT/DATABASE
```

Notes:

- Most hosted providers require TLS, so keep `DB_SSL=true`. If the provider gives you a CA certificate, put its contents in `DB_SSL_CA` (use `\n` for line breaks).
- URL-encode special characters in the password (`@` becomes `%40`, and so on).
- Because photos and music are stored in the database, make sure `max_allowed_packet` is at least **32M**. MySQL 8 defaults to 64M; some MariaDB setups default to 16M. If uploads fail with a "max_allowed_packet" message, raise it in your provider's settings.
- If the provider has an IP allow-list, allow Render's outbound addresses (shown in your service's **Connect** menu).

### b) Deploy

1. Push this folder to a **private** GitHub repository.
2. In Render choose **New + → Blueprint**, select the repo. `render.yaml` is picked up automatically.
   (Or create a **Web Service** manually: build `npm install --include=dev && npm run build`, start `npm start`, health check `/api/health`.)
3. Fill in the environment variables Render asks for (table below). `SITE_COOKIE_SECRET` is generated for you.
4. Deploy, then open the URL, visit `/admin`, sign in and add your memories.

Render's free web services sleep after a period of inactivity, so the first visit can take around a minute. Use a paid instance if you want it always awake for the big reveal.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | `mysql://USER:PASSWORD@HOST:PORT/DATABASE` |
| `DB_SSL` | no | `true` when the provider requires TLS (default `false`) |
| `DB_SSL_CA` | no | Provider CA certificate in PEM format |
| `DB_SSL_REJECT_UNAUTHORIZED` | no | Set `false` only as a last resort to skip certificate checks |
| `DB_POOL_SIZE` | no | Max database connections (default `5`) |
| `SITE_PASSWORD` | yes | Password your friend types to open the surprise |
| `ADMIN_PASSWORD` | yes | Your admin password for `/admin` (use a different one) |
| `SITE_COOKIE_SECRET` | yes | Random 32+ character secret that signs both cookies (`openssl rand -hex 32`) |

You can also use `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` and `DB_NAME` instead of `DATABASE_URL`.

## Security notes

- Anyone who knows the surprise password can view the published content, so pick something unique and only share it with your friend.
- The admin page is protected by its own password, a signed `HttpOnly`, `SameSite=Strict` cookie and server-side checks on every admin API call. Database access is only possible through server routes; the browser never receives database credentials.
- Photos and music are only served to visitors holding a valid password cookie, or to the signed-in admin.
- Rate limiting is kept in memory per server instance, which is fine for a single Render service.
- Changing `SITE_COOKIE_SECRET` signs everyone out. Change `SITE_PASSWORD` and redeploy if you want to revoke access.
- Only upload photos your friend is happy for you to share.

## Backups

Everything (including photos and music) is in your MySQL database, so a regular backup of it, for example `mysqldump --single-transaction -u USER -p DATABASE > backup.sql`, is a full backup of the site. Many hosted providers also offer automatic backups.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| "Server database is not available" | Check `DATABASE_URL`, `DB_SSL`, and any IP allow-list on your MySQL host. Look at the Render logs for the exact error. |
| `Got a packet bigger than 'max_allowed_packet'` | Raise `max_allowed_packet` to 32M or more on the MySQL server. |
| Can't sign in to `/admin` | Make sure `ADMIN_PASSWORD` and `SITE_COOKIE_SECRET` (16+ characters) are set, then redeploy. |
| Too many attempts message | Wait ten minutes, or restart the service. |
| Music won't play | Use MP3 or M4A, up to 15 MB. |

## Project layout

```text
db/schema.sql                    # optional manual schema (the app creates it automatically)
render.yaml                      # Render blueprint
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
    api/health/route.ts          # Render health check
  components/                    # SurpriseExperience, AdminGate
  lib/db.ts                      # MySQL pool, auto-migration, helpers
  lib/seed.ts                    # default slides and text
```

## Moving from the old Supabase version

Content is not migrated automatically. Sign in at `/admin`, re-add your memories and re-upload photos and music. The default slides are recreated for you; adjust them under **Edit stages**.
