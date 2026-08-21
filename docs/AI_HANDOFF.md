# AI Handoff

This file coordinates Codex and Claude Code through the repository. It is not a
live chat or a lock service.

## Working Agreement

1. Use one Git worktree and branch per agent.
2. Before editing, add a short entry under **Active Work** with the files owned.
3. Keep commits small and share commit hashes through **Completed Work**.
4. Remove the active entry after handoff or merge.
5. If both agents need the same file, sequence the work instead of editing it concurrently.

## Active Work

- 2026-08-21 — Codex is rebuilding the Academic Planner with source-backed
  Memorial program data and constraint-based scheduling. Owned files:
  `lib/planner-types.ts`, `lib/planner-data.ts`, `lib/planner-engine.ts`,
  `lib/planner-store.tsx`, and `app/(dashboard)/planner/page.tsx`.

## Completed Work

- 2026-08-12 — Codex repaired Supabase persistence, syllabus import, auth/profile
  settings, calendar, grades, planner, notifications, realtime chat, Stripe
  subscriptions, API authorization, Next.js 16 migration, and project validation.
- 2026-08-12 — Codex removed bundled mobile secrets, upgraded the Expo preview to
  SDK 57, aligned dependencies, and validated its TypeScript and web bundle.
- 2026-08-12 — Codex repaired demo/free syllabus imports with a deterministic
  fallback parser, unauthenticated PDF/DOCX extraction, native PDF package
  externalization, same-file retries, and browser-tested local persistence.
- 2026-08-12 — Codex removed the premium tier and Stripe runtime, unlocked
  AI/audio/syllabus features for every account, redirected the old pricing page,
  and browser-tested the free product surfaces without hydration errors.

## Validation Baseline

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm audit --omit=dev`
