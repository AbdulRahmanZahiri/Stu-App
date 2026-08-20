# ScholarFlow

ScholarFlow is a Next.js student portal for courses, syllabus imports, deadlines,
grades, notes, calendars, community chat, degree planning, and AI study help.

## Current Stack

- Next.js 16, React 19, TypeScript, Tailwind CSS
- Supabase Auth, PostgreSQL, Storage, Row Level Security, and Realtime
- Groq for syllabus parsing and the AI assistant
- Browser Speech Synthesis for audio study playback

ScholarFlow currently has one feature set with no premium tier. AI and audio
features are available to every signed-in account.

Unauthenticated visitors can explore a local demo. Signed-in users use their own
Supabase-backed data; demo records are never written into an authenticated account.

## Requirements

- Node.js 20.19+, 22.13+, or 24+
- npm
- A Supabase project
- A Groq API key for AI features

Node.js 23 is not supported by the current ESLint toolchain. Use an even-numbered
LTS release such as Node.js 22.

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

GROQ_API_KEY=your-groq-api-key

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Keep `GROQ_API_KEY` server-only. Never prefix it with `NEXT_PUBLIC_`.

## Database Setup

Run the following files in the Supabase SQL Editor, in order:

1. `supabase/schema.sql` only when creating a brand-new database.
2. `supabase/migrations/202608120001_backend_integration.sql` for new and existing databases.

The integration migration adds current profile fields, RLS policies, profile
provisioning, private file buckets, Realtime chat, planner persistence, account
deletion, and the transactional syllabus-import RPC. Legacy billing-compatible
columns remain dormant so a future billing implementation can be added safely.

For an administrator, replace the placeholder email in
`supabase/admin_setup.sql` and run that statement after the integration migration.

See `supabase/README.md` for the verification checklist.

## Syllabus Import

All users can import PDF, DOCX, TXT, or Markdown files, or paste text. ScholarFlow
uses a deterministic local parser in demo mode and Groq-enhanced extraction for
all authenticated accounts. The result is always previewed before saving.
Signed-in imports upload the source privately and save the syllabus, grading
categories, and generated tasks in one database transaction; demo imports remain
in browser storage.

Scanned image-only PDFs need OCR before import. Files are limited to 10 MB.

## Validation

```bash
npm run lint
npx tsc --noEmit
npm run build
npm audit --omit=dev
```

## AI-Agent Coordination

Codex and Claude Code cannot directly message each other. This repository uses
`AGENTS.md`, `CLAUDE.md`, and `docs/AI_HANDOFF.md` as a shared coordination layer.
For simultaneous work, give each agent a separate Git worktree and branch; merge
small reviewed commits rather than allowing both agents to edit the same files.

## Main Directories

- `app/` — pages, layouts, and server route handlers
- `components/` — reusable UI and layout components
- `lib/` — auth, persistence, planner, and shared types
- `hooks/` — browser notification behavior
- `supabase/` — base schema, integration migration, and setup notes
- `docs/AI_HANDOFF.md` — shared agent status and handoff log
