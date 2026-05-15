# Gmail Cleaner

Rule-based Gmail automation. Define queries + actions, runs daily via cron.

## Setup

### 1. Google OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → New project
2. Enable the **Gmail API** (APIs & Services → Library)
3. Create OAuth credentials (APIs & Services → Credentials → Create → OAuth client ID → Web application)
4. Add authorized redirect URI: `https://your-app.vercel.app/api/auth/callback/google`
5. Copy Client ID and Client Secret

### 2. Vercel KV

1. Deploy this repo to Vercel
2. In your Vercel project → Storage → Create Database → KV
3. Click "Connect" to link it — this auto-populates the `KV_*` env vars

### 3. Environment variables

Copy `.env.example` to `.env.local` for local dev, and add these to Vercel's project settings:

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_SECRET=          # openssl rand -base64 32
NEXTAUTH_URL=             # https://your-app.vercel.app (or http://localhost:3000 locally)
KV_URL=                   # auto-filled by Vercel KV
KV_REST_API_URL=          # auto-filled
KV_REST_API_TOKEN=        # auto-filled
KV_REST_API_READ_ONLY_TOKEN=  # auto-filled
CRON_SECRET=              # any random string
```

### 4. Deploy

```bash
npm install
npm run dev       # local
vercel deploy     # production
```

### 5. Authorize Gmail access

Visit your deployed app, sign in with Google. This stores your refresh token so the daily cron can run without you being present.

---

## How it works

**Rules** are Gmail search queries paired with an action:

| Action | Effect |
|--------|--------|
| `trash` | Move to Trash |
| `archive` | Remove from Inbox (keeps in All Mail) |
| `markRead` | Mark as read |
| `label` | Apply a Gmail label (creates it if missing) |

**Example queries:**
```
category:promotions older_than:7d
from:linkedin.com older_than:30d
category:updates older_than:14d
subject:unsubscribe older_than:30d
is:unread older_than:60d -from:me
```

**Cron** runs daily at 6 AM UTC (`vercel.json`). Change the schedule there.

**Manual run** — hit "Run now" in the UI anytime to trigger immediately.

---

## Local development

```bash
cp .env.example .env.local
# fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET
# for KV locally, use Vercel's `vc env pull` or a local Upstash Redis instance
npm install
npm run dev
```
