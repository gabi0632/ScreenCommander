# CLAUDE.md

## Project

ScreenCommander — open-source multi-display streaming management system for Windows. One PC, multiple HDMI/DisplayPort outputs, each showing different content. Controlled via a Hebrew RTL web dashboard.

## Tech Stack

TypeScript monorepo (Turborepo + pnpm):
- `packages/backend` — Express + Prisma + Socket.IO (REST API)
- `packages/player` — Electron + Vite (fullscreen content player)
- `packages/control-panel` — React + Vite (Hebrew RTL dashboard)
- `packages/shared` — shared types, constants, Zod schemas

Database: SQLite via Prisma. Data fetching: TanStack React Query.

## Commands

```bash
pnpm install                    # Install all packages
pnpm dev                        # Start all services (Turborepo)
pnpm --filter backend dev       # Backend only (localhost:3000)
pnpm --filter control-panel dev # Control panel only (localhost:5173)
pnpm --filter player dev        # Electron player (launches on monitors)
pnpm --filter backend prisma migrate dev  # Run DB migrations
pnpm --filter backend prisma studio       # Open Prisma Studio
pnpm build                      # Build all packages
pnpm lint                       # Lint everything
pnpm test                       # Run all tests
```

## Key Directories

```
packages/backend/src/routes/       # Express REST route handlers
packages/backend/src/services/     # Business logic (displays, content, messages, etc.)
packages/backend/src/ws/           # Socket.IO gateway for player communication
packages/backend/src/middleware/    # Zod validation, error handler
packages/backend/src/utils/        # PowerShell execution, logger
packages/backend/prisma/           # Schema and migrations
packages/player/src/main/          # Electron main process (window-manager, ws-client)
packages/player/src/renderer/      # React renderer (ContentFrame, TextOverlay, VideoPlayer)
packages/control-panel/src/pages/  # All UI pages (Dashboard, Messages, Scheduler, etc.)
packages/control-panel/src/components/  # Reusable UI components
packages/control-panel/src/lib/    # API client (fetch wrapper), WebSocket client
packages/shared/src/types/         # Shared TypeScript types
packages/shared/src/schemas/       # Zod validation schemas
packages/shared/src/enums/         # Enums (ContentType, DisplayStatus, etc.)
scripts/                           # Windows PowerShell utilities
```

## Conventions

- **TypeScript strict mode everywhere** — no `any` types, use `unknown` and narrow
- **Named exports only** — no default exports (except React page components)
- **Zod for validation** — all API inputs, WebSocket messages, and env vars
- **Prisma for DB** — no raw SQL except in migrations
- **Express routes + services pattern** — routes handle HTTP, services handle logic
- **Electron v28+** — for ESM and latest Chromium
- **Node.js v20 LTS**

## CRITICAL: Hebrew RTL UI

The entire control panel is in **Hebrew** with full RTL support. This is non-negotiable.

- Root element: `<html lang="he" dir="rtl">`
- ALL labels, buttons, menus, errors, toasts, tooltips — Hebrew
- URL inputs and code stay `dir="ltr"` with `text-align: left`
- Number inputs stay `dir="ltr"`
- Port names, IPs, resolutions can display in English but labels must be Hebrew
- Date/time: `he-IL` locale
- Font: `Heebo` for Hebrew body text, `IBM Plex Mono` for technical data
- NEVER use Arial, Inter, Roboto, or system-ui as primary font

## Design System

Dark industrial control-room aesthetic. Teal accent on deep navy.

```
Primary accent:    #00d4aa (teal)
Background:        #060b14 → #0b1120 → #101828 → #151f32
Text:              #e8edf5 (primary) / #8899b4 (secondary) / #4d6080 (muted)
Status colors:     #ff4d6a (red) / #ffb020 (amber) / #3b8df6 (blue) / #a97cf8 (purple)
HDMI badges:       blue (#3b8df6)
DisplayPort badges: purple (#a97cf8)
```

Subtle CRT scanline overlay on body. Pulsing status dots. Panel slide-in animations with `cubic-bezier(0.22,1,0.36,1)`.

## IMPORTANT: Required Skills Usage

The following skills are installed and MUST be used. Always engage them when working on UI, design, or React tasks. Do not skip them.

### Planning Phase (ALWAYS start here)

Before writing ANY UI/frontend code, enter **Plan Mode** and:
1. Define the component/page purpose, user flow, and visual direction
2. Consult the relevant skills below to inform the plan
3. Get plan approval before writing code

### Mandatory Skills

**`frontend-design`** — ALWAYS use when creating or modifying any UI component, page, layout, or visual element.
- Read the skill BEFORE writing any React component, HTML, or CSS
- Follow its typography, color, motion, spatial composition, and background guidelines
- This project's design system (industrial control-room, Heebo font, teal accent) was built using this skill — maintain consistency
- Applies to: every page, every component, every modal, every card, every button

