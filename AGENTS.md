# Shared Agent Instructions

- Read `docs/AI_HANDOFF.md` and `git status` before editing.
- Never discard another agent's uncommitted work.
- Claim files in the handoff log before a multi-file change.
- Prefer small, focused changes and record validation results.
- Do not place secrets, access tokens, or real user emails in tracked files.
- When working concurrently, use a separate Git worktree and branch.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
