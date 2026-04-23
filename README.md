# ScholarFlow

**AI-Powered Student Academic Portal**

> Your all-in-one academic platform for university students — manage courses, track grades, organize tasks, study with AI, and connect with classmates.

---

## Product Vision

ScholarFlow is a modern, production-grade SaaS-style student portal that helps university students manage their entire academic life in one beautiful interface. Think Notion meets Duolingo meets a smart academic dashboard.

**Startup pitch:** *"We help university students stop drowning in syllabi, deadlines, and scattered notes — and start focusing on what actually matters: learning."*

---

## Features

| Feature | Status |
|---------|--------|
| Landing Page | ✅ Complete |
| Student Login | ✅ Complete (mock auth) |
| Onboarding Flow | ✅ Complete |
| Main Dashboard | ✅ Complete |
| Course Management | ✅ Complete |
| Syllabus Upload + AI Parser | ✅ UI Complete · AI mocked |
| Task Manager | ✅ Complete |
| Calendar | ✅ Complete |
| Grade Tracker | ✅ Complete |
| AI Assistant | ✅ UI Complete · Responses mocked |
| Notes & Resources Library | ✅ Complete |
| Student Community Chat | ✅ Complete |
| Academic Planner | ✅ Complete |
| Audio Study Mode | ✅ UI Complete · TTS mocked |
| Settings & Profile | ✅ Complete |
| Real Supabase Auth | 🔲 TODO |
| Real AI Integration | 🔲 TODO |
| Real File Storage | 🔲 TODO |
| Push Notifications | 🔲 TODO |
| Mobile App | 🔲 Future |



## Tech Stack

- **Framework:** Next.js 15 (App Router, TypeScript)
- **Styling:** Tailwind CSS v3 + CSS Variables
- **UI Components:** Custom shadcn/ui-style components (Radix UI primitives)
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Charts:** Recharts
- **Database:** Supabase PostgreSQL (schema provided)
- **Auth:** Supabase Auth (configured, mock active for demo)
- **Storage:** Supabase Storage (placeholder)
- **AI:** OpenAI / Anthropic Claude (modular, mock active)
- **Date utilities:** date-fns

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm / yarn / pnpm

### Installation

```bash
# Navigate to project
cd scholarflow

# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo Access

No credentials needed for demo. Visit `/dashboard` directly or:
1. Go to `/login`
2. Click **"Enter Demo Dashboard →"**

Or go to `/onboarding` to experience the new user flow.

---

## Project Structure

```
scholarflow/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout (font, metadata)
│   ├── globals.css                 # Global styles + CSS variables
│   ├── (auth)/
│   │   ├── login/page.tsx          # Student login
│   │   └── onboarding/page.tsx     # Multi-step onboarding
│   └── (dashboard)/
│       ├── layout.tsx              # Dashboard shell (sidebar + topbar)
│       ├── dashboard/page.tsx      # Main dashboard
│       ├── courses/page.tsx        # Course management + syllabus upload
│       ├── tasks/page.tsx          # Smart task manager
│       ├── calendar/page.tsx       # Monthly/weekly calendar
│       ├── grades/page.tsx         # Grade tracker + what-if calculator
│       ├── ai-assistant/page.tsx   # AI chat assistant
│       ├── notes/page.tsx          # Notes & resource library
│       ├── community/page.tsx      # Student chat groups
│       ├── planner/page.tsx        # Academic degree planner
│       ├── audio/page.tsx          # Audio study mode
│       └── settings/page.tsx       # Profile & preferences
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx             # Collapsible dark sidebar
│   │   └── topbar.tsx              # Top navigation bar
│   └── ui/                         # shadcn-style UI primitives
│       ├── button.tsx
│       ├── card.tsx
│       ├── badge.tsx
│       ├── input.tsx, label.tsx, textarea.tsx
│       ├── progress.tsx, skeleton.tsx
│       ├── avatar.tsx, separator.tsx
│       ├── tabs.tsx, dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── select.tsx, switch.tsx
│       ├── scroll-area.tsx, tooltip.tsx
├── lib/
│   ├── types.ts                    # All TypeScript interfaces
│   ├── mock-data.ts                # Demo data (student, courses, tasks, etc.)
│   ├── utils.ts                    # Utility functions (cn, date formatting, etc.)
│   └── supabase.ts                 # Supabase client (placeholder)
└── supabase/
    └── schema.sql                  # Full PostgreSQL schema with RLS
