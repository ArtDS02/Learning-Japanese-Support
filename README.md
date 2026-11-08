# Project Setup

## Install dependencies

```bash
npm install
```

---

# Run Project (Development)

Start local development server:

```bash
npm run dev
```

Default local URL:

```txt
http://localhost:5173
```

---

# Build Project

Build production files:

```bash
npm run build
```

Output folder:

```txt
dist/
```

---

# Firebase Hosting Deployment

## Login Firebase

```bash
firebase login
```

---

## Check current Firebase project

```bash
firebase use
```

---

## Build and Deploy

```bash
npm run build
firebase deploy --only firestore:rules,hosting
```

`firestore:rules` deploys [firestore.rules](firestore.rules) (each user can only
read/write `users/{uid}/kv/*`). `firebase.json` is gitignored, so on a new machine
add `"firestore": { "rules": "firestore.rules" }` to it before deploying.

---

# Environment Variables

Optional — only for **account sign-in & progress sync** (Google sign-in + Firestore).
Copy [.env.example](.env.example) to `.env.local` and fill in the web app config
from Firebase Console → Project settings → Your apps.

| Variable | Meaning |
|---|---|
| `VITE_FIREBASE_API_KEY` | Web API key (not a secret — security lives in `firestore.rules`) |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain; use the hosting domain (`<project>.web.app`) so sign-in is same-origin |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_APP_ID` | Web app ID |
| `VITE_USE_EMULATOR` | Dev only: `1` connects to the local Firebase Emulator |

Without these the account button is hidden and the app runs fully offline as
before: progress stays in `localStorage` (export/import a backup file from the
**Tiến độ** tab). Signed-out users never download the Firebase SDK — it lives in
a lazy chunk loaded only on sign-in. Design: [docs/plan-dang-nhap-dong-bo.md](docs/plan-dang-nhap-dong-bo.md).

---

# Lint & Test

```bash
npm run lint
```

```bash
npm test
```

`npm test` runs the sync-core unit tests (`node --test`, no extra dependencies).

## Testing sync locally with the Firebase Emulator

Needs Java 21+. Put `VITE_USE_EMULATOR=1` in `.env.development.local`, then:

```bash
npm run emulators
```

Open the dev server on `127.0.0.1` (not `localhost` — the emulator's sign-in page
at `127.0.0.1:9099` must be same-site, or the browser partitions its storage).
Two dev servers on different ports act as two devices. Browsers that can't open
popups: set `localStorage.dev_auth_redirect = "1"` to use the redirect flow.

---

# Git Ignore

Ignored files:

```txt
node_modules/
dist/
.env
.env.*
.firebase/
```

---

# Tech Stack

- Vite
- React 19
- Web Speech API (Japanese text-to-speech, no audio files)
- Service worker (offline / installable PWA)
- Firebase Hosting
- Firebase Auth (Google) + Cloud Firestore lite — optional progress sync, local-first

# Credits

- Kanji stroke order data: [KanjiVG](https://kanjivg.tagaini.net) by Ulrich Apel,
  licensed under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
  The derived file `src/data/kanji-strokes.json` is distributed under the same license.
