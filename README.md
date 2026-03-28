# ScreenCommander

**Multi-display streaming management system for Windows.** One PC, multiple HDMI/DisplayPort outputs, each showing different content — all controlled from a single Hebrew-language web dashboard.

Think of it as an open-source alternative for digital signage: stream live TV channels, videos, web pages, and custom content to any number of connected monitors simultaneously.

---

## What It Does

- Stream different HLS/video/web content to multiple HDMI/DP outputs from one Windows PC
- Hebrew RTL web dashboard to control which content plays on which screen
- Push timed text message overlays to individual screens or broadcast to all
- Dynamically detect, add, and remove physical monitors at runtime
- Auto-launch/kill Electron player windows when displays are added/removed
- Preset Israeli TV channels (Kan 11, Channel 12, Channel 13, Al Jazeera, BBC News) with one-click switching

---

## Architecture

```
+------------------------------------------------------------------+
|                     OPERATOR'S WINDOWS PC                         |
|                                                                   |
|  +------------------------------------------------------------+  |
|  |          Control Panel (React + Vite)                       |  |
|  |          Hebrew RTL Dashboard on localhost:5173              |  |
|  |  Pages: Dashboard | Messages | Scheduler | Detection |      |  |
|  |         Analytics | Settings | Hotkeys                      |  |
|  +------------------------------------------------------------+  |
|                              |                                    |
|                    REST API + WebSocket                            |
|                              |                                    |
|  +------------------------------------------------------------+  |
|  |              Backend (Express + Socket.IO)                  |  |
|  |              localhost:3000                                 |  |
|  |  - Display Registry    - Content Router                    |  |
|  |  - Message Broker      - Schedule Engine                   |  |
|  |  - Monitor Detection   - Analytics                         |  |
|  |  - Player Manager (auto-spawn/kill Electron players)       |  |
|  +------------------------------------------------------------+  |
|              |           |           |           |                 |
|         +--------+  +--------+  +--------+  +--------+           |
|         |Player 1|  |Player 2|  |Player 3|  |Player N|           |
|         |Electron|  |Electron|  |Electron|  |Electron|           |
|         |HDMI-1  |  |HDMI-2  |  |  DP-1  |  |  DP-N  |           |
|         +--------+  +--------+  +--------+  +--------+           |
|              |           |           |           |                 |
+--------------+-----------+-----------+-----------+-----------------+
               |           |           |           |
          [Monitor 1] [Monitor 2] [Monitor 3] [Monitor N]
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + pnpm workspaces |
| Backend | Express + TypeScript + Prisma (SQLite) + Socket.IO |
| Control Panel | React 18 + Vite + TanStack React Query |
| Player | Electron 28 + electron-vite + hls.js + framer-motion |
| Shared | TypeScript types + Zod schemas + enums + constants |
| Database | SQLite (via Prisma) |
| Real-time | Socket.IO (WebSocket) |

### Monorepo Structure

```
screen-commander/
├── packages/
│   ├── shared/           # Types, Zod schemas, enums, constants
│   ├── backend/          # Express REST API + Socket.IO + Prisma
│   ├── control-panel/    # React Hebrew RTL dashboard
│   └── player/           # Electron fullscreen player (one per monitor)
├── scripts/              # PowerShell utilities (detect-monitors, start/stop)
├── turbo.json            # Turborepo pipeline config
├── pnpm-workspace.yaml   # pnpm workspace config
└── package.json
```

---

## Quick Start

### Prerequisites

- **Windows 10/11 Pro** (x64)
- **Node.js 20+** ([nodejs.org](https://nodejs.org))
- **pnpm** — install with `npm install -g pnpm`
- **GPU with multiple outputs** (HDMI/DisplayPort)

### Installation

```bash
git clone https://github.com/<your-org>/screen-commander.git
cd screen-commander
pnpm install
```

### Setup Database

```bash
cd packages/backend
cp .env.example .env
npx prisma migrate dev --name init
npx prisma db seed
cd ../..
```

### Run

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
pnpm --filter @screen-commander/backend dev
```
Wait until you see `ScreenCommander backend running on http://0.0.0.0:3000`

**Terminal 2 — Control Panel:**
```bash
pnpm --filter @screen-commander/control-panel dev
```

Open **http://localhost:5173** in your browser.

### Add a Display

1. Go to **"זיהוי מסכים"** (Monitor Detection) in the sidebar
2. Click **"סרוק מחדש"** to detect connected monitors
3. Click **"+ הוסף"** on a non-primary monitor
4. The Electron player window auto-launches fullscreen on that monitor
5. Go back to **"לוח בקרה"** (Dashboard) and click **"שנה URL"** to assign content

### Manual Player Launch (optional)

If auto-launch doesn't work, start the player manually:

```bash
pnpm --filter @screen-commander/player dev -- \
  --display-id <DISPLAY_ID> \
  --monitor-index 1 \
  --backend-url http://127.0.0.1:3000
```

Get `<DISPLAY_ID>` from `curl http://127.0.0.1:3000/api/displays`.

---

## Features

