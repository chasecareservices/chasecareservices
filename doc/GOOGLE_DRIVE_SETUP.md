# Google Drive for documents: one-time setup

Client and care worker documents are kept in the company Google Drive. The website
uses Google's `drive.file` permission, so it can only see the files and folders it
created itself, nothing else in the Drive.

Do steps 1 to 5 once, signed in as the **company Google account** whose Drive should
hold the documents.

## 1. Create a Google Cloud project

1. Go to <https://console.cloud.google.com>.
2. Project picker (top) → **New project** → name it `Chase Care Website` → **Create**.

## 2. Turn on the Drive API

**APIs & Services → Library** → search **Google Drive API** → **Enable**.

## 3. Set up the sign-in screen

1. **Google Auth Platform** (or "OAuth consent screen") → **Get started**.
2. App name `Chase Care Website`, support email: the company email. Audience: **External**.
   Under **Branding → Authorised domains**, add `chasecareservices.org`.
3. **Data access → Add or remove scopes**: tick only `.../auth/drive.file`.
4. **Audience → Publish app**. (In "Testing", Google disconnects the website every 7 days.)

## 4. Create the website's keys

1. **Clients → Create client → Web application**.
2. **Authorised redirect URIs**: add
   `https://www.chasecareservices.org/api/google/callback`
3. **Create**, then copy the **Client ID** and **Client secret**.

## 5. Add them to Vercel

Vercel → project → **Settings → Environment Variables**:

| Key | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | the Client ID |
| `GOOGLE_CLIENT_SECRET` | the Client secret |

Tick Production and Preview, **Save**, then **Deployments → ⋯ → Redeploy**.
Never paste these values in chat or email.

## 6. Connect

The owner signs in to the dashboard → **Site settings → Documents (Google Drive)** →
**Connect Google Drive**, and signs in with the company account. If Google says
"Google hasn't verified this app", choose **Advanced → Go to Chase Care Website**
(it is your own app). The website creates:

```text
Chase Care Documents/
├── Clients/<name>/
└── Care workers/<name>/
```

## Good to know

- The Google sign-in is stored encrypted; the key is derived from
  `GOOGLE_CLIENT_SECRET`. Changing that secret means connecting again.
- Files open through the dashboard, which checks each person's permission. Anyone who
  can open the company Drive directly can also see them, so keep that account's
  password and 2-step verification secure.
- Removing a document moves it to the Drive bin (kept for 30 days).
- Care workers can send files for their clients but can never open documents.
