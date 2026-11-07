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
firebase deploy --only hosting
```

---

# Environment Variables

None required. The app is fully client-side: all learning data lives in
`src/data/*.json` and user progress is stored in the browser's `localStorage`
(export/import a backup file from the **Tiến độ** tab). Firebase is used only
for static hosting — there is no Firebase SDK or API key in the app.

`.env` files are still ignored by git if you add any later.

---

# Lint

```bash
npm run lint
```

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
- Firebase Hosting (static files only)

# Credits

- Kanji stroke order data: [KanjiVG](https://kanjivg.tagaini.net) by Ulrich Apel,
  licensed under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
  The derived file `src/data/kanji-strokes.json` is distributed under the same license.
