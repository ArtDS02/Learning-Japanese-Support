# Website UI/UX & Learning Experience Optimization

## Objective

This is an online **JLPT N5 Japanese learning** single-page app (React + Vite, dark theme, 9 tabbed sections).

The task is **not only to improve the visual design**, but to optimize the overall **Learning UX** so users can:

- Learn comfortably and read content effortlessly.
- Navigate intuitively and always know where they are / what's next.
- Complete lessons efficiently and stay focused.
- Resume learning without losing progress.
- Stay motivated and retain more.

Approach the app as a **Senior UI/UX Designer specializing in educational platforms**. Where a layout, interaction, or learning flow is sub-optimal, redesign it while **preserving existing functionality and business logic**.

---

## Current State Snapshot (read before proposing anything)

The app is more mature than a blank slate. **Do not rebuild what already works** — focus effort on the gaps.

### Already implemented (keep, refine — do NOT redo from scratch)

- **Spaced Repetition (SRS)** — Leitner engine (`src/lib/srs.js`), box 0–5, per-deck localStorage. Used by **Vocabulary** and **Kanji**.
- **Streak + daily activity** — `src/lib/progress.js`, 14-day activity chart on the Progress tab.
- **Flashcard study mode** with flip animation, rating buttons (Quên / Mơ hồ / Nhớ), SRS-vs-random mode, session summary — in Vocabulary & Kanji.
- **Bookmark / star**, **hide-meaning** toggle, search + category filters — in Vocabulary & Kanji.
- **Keyboard navigation** — in the interactive study modes (flashcards, Kanji modal, Kana quiz/fill).
- **Kanji stroke-order animation** (SVG path player).
- **Progress dashboard** — mastery breakdown, due-today, streak, best streak.
- Clean **data architecture** — content in `src/data/*.json` (580 vocab, 103 kanji, grammar, 6 mock exams ~450 Q, kana, numbers).

### Static / no interactivity yet (main opportunity)

- **Numbers, Grammar, Tips, StudyPlan** — read-only, no practice, no progress, despite being highly drillable.
- **Kana** — has in-session quiz but **no SRS persistence** (mastery resets each session).
- **Exercises (mock exams)** — answers & scores live in component state only; **a reload wipes everything**, results never feed Progress or SRS.

---

## Priority Roadmap (do in this order)

| Wave | Theme | Items |
|------|-------|-------|
| **1 — Foundation** | Fix the unit system + theming | vw → rem/clamp refactor (§1); theme tokens + light/dark toggle (§8) |
| **2 — Don't lose data / consistency** | Persistence & unified progress | Persist Exercises (§2); unify Kanji progress (§3); surface all decks in Progress (§4) |
| **3 — Expand learning** | Practice everywhere + continuity | Quiz/flashcards for Numbers & Grammar (§5); "Continue learning" + global search (§6); audio pronunciation (§7) |
| **4 — Polish** | Structure & finish states | Chunk long grids / sticky mini-nav (§9); complete hover/focus/disabled states (§10); PWA/offline (§11) |

---

## §1 — CRITICAL FOUNDATION: replace `vw` units (Wave 1, complexity: High)

**Current issue.** Almost every `font-size`, `padding`, `radius`, and dimension across all 10 CSS files is expressed in `vw` (e.g. `body { font-size: 0.7813vw }`, `--container: 61.4583vw`). The desktop design was authored at **1920px**.

**Why it hurts.** Because `vw` scales type with viewport width, text shrinks on smaller screens:

| Screen | body text (`0.7813vw`) |
|--------|------------------------|
| 1920px | ~15px ✅ |
| 1440px | ~11px ❌ |
| 1280px | ~10px ❌ |

- Violates this brief's own "never use text that is too small" and "test at 1024/1440".
- `vw` **ignores the user's browser zoom / font-size preference** → fails WCAG 1.4.4 (Resize Text).
- Forces per-breakpoint manual patching (already happening for mobile).

**Solution.**
- Typography & spacing → `rem` (root `16px`). Use `clamp(min, preferred, max)` only where fluid scaling is genuinely wanted (e.g. hero titles).
- Container width → `max-width` in `rem`/`ch`, not `vw`.
- Media-query breakpoints → `px`.
- Preserve the existing visual proportions at ~1920px as the reference; the goal is that 1280–1440px becomes comfortably readable, not that the design changes.

**Benefit.** Legible at every width, respects zoom/accessibility, removes most per-breakpoint hacks. This unblocks nearly every "typography / spacing / responsive" requirement below.

---

## §2 — Persist mock-exam state (Wave 2, Medium)

**Issue.** `ExercisesTab` keeps answers, revealed state, timers, and scores in React state only; reload/accidental F5 loses everything.
**Solution.** Persist per-exam progress to localStorage; add a "Continue this exam" affordance; feed completed-exam results into Progress.
**Benefit.** No lost work → users attempt full mock tests without fear; exam activity becomes visible in the dashboard.

---

## §3 — Unify Kanji progress (Wave 2, Low–Medium)

