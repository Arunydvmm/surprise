# Surprise4U

A platform where anyone can sign in with Google, pick an occasion, and build a private, animated surprise website. Each surprise gets its own link and password to share. Admins can see and manage everything.

Built with Next.js 14, TypeScript, Tailwind, Framer Motion and MySQL.

## What it does

- **Google-only sign-in.** No passwords for accounts. A new account is created on first sign-in.
- **Surprises.** Each user can make several. Each has a unique link (`/s/<name>`) and its own password. Passwords are stored hashed.
- **Occasions.** 18 starter templates (birthday, anniversary, Diwali, Eid and more) that fill in slides, words, theme and effects.
- **Receivers need no account.** They open the link and type the password.
- **User dashboard.** Create, edit memories and slides, publish or unpublish, change the link or password, duplicate, delete.
- **Admin panel (`/admin`).** Users (block, make admin), all surprises (open, edit, publish, delete), occasions, themes and site settings. Nothing is hard-coded: occasions, themes, limits and the home page text all live in the database.
- **Home page, Privacy and Terms** pages.
- **Limits.** Surprises and storage per user, set in Admin > Settings. Admins are unlimited.

## Set up Google sign-in

1. Open <https://console.cloud.google.com/>, create or pick a project.
2. **APIs & Services > OAuth consent screen**: choose *External*, fill in the app name, support email, and set the privacy policy and terms links to `https://YOUR-DOMAIN/privacy` and `https://YOUR-DOMAIN/terms`. When you are ready for everyone to sign in, press **Publish app** (in "Testing" mode only listed test users can sign in).
3. **APIs & Services > Credentials > Create credentials > OAuth client ID** > *Web application*.
4. Under **Authorized redirect URIs** add:
   - `https://YOUR-DOMAIN/api/auth/google/callback`
   - `http://localhost:3000/api/auth/google/callback` (for local work)
5. Copy the **Client ID** and **Client secret** into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
6. Set `APP_URL` to your public address, for example `https://YOUR-DOMAIN`.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | MySQL connection (on Railway: `${{MySQL.MYSQL_URL}}`) |
| `APP_URL` | yes | Public address, used for the Google redirect |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | yes | Google sign-in |
| `SITE_COOKIE_SECRET` | yes | 32+ random characters (`openssl rand -hex 32`) |
| `ADMIN_EMAILS` | yes | Comma-separated Google emails that are admins |
| `SITE_PASSWORD` | upgrade only | Old friend password, used once to protect the original surprise |
| `TRUSTED_PROXY_HOPS` | optional | Reverse proxies in front of the app (default 1) |
| `CONTACT_EMAIL` | optional | Shown on legal pages (also editable in Admin > Settings) |
| `DB_SSL`, `DB_SSL_CA`, `DB_POOL_SIZE` | optional | MySQL options |

`ADMIN_PASSWORD` is no longer used.

## Upgrading an existing Bestie Surprise site

1. Back up the database.
2. Replace the project files with this version and add the new variables above (keep `SITE_PASSWORD` for the first start).
3. Deploy. On first start the app upgrades the tables automatically and **keeps all your content**:
   - Your memories, photos, music, slides and settings become one surprise called "Bestie Surprise" at `/s/bestie`.
   - Its password is your old `SITE_PASSWORD` (stored hashed), so your friend's password does not change.
   - The old `/unlock` address redirects to it.
   - When you sign in with a Google email listed in `ADMIN_EMAILS`, that surprise becomes yours.
4. After the first successful start you can delete `SITE_PASSWORD` from the variables.

The upgrade is repeatable and safe to run twice. It only adds columns and tables.

## Run locally

```bash
cp .env.example .env.local     # fill in the values
npm install
npm run dev                    # http://localhost:3000
```

The tables are created on first request. Starter occasions, themes and settings are copied in only when those tables are empty, so anything you delete in the admin panel stays deleted.

## Deploy on Railway

1. Add a MySQL service named `MySQL` and a service from this repo.
2. Set the variables above. `DATABASE_URL` = `${{MySQL.MYSQL_URL}}`.
3. Add the Railway domain to the Google redirect URIs and to `APP_URL`.

## Security notes

- Sessions are random tokens kept in the database (only their hash is stored). Signing out or blocking a user ends them right away.
- Every edit endpoint checks that you own the surprise (or are an admin). Photos and music are only served to the owner, admins, and visitors who unlocked that surprise.
- Unlocking one surprise never opens another. Changing a password signs out everyone who used the old one.
- Wrong-password tries are rate limited per visitor and per link. The limiter is stored in MySQL, so it works across several app instances.
- State-changing requests are checked for same-origin, and the Google flow uses state, nonce and PKCE.

## Good next steps

- Move photos and music from MySQL to object storage (Cloudflare R2 or S3) when traffic grows. File access goes through `src/app/api/files/route.ts` and `src/app/api/manage/upload/route.ts`.
- Add a Content-Security-Policy once you are happy with the pages.
- Get the Privacy and Terms text reviewed for your country.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| "Sign-in is not set up" on the login page | Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `SITE_COOKIE_SECRET`, then redeploy. |
| Google says `redirect_uri_mismatch` | The redirect URI in Google Console must exactly equal `APP_URL` + `/api/auth/google/callback`. |
| Only some people can sign in | The Google consent screen is still in *Testing*. Publish it. |
| I am signed in but `/admin` shows "not found" | Your email is not in `ADMIN_EMAILS`. Add it and sign in again. |
| Rate limit blocks everyone | `TRUSTED_PROXY_HOPS` is wrong, so all visitors look like one IP. |
| Check the database | `/api/ready` returns 200 when MySQL is reachable. |
