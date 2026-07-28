# The Case Board 🔴📌

A detective-board themed, interactive to-do dashboard. Tasks are index cards pinned to a corkboard — drag them around, string red thread between related tasks (like a conspiracy wall), track subtasks as "clues," and stay on top of due dates with one-click Google Calendar links.

Built with **React**, **Vite**, and **Tailwind CSS**.

![status](https://img.shields.io/badge/status-active-brightgreen) ![stack](https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20Tailwind-blue)

---

## What this is

A single-page task dashboard styled like a crime-investigation corkboard:

- Tasks = **pinned evidence cards** you can drag anywhere on the board.
- Related tasks can be **connected with a red string** (click "Connect leads," then click two cards).
- Each card can carry a **priority** (Urgent / Active / Cold case), a **due date**, and a **checklist of subtasks** ("clues").
- Closing a task stamps it **CLOSED** in red ink.
- Tasks left untouched for a few days visually **fade and go "dusty"** — a nudge to revisit them.
- A **Captain's Briefing** modal greets you on load with what's overdue, due today, and how many threads are open.
- Your **rank** (Rookie → Detective → Senior Detective → Chief Inspector) climbs as you close more cases.
- A **List view** toggle switches from the corkboard to a sortable, filterable table — better for scanning many tasks at once.
- **Filters** for priority and "overdue only" apply to both the board and list views.
- Everything **persists** so your board survives a refresh — via `localStorage` by default, or a real Supabase backend if you configure one (see below).
- Each task with a due date gets a **"Add to Google Calendar"** button — this opens a pre-filled Google Calendar event in a new tab. It's a one-click link, not a live sync (see [Extending](#extending-real-google-calendar-sync) below if you want true two-way sync).

## Project structure

```
case-board/
├── README.md
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── .gitignore
├── .env.example         # optional Supabase credentials go here
├── supabase.sql         # run once if you want the Supabase backend
└── src/
    ├── main.jsx            # React entry point
    ├── App.jsx             # Renders the dashboard
    ├── index.css           # Tailwind directives
    ├── lib/
    │   └── storage.js      # storage adapter: localStorage by default, Supabase if configured
    └── components/
        └── CaseBoard.jsx   # The entire dashboard (state, drag logic, UI)
```

## Getting started

Requires Node.js 18+.

```bash
# 1. install dependencies
npm install

# 2. start the dev server
npm run dev

# 3. open the printed local URL (usually http://localhost:5173)
```

To build for production:

```bash
npm run build
npm run preview   # preview the production build locally
```

## Optional: real backend with Supabase

By default the board saves to `localStorage` — nothing to configure, but data only lives in that one browser.

To sync across devices with a real backend:

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase SQL editor, run the contents of `supabase.sql` (creates one table, `case_boards`).
3. Copy `.env.example` to `.env` and fill in your project's URL and anon key (found in Supabase → Project Settings → API):
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=xxxxx
   ```
4. Restart `npm run dev`. The header badge under "CASE FILE" will read **synced via supabase** instead of **synced via localStorage** — no other code changes needed.

The demo `supabase.sql` policy allows anonymous read/write to a single shared board row, which is fine for trying it out solo. For a real multi-user app, add a `user_id` column and scope the row-level security policy to `auth.uid()`.

## How to use the board

| Action | How |
|---|---|
| Add a task | Click **New evidence**, fill in title / category / priority / optional due date |
| Move a task | Click and drag any card |
| Connect two tasks | Click **Connect leads**, then click two cards in turn |
| Remove a connection | Click directly on the red thread |
| Add subtasks | Click the checklist icon on a card |
| Close / reopen a task | Click the check icon on a card |
| Delete a task | Click the trash icon on a card |
| Add task to Google Calendar | Click the calendar icon (only shown if the task has a due date) |
| Search | Use the search box in the toolbar |
| Switch views | Click **Board** or **List** in the toolbar |
| Sort (list view) | Click a column header (Lead / Priority / Due / Status) |
| Filter by priority | Click the Urgent / Active / Cold case chips below the toolbar |
| Show only overdue tasks | Click **OVERDUE ONLY** |
| Reset the board | Click the reset icon (restores the sample data) |

## Tech stack

- **React 18** — component state and UI
- **Vite** — dev server / bundler
- **Tailwind CSS** — utility-first styling
- **lucide-react** — icon set
- Google Fonts (`Special Elite`, `Inter`, `Courier Prime`) — typewriter/detective aesthetic

## Extending: real Google Calendar sync

The current calendar button just opens Google Calendar's "add event" URL — no account access needed. If you want the board to **read your actual calendar** (e.g., auto-pin today's meetings as cards, or mark a task done when its calendar event passes), you'd wire up the [Google Calendar API](https://developers.google.com/calendar/api) or an MCP calendar connector on a small backend/server layer, since that requires OAuth and can't be done from a static front-end alone. Happy to help scaffold that as a follow-up.

## Ideas for further features

- Shared/multiplayer board (swap `localStorage` for a small backend or Supabase/Firebase)
- Import tasks from Notion/Todoist/Trello
- Export a "case closed" weekly PDF summary
- Voice-memo notes attached to a card
- Timeline view sorted by due date instead of free positioning

## License

MIT — do whatever you'd like with it.