**`ui-ux-pro-max`** - ALWAYS use when creating or modifying any UI component, page, layout, or visual element.

**`vercel-react-best-practices`** -ALWAYS!! use when creating or modifying any react file  element.

**`web-artifacts-builder`** — ALWAYS use when building complex multi-component React views.
- Use for any page that has multiple interactive sections (Dashboard, Analytics, Scheduler)
- Follow its React 18 + TypeScript + Tailwind + shadcn/ui patterns
- Use shadcn/ui components where they fit (dialogs, dropdowns, tabs, tooltips, switches, sliders)
- Initialize with `scripts/init-artifact.sh` when prototyping new pages as standalone artifacts

**`canvas-design`** — Use when creating visual assets, icons, illustrations, or branded graphics for the app.
- Apply for: loading screens, empty states, error illustrations, onboarding graphics
- Follow its design philosophy approach: define the visual concept first, then execute
- Keep the industrial control-room aesthetic — this is a professional operations tool, not playful

**`theme-factory`** — Use when the design system needs to be extended, new color schemes are added, or the user requests theme customization.
- The current theme is a custom dark industrial theme — this skill can help generate variants
- Use when implementing the theme selector in Settings (הגדרות → ערכת נושא)
- Apply for any future light mode or alternate theme requests

### Workflow for Any UI Task

```
1. PLAN MODE → Define what to build, which skills apply
2. Read skill files → frontend-design SKILL.md + web-artifacts-builder SKILL.md
3. Design → Typography, colors, layout, motion decisions
4. Build → React components following skill guidelines
5. Review → Does it match the industrial control-room aesthetic? Is it Hebrew RTL? No dead buttons?
```

## Control Panel Pages

All pages must be functional — **no dead buttons or placeholder stubs**.

| Sidebar Item | Page/Modal | Hebrew Label |
|---|---|---|
| Dashboard | Main display grid, activity log | לוח בקרה |
| Messages | Message composer + history | הודעות |
| Scheduler | Visual timeline editor | תזמון |
| Monitor Detection | Add/remove HDMI/DP outputs | זיהוי מסכים |
| Analytics | Charts: uptime, content usage, messages | אנליטיקס |
| Settings (topnav) | Modal: general, network, players, messages, backup, about | הגדרות |
| Hotkeys (topnav) | Modal: keyboard shortcut reference table | קיצורי מקלדת |

## REST API

Backend exposes REST endpoints at `localhost:3000/api/`:
- `/api/displays` — Display CRUD + content assignment + identify + reload/blackout
- `/api/content` — Content entry management
- `/api/messages` — Message CRUD + send/dismiss/resend
- `/api/schedule` — Schedule entry CRUD
- `/api/system` — Monitor detection, health check
- `/api/analytics` — Summary, uptime, content usage, activity, history
- `/api/settings` — Settings get/set, export/import/reset
- `/api/favorites` — Saved URL presets CRUD

## WebSocket Protocol

Backend → Player: `content:change`, `overlay:show`, `overlay:dismiss`, `overlay:dismiss-all`, `display:identify`, `player:restart`, `player:reload`

Player → Backend: `player:register`, `player:heartbeat`, `player:error`, `content:loaded`, `overlay:expired`

Backend → Control Panel: `display:status-changed`, `display:heartbeat`, `content:changed`, `message:sent`, `message:dismissed`

## Monitor Detection

Detect all connected monitors via PowerShell (`System.Windows.Forms.Screen.AllScreens`) or Electron's `screen.getAllDisplays()`. Users can dynamically add/remove monitors from the control panel. Primary monitor is reserved for the control panel and cannot be used for content output.

## Player Instances

One Electron process per active display. Launched with:
```
--display-id <id> --monitor-index <N> --backend-url ws://localhost:3000 --fullscreen --no-cursor --kiosk
```
Each player opens fullscreen on its target monitor using `BrowserWindow` positioned at the monitor's `bounds.x/y`.

## Avoid

- No plain JavaScript — TypeScript only
- No `any` types
- No English text in UI — everything Hebrew
- No dead/non-functional buttons in the control panel
- No default exports (except page components)
- No raw SQL outside migrations
- No inline styles in React — use CSS variables from the design system
- No GraphQL — use REST API with Express
- No NestJS — use plain Express
- No Apollo Client — use TanStack React Query + fetch
- NEVER commit `.env` files
- NEVER skip reading `frontend-design` skill before creating UI components
- NEVER build React pages without consulting `web-artifacts-builder` skill for complex views
- NEVER start coding UI without Plan Mode first — plan the design, confirm, then build

## Reference

For detailed specifications (database schema, REST endpoints, WebSocket payloads, all page wireframes, hardware requirements):

@prompt.md