**Issue.** Kanji tracks progress two ways — a manual `kanji_learned` set **and** SRS box status — which can disagree ("is this kanji learned?").
**Solution.** Make SRS mastery the single source of truth; derive the "learned" badge from SRS. Also let Kanji flashcards use the full 3-tier rating (currently only remember/forget, losing the "vague" tier).
**Benefit.** One coherent progress model; less confusion; richer scheduling.

---

## §4 — Surface every deck in Progress (Wave 2, Medium)

**Issue.** The Progress dashboard only reflects Vocabulary + Kanji SRS. Kana, Grammar, Numbers, and Exercises contribute nothing to mastery (Kana/exercises only bump the streak).
**Solution.** Represent all learning surfaces in the dashboard once they have persistence (depends on §2, §5).
**Benefit.** Users see the full picture of what they've studied → stronger motivation, matches "never lose track of progress".

---

## §5 — Add practice to static tabs (Wave 3, Medium–High)

**Issue.** Numbers, Grammar (and Kana long-term) are reference-only, yet counters/particles/number-readings are exactly the drillable content that benefits from repetition.
**Solution.** Reuse the existing SRS engine + flashcard/quiz components to add practice modes to these tabs. Persist Kana mastery per character.
**Benefit.** Every content type becomes learnable, not just readable → real retention.

---

## §6 — Continuity & findability (Wave 3, Medium)

**Issue.** No cross-tab "resume where you stopped"; search exists only inside some tabs, not globally. On open, the user can't tell where to continue.
**Solution.**
- A persistent **"Continue learning"** entry point (header or a home/dashboard) that jumps to the last deck + due cards.
- A **global search** across vocab/kanji/grammar.
- Clear "what's next" signposting between lessons.
**Benefit.** Fulfils the brief's "resume where you stopped" and "next lesson is obvious".

---

## §7 — Audio pronunciation (Wave 3, Medium) — *new area, missing today*

**Issue.** A language-learning app has no listening. Vocabulary, kana, and example sentences have no audio.
**Solution.** Add pronunciation via Web Speech API (`ja-JP` TTS) as a baseline, or bundled audio where quality matters; a speaker button on cards/flashcards.
**Benefit.** Enables listening practice; essential for a Japanese app.

---

## §8 — Theming: light/dark toggle + tokens (Wave 1, Medium) — *new area*

**Issue.** The palette is hard-coded dark only; no user choice.
**Solution.** Move colors to semantic tokens switched by `data-theme`; add a persisted light/dark toggle respecting `prefers-color-scheme`.
**Benefit.** User comfort + accessibility; makes future restyling trivial.

---

## §9 — Structure long pages (Wave 4, Medium)

**Issue.** Browse grids (580 vocab, 103 kanji) and static tabs are single long scrolls — against "avoid extremely long pages".
**Solution.** Chunk into lessons/groups, add a sticky mini table-of-contents / section nav within a tab; consider pagination or virtualization for the largest grids.
**Benefit.** Lower cognitive load, easier scanning, faster orientation.

---

## §10 — Complete component states (Wave 4, Medium)

Ensure every reusable component (buttons, cards, nav, filters, inputs, tabs, dialogs, badges) has consistent **hover / active / focus-visible / disabled** states. Touch targets **≥ 44×44px** on mobile (verify after the rem refactor, since current sizes are in vw). Clear focus indicators throughout.

---

## §11 — Loading / empty / error states + PWA (Wave 4, Low–Medium) — *new area*

Add graceful **loading**, **empty**, and **error** states. Consider **offline/PWA** support (installable, cached content) — highly valuable for studying on mobile without connection.

---

## Cross-cutting UX principles (apply throughout)

**Responsive** — no horizontal scroll, overflow, overlap, distortion, or clipping at 375 / 390 / 430 / 768 / 1024 / 1440 / 1920px. Desktop uses width effectively without hurting scanability; mobile favors simplicity, big touch areas, one-handed use.

**Typography** — readable first; adequate size, weight, line-height, paragraph spacing; headings clearly above body.

**Spacing** — consistent padding/margins; comfortable section rhythm; neither crowded nor sparse.

**Visual hierarchy & focus** — instantly distinguish primary content, CTAs, navigation, and progress. One primary objective per screen; reduce simultaneous elements; keep learning content the focus.

**Japanese-specific** — verify vocabulary, kanji, grammar, listening, reading, quiz, and mock tests can each be studied efficiently; prefer a layout specialized to each type over a generic one; ensure correct Japanese font rendering (consider furigana where helpful).

---

## Constraints — do NOT

- Change business logic, remove features without justification, break workflows, or modify backend behavior.
- Introduce unnecessary complexity or non-reusable components.

Focus on **layout, UI, UX, learning efficiency, readability, accessibility**, and **responsive behavior**, keeping the code clean, consistent with existing style, and maintainable.

---

## Output format for each proposed change

1. Current issue → 2. Why it hurts usability/learning → 3. Proposed solution → 4. Expected benefit → 5. Complexity (Low / Medium / High).

The goal is a **professional learning platform** that maximizes usability, readability, engagement, and learning effectiveness on both desktop and mobile — not merely an attractive page.