### Dashboard (לוח בקרה)
- Display grid showing all active screens with status, current content, and controls
- Quick actions: broadcast message, identify monitors, reload all, blackout all
- Inline display name editing (click the name to rename)
- Real-time status updates via WebSocket

### Content Management
- **Preset channels:** Kan 11, Kan Education, Channel 12, Channel 13, Al Jazeera, BBC News
- **Custom URLs:** Any HLS stream (.m3u8), web page, YouTube video, or local media
- **Auto-detection:** URL patterns automatically detected (HLS, YouTube, RTMP, video, image)
- **Transitions:** Cut, fade, or slide between content changes

### Text Overlays (הודעות)
- Push text messages to individual screens or broadcast to all
- Position: top, bottom, center, or ticker (scrolling)
- Animations: fade-in, slide-up, slide-left, typewriter
- Priority levels: normal, urgent, emergency
- Auto-dismiss with configurable duration

### Monitor Detection (זיהוי מסכים)
- Auto-detect connected HDMI/DisplayPort monitors via PowerShell
- Primary monitor reserved for the control panel
- Add/remove displays at runtime
- Player auto-launches when display is added, auto-closes when removed

### Scheduler (תזמון)
- Schedule content changes per display
- Cron-based recurring schedules
- Priority-based conflict resolution

### Analytics (אנליטיקס)
- Summary cards: active displays, uptime, messages today, content changes
- Charts: uptime per display, content type usage, hourly activity
- Play history per display

### Settings (הגדרות)
- General: system name, language, theme
- Network: backend port, URL
- Players: auto-start, kiosk mode, cursor, render quality
- Messages: default duration, animation, position, font size
- Backup: export/import settings, reset to defaults

---

## REST API

All endpoints at `http://localhost:3000/api/`:

| Resource | Endpoints |
|----------|-----------|
| Displays | `GET/POST /displays`, `PUT/DELETE /displays/:id`, `POST /displays/:id/content`, `POST /displays/:id/identify`, `POST /displays/reload-all`, `POST /displays/blackout-all` |
| Content | `GET/POST /content`, `DELETE /content/:id` |
| Messages | `GET/POST /messages`, `POST /messages/:id/dismiss`, `POST /messages/dismiss-all`, `POST /messages/:id/resend` |
| Schedule | `GET/POST /schedule`, `PUT/DELETE /schedule/:id` |
| System | `GET /system/monitors`, `POST /system/scan`, `GET /system/health` |
| Analytics | `GET /analytics/summary`, `/uptime`, `/content-usage`, `/activity`, `/history` |
| Settings | `GET/PUT /settings`, `POST /settings/export`, `/import`, `/reset` |
| Favorites | `GET/POST /favorites`, `PUT/DELETE /favorites/:id` |

## WebSocket Events

**Backend → Player:** `content:change`, `overlay:show`, `overlay:dismiss`, `overlay:dismiss-all`, `display:identify`, `player:restart`, `player:reload`

**Player → Backend:** `player:register`, `player:heartbeat`, `player:error`, `content:loaded`, `overlay:expired`

**Backend → Dashboard:** `display:status-changed`, `display:heartbeat`, `content:changed`, `message:sent`, `message:dismissed`

---

## Key Design Decisions

- **Hebrew RTL everywhere** — All UI text is in Hebrew, layout is right-to-left
- **SQLite** — Simple, no database server needed. File-based at `packages/backend/prisma/dev.db`
- **No authentication** — Designed for localhost/LAN access only
- **Express (not NestJS)** — Simple routes + services pattern, no framework overhead
- **TanStack React Query (not Apollo)** — REST API with fetch, not GraphQL
- **Socket.IO** — Player ↔ Backend real-time communication with auto-reconnect
- **electron-vite** — Modern build tool for Electron (main + preload + renderer)
- **127.0.0.1 (not localhost)** — Avoids IPv6 resolution issues on Windows with WebSocket

---

## Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | Intel i5 10th gen / Ryzen 5 | Intel i7 12th gen / Ryzen 7 |
| RAM | 8 GB | 16 GB (each player ~200-400 MB) |
| GPU | 2+ video outputs | 4-6+ outputs (Quadro/Radeon Pro) |
| Storage | 256 GB SSD | 512 GB NVMe |
| OS | Windows 10 Pro x64 | Windows 11 Pro x64 |

---

## Development

### Useful Commands

```bash
pnpm dev                        # Start all services (Turborepo)
pnpm build                      # Build all packages
pnpm lint                       # Lint everything
pnpm typecheck                  # Type-check all packages
pnpm --filter backend dev       # Backend only
pnpm --filter control-panel dev # Control panel only
pnpm --filter player dev        # Player only
pnpm --filter backend prisma studio  # Open Prisma Studio (DB browser)
```

### Adding a Preset Channel

Edit `packages/control-panel/src/components/modals/ChangeUrlModal.tsx` — add to the `PRESET_CHANNELS` array:

```typescript
{ name: 'Channel Name', url: 'https://stream-url.m3u8' },
```

Also add to `CHANNEL_NAMES` in `packages/control-panel/src/components/DisplayCard.tsx` for display name resolution.

---

## License

AGPL-3.0