```

---

## Database Schema

See [`supabase/schema.sql`](supabase/schema.sql) for the complete schema including:
- `student_profiles` — extended user profiles
- `courses` — registered courses
- `syllabi` — uploaded course syllabi with AI extraction
- `tasks` — assignments, exams, quizzes
- `grade_categories` + `grade_entries` — weighted grade tracking
- `calendar_events` — deadlines, exams, reminders
- `notes` — personal and shared notes
- `chat_rooms` + `chat_messages` + `room_members` — community chat
- `academic_plans` — degree planning
- `reminders` — scheduled alerts
- `audio_study_items` — TTS-generated study audio

All tables have Row-Level Security (RLS) configured.

---

## What's Mocked vs. Real

### Fully Implemented (UI + Logic)
- Dashboard with live mock data
- Task manager with toggle complete, filtering, sorting
- Grade tracker with charts and what-if calculator
- Calendar with event display
- Community chat (local state)
- Academic planner with requirement tracker
- Notes library with filtering
- Settings with form interactions
- AI assistant (mock responses based on keywords)
- Syllabus upload simulator (multi-step animation)

### Mocked / Placeholder (UI ready, backend TODO)
- Supabase authentication (replace with real Supabase auth)
- AI responses (replace `generateResponse()` with real OpenAI/Claude API call)
- File uploads (connect to Supabase Storage)
- Syllabus AI parsing (connect to document parsing + LLM pipeline)
- Audio TTS generation (connect to ElevenLabs / OpenAI TTS)
- Push notifications (connect to Supabase Edge Functions or Resend)
- Real-time chat (connect to Supabase Realtime)

---

## Connecting Real Services

### Supabase Auth
```typescript
// In lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

### AI Assistant (Anthropic Claude)
```typescript
// In app/api/ai/route.ts
import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic()

export async function POST(req: Request) {
  const { messages } = await req.json()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages,
  })
  return Response.json({ content: response.content[0].text })
}
```

### Syllabus Parsing
Connect the upload flow to a document parsing service (LlamaParse, Unstructured.io, or custom Claude prompt chain).

---

## Future Roadmap

### Phase 2 (Next Release)
- [ ] Real Supabase authentication
- [ ] Live AI assistant (Claude API integration)
- [ ] PDF syllabus parsing pipeline
- [ ] Supabase Realtime community chat
- [ ] Email notifications via Resend
- [ ] Dark mode

### Phase 3
- [ ] Mobile app (React Native / Expo)
- [ ] Google Calendar sync
- [ ] Institutional SSO integration (OAuth with university systems)
- [ ] Audio study mode with real TTS (ElevenLabs / OpenAI)
- [ ] Collaborative notes (live co-editing)
- [ ] Study group scheduling

### Phase 4 (Scale)
- [ ] Multi-university support
- [ ] Course ratings and professor reviews
- [ ] AI-generated personalized study plans
- [ ] Spaced repetition flashcard system
- [ ] API for university LMS integration
- [ ] Marketplace for student resources

---

## Design System

**Colors:**
- Primary: Violet 600 (#6366f1) → Indigo 600 (#4f46e5)
- Success: Emerald 500
- Warning: Amber 500
- Danger: Rose 500
- Info: Sky 500

**Spacing:** 4px base grid, 2xl (16px) corner radius on cards

**Typography:**
- Font: Inter (Google Fonts)
- Headings: font-bold or font-extrabold
- Body: text-slate-600
- Muted: text-slate-400

---

*ScholarFlow · Built for students, by students · Winter 2026*
