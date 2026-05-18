# Gmail Cleaner

A full-stack web app that automates Gmail organization through user-defined rules. Sign in with Google, define rules as Gmail search queries paired with actions (trash, archive, label, mark read), and a daily cron job handles the rest.

**Live demo:** https://gmail-cleaner-puce.vercel.app/

---

## Features

- **Google OAuth** — sign in with your Google account; app requests only the Gmail modify scope it needs
- **Rule engine** — each rule is a Gmail search query + an action; supports trash, archive, mark as read, and label (auto-creates the label if it doesn't exist)
- **Scheduled automation** — Vercel Cron runs rules daily at 6 AM UTC using a stored refresh token, no user interaction required
- **Manual trigger** — run all rules instantly from the dashboard
- **Run history** — every execution logs matched email counts and any errors, per rule

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router) |
| Auth | NextAuth.js v4 + Google OAuth 2.0 |
| Gmail | Google APIs Node.js client (`googleapis`) |
| Storage | Vercel KV (Upstash Redis) |
| Scheduling | Vercel Cron |
| Styling | Tailwind CSS |
| Deployment | Vercel |

## Architecture

```
┌─────────────────────────────────────────────┐
│                   Browser                    │
│  Dashboard → Add/edit rules, Run now button  │
└────────────────────┬────────────────────────┘
                     │ fetch
┌────────────────────▼────────────────────────┐
│              Next.js API Routes              │
│  /api/rules   — CRUD rule definitions        │
│  /api/run     — manual trigger               │
│  /api/cron    — daily cron endpoint          │
│  /api/logs    — run history                  │
└──────┬──────────────────────┬───────────────┘
       │                      │
┌──────▼──────┐     ┌─────────▼──────────────┐
│  Vercel KV  │     │       Gmail API         │
│  Rules JSON │     │  Search → batch action  │
│  Run logs   │     │  (trash/archive/label)  │
│  OAuth token│     └────────────────────────┘
└─────────────┘
```

The rule engine searches Gmail with each query, then applies actions in batches of 50 to stay within API rate limits. The cron job authenticates using a refresh token stored on first sign-in, so it runs unattended.

## Example rules

```
Promotions older than 7 days   →  category:promotions older_than:7d        →  trash
LinkedIn older than 30 days    →  from:linkedin.com older_than:30d         →  archive
Old notifications              →  category:updates older_than:14d          →  archive
Unread for 60+ days            →  is:unread older_than:60d -from:me        →  markRead
Newsletter label               →  subject:unsubscribe older_than:30d       →  label "Newsletters"
```

---

## Setup

### Prerequisites

- Node.js 18+
- A Google Cloud project with Gmail API enabled
- A Vercel account with KV storage

### 1. Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com) → New project → enable **Gmail API**
2. APIs & Services → OAuth consent screen → External → fill in app name + email
3. Credentials → Create OAuth client ID → Web application
4. Add authorized redirect URI: `https://your-app.vercel.app/api/auth/callback/google`
5. Copy the Client ID and Client Secret

### 2. Deploy to Vercel

```bash
git clone https://github.com/YOUR_USERNAME/gmail-cleaner
cd gmail-cleaner
```

Import the repo in Vercel, add these environment variables before deploying:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_SECRET=        # openssl rand -base64 32
NEXTAUTH_URL=           # https://your-app.vercel.app
CRON_SECRET=            # openssl rand -base64 16
```

### 3. Vercel KV

Vercel project → Storage → Create Database → KV → Connect to project. The `KV_*` env vars are added automatically. Redeploy to pick them up.

### 4. Local development

```bash
cp .env.example .env.local
# fill in env vars — use `vercel env pull` to sync KV vars locally
npm install
npm run dev
```

---

## How the cron works

`vercel.json` schedules `GET /api/cron` at `0 6 * * *` (6 AM UTC daily). Vercel sends a `Bearer <CRON_SECRET>` authorization header which the endpoint validates. It then retrieves the stored refresh token, gets a fresh access token from Google, and runs all enabled rules.

To change the schedule, edit the cron expression in [`vercel.json`](vercel.json).
