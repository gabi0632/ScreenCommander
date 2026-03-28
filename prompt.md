# ScreenCommander — Master Build Prompt (Complete)

> **Purpose**: This document is a self-contained prompt. Feed it into a new conversation to continue building ScreenCommander from any point. It contains every decision, spec, and UI requirement discussed.

---

## 1. What Is ScreenCommander

An open-source, Windows-based **multi-display video streaming management system**. Think of it as an open-source vMix alternative for digital signage — one PC with multiple HDMI/DisplayPort outputs, each showing different content, all controlled from a single Hebrew-language web dashboard.

**Core capabilities:**
- Stream different video content (URLs, local media, live streams) to multiple HDMI/DP outputs simultaneously from one Windows PC
- Web-based management panel (Hebrew, RTL) to control which content plays on which screen
- Push timed text messages/overlays to individual screens or broadcast to all
- Schedule content changes and manage playlists per display
- Dynamically detect, add, and remove physical HDMI/DisplayPort outputs

**Target hardware:** A single Windows PC with 6+ video outputs (mix of HDMI and DisplayPort). The system must support any number of outputs the GPU provides.

---

## 2. Language & UI Requirements

### 2.1 CRITICAL: Hebrew RTL Interface

The **entire application** must be in **Hebrew** with full **RTL (right-to-left)** support:

- HTML `dir="rtl"` and `lang="he"` on root element
- All labels, buttons, menus, error messages, tooltips, toasts — everything in Hebrew
- Form inputs for URLs and code remain `dir="ltr"` with `text-align: left`
- Number inputs remain `dir="ltr"`
- Mono-spaced technical data (ports, IPs, resolutions) can stay in English but labels must be Hebrew
- Date/time formatting: `he-IL` locale

### 2.2 Design Direction

**Aesthetic: Industrial control room** — dark theme with teal/cyan accent on deep navy backgrounds.

**Typography:**
- Body font: `Heebo` (excellent Hebrew support, modern)
- Monospace: `IBM Plex Mono` (for technical data — ports, URLs, resolutions)
- No Arial, Inter, Roboto, or system fonts

**Color palette (CSS variables):**
```css
--bg-deep: #060b14;
--bg-primary: #0b1120;
--bg-secondary: #101828;
--bg-card: #151f32;
--bg-elevated: #1e2f4d;
--bg-input: #0d1525;
--border: #1e2d4a;
--border-active: #00d4aa;
--text-primary: #e8edf5;
--text-secondary: #8899b4;
--text-muted: #4d6080;
--accent: #00d4aa;          /* teal — primary action color */
--accent-glow: rgba(0, 212, 170, 0.12);
--red: #ff4d6a;
--amber: #ffb020;
--blue: #3b8df6;
--purple: #a97cf8;
```

**Visual effects:**
- Subtle CRT scanline overlay on body (`repeating-linear-gradient`)
- Glowing accent shadows on brand elements
- Smooth panel slide-in animations (`cubic-bezier(0.22,1,0.36,1)`)
- Pulsing status dots for live indicators
- Port type badges: HDMI in blue, DisplayPort in purple

---

## 3. Architecture

### 3.1 System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     OPERATOR'S WINDOWS PC                       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │          ScreenCommander Control Panel (Hebrew RTL)       │   │
│  │         React + TypeScript + Vite on localhost:5173       │   │
│  │                                                           │   │
│  │  Pages: לוח בקרה | הודעות | תזמון | זיהוי מסכים |        │   │
│  │         אנליטיקס | הגדרות                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              │ REST API + WebSocket              │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Backend Service (Express)                     │   │
│  │  • Display Registry    • Content Router                   │   │
│  │  • Message Broker      • Schedule Engine                  │   │
│  │  • System Detection    • Analytics Collector              │   │
│  │  • Settings Manager    • Favorites                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│              │           │           │           │                │
│              ▼           ▼           ▼           ▼                │
│         ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐         │
│         │Player 1│  │Player 2│  │Player 3│  │Player N│         │
│         │Electron│  │Electron│  │Electron│  │Electron│         │
│         │HDMI-1  │  │HDMI-2  │  │DP-1    │  │DP-N    │         │
│         └────────┘  └────────┘  └────────┘  └────────┘         │
│              │           │           │           │                │
└──────────────┼───────────┼───────────┼───────────┼───────────────┘
               ▼           ▼           ▼           ▼
          [Monitor]   [Monitor]   [Monitor]   [Monitor]
```

### 3.2 Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Player App | Electron + TypeScript + Vite | One instance per display |
| Backend API | Express + TypeScript | REST API. Prisma ORM. Socket.IO for real-time |
| Control Panel | React + TypeScript + Vite | Hebrew RTL. All pages described in §6 |
| Database | SQLite | Via Prisma |
| Real-time | WebSocket (Socket.IO) | Content switching, overlays, heartbeats |
| Process Manager | PM2 or Windows service | Auto-start on boot |
| Package Manager | pnpm | Monorepo via Turborepo |
| Validation | Zod | All API inputs and WebSocket messages |
| Data Fetching | TanStack React Query | Control panel API calls |

### 3.3 Constraints

- **TypeScript only** — no plain JavaScript anywhere
- **Electron v28+** — latest Chromium + ESM
- **Node.js v20 LTS**
- **Prisma** — no raw SQL except migrations
- **No authentication** — localhost access only

### 3.4 Monorepo Structure

```
screen-commander/
├── packages/
│   ├── backend/                    # Express API server
│   │   ├── src/
│   │   │   ├── index.ts            # Express + Socket.IO bootstrap
│   │   │   ├── app.ts              # Middleware, routes, error handler
│   │   │   ├── prisma.ts           # PrismaClient singleton
│   │   │   ├── routes/
│   │   │   │   ├── displays.routes.ts
│   │   │   │   ├── content.routes.ts
│   │   │   │   ├── messages.routes.ts
│   │   │   │   ├── schedule.routes.ts
│   │   │   │   ├── system.routes.ts
│   │   │   │   ├── analytics.routes.ts
│   │   │   │   ├── settings.routes.ts
│   │   │   │   └── favorites.routes.ts
│   │   │   ├── services/
│   │   │   │   ├── displays.service.ts
│   │   │   │   ├── content.service.ts
│   │   │   │   ├── messages.service.ts
│   │   │   │   ├── schedule.service.ts
│   │   │   │   ├── system.service.ts
│   │   │   │   ├── analytics.service.ts
│   │   │   │   ├── settings.service.ts
│   │   │   │   └── favorites.service.ts
│   │   │   ├── ws/
│   │   │   │   ├── gateway.ts       # Socket.IO server + event handlers
│   │   │   │   └── events.ts
│   │   │   ├── middleware/
│   │   │   │   ├── validate.ts      # Zod validation middleware
│   │   │   │   └── error-handler.ts
│   │   │   └── utils/
│   │   │       ├── powershell.ts
│   │   │       └── logger.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── package.json
│   │
│   ├── player/                     # Electron player
│   │   ├── src/
│   │   │   ├── main/               # Electron main process
│   │   │   │   ├── index.ts
│   │   │   │   ├── window-manager.ts
│   │   │   │   ├── ws-client.ts
│   │   │   │   ├── cli-args.ts
│   │   │   │   ├── heartbeat.ts
│   │   │   │   └── auto-recovery.ts
│   │   │   ├── renderer/           # Electron renderer
│   │   │   │   ├── App.tsx
│   │   │   │   ├── components/
│   │   │   │   │   ├── ContentFrame.tsx
│   │   │   │   │   ├── VideoPlayer.tsx
│   │   │   │   │   ├── TextOverlay.tsx
│   │   │   │   │   ├── OverlayManager.tsx
│   │   │   │   │   └── StatusIndicator.tsx
│   │   │   │   └── hooks/
│   │   │   └── preload/
│   │   └── package.json
│   │
│   ├── control-panel/              # React web dashboard (Hebrew RTL)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── DashboardPage.tsx       # לוח בקרה — main grid
│   │   │   │   ├── MessagesPage.tsx        # הודעות
│   │   │   │   ├── SchedulerPage.tsx       # תזמון
│   │   │   │   ├── DetectPage.tsx          # זיהוי מסכים
│   │   │   │   ├── AnalyticsPage.tsx       # אנליטיקס
│   │   │   │   └── HotkeysModal.tsx        # קיצורי מקלדת (modal)
│   │   │   ├── components/
│   │   │   │   ├── DisplayCard.tsx
│   │   │   │   ├── UrlInput.tsx
│   │   │   │   ├── MessageForm.tsx
│   │   │   │   ├── ScheduleTimeline.tsx
│   │   │   │   ├── SettingsModal.tsx
│   │   │   │   ├── ChangeUrlModal.tsx
│   │   │   │   └── MonitorDetectRow.tsx
│   │   │   ├── hooks/
│   │   │   └── lib/
│   │   │       ├── api.ts           # fetch wrapper for REST calls
│   │   │       └── websocket.ts     # Socket.IO client
│   │   └── package.json
│   │
│   └── shared/                     # Shared types, schemas, constants
│       ├── src/
│       │   ├── types/
│       │   ├── schemas/
│       │   ├── enums/
│       │   └── constants/
│       └── package.json
│
├── scripts/
│   ├── start-all.ps1
│   ├── stop-all.ps1
│   └── detect-monitors.ps1
├── turbo.json
└── package.json
```

---

## 4. Database Schema (Prisma)

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Display {
  id           String    @id @default(cuid())
  hardwareId   String    @unique
  name         String                          // Hebrew name, e.g. "לובי"
  monitorIndex Int
  width        Int
  height       Int
  posX         Int
  posY         Int
  isPrimary    Boolean   @default(false)
  isEnabled    Boolean   @default(true)
  connectionType String  @default("HDMI")      // HDMI | DisplayPort
  portLabel    String    @default("HDMI-1")     // Display label
  status       String    @default("OFFLINE")
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  currentContent   Content?   @relation("CurrentContent", fields: [currentContentId], references: [id])
  currentContentId String?
  scheduleEntries  ScheduleEntry[]
  messageTargets   MessageTarget[]
  playHistory      PlayHistory[]
}

model Content {
  id       String  @id @default(cuid())
  type     String  // WEB_URL, YOUTUBE, RTMP_STREAM, HLS_STREAM, LOCAL_VIDEO, LOCAL_IMAGE, CUSTOM_HTML
  url      String
  title    String?
  metadata Json?
  displays         Display[] @relation("CurrentContent")
  scheduleEntries  ScheduleEntry[]
  createdAt        DateTime  @default(now())
}

model ScheduleEntry {
  id             String   @id @default(cuid())
  displayId      String
  display        Display  @relation(fields: [displayId], references: [id])
  contentId      String
  content        Content  @relation(fields: [contentId], references: [id])
  startTime      DateTime
  endTime        DateTime?
  recurrenceRule String?
  priority       Int       @default(0)
  isActive       Boolean   @default(true)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}

model TextMessage {
  id               String           @id @default(cuid())
  text             String
  position         String           @default("bottom")
  fontSize         Int              @default(24)
  fontColor        String           @default("#FFFFFF")
  backgroundColor  String           @default("#000000CC")
  animation        String           @default("fade-in")
  displayDuration  Int              @default(30)
  priority         String           @default("normal")
  scheduledAt      DateTime?
  sentAt           DateTime?
  dismissedAt      DateTime?
  createdAt        DateTime         @default(now())
  targets          MessageTarget[]
}

model MessageTarget {
  id           String      @id @default(cuid())
  messageId    String
  message      TextMessage @relation(fields: [messageId], references: [id])
  displayId    String
  display      Display     @relation(fields: [displayId], references: [id])
  deliveredAt  DateTime?
  dismissedAt  DateTime?
}

model PlayHistory {
  id          String   @id @default(cuid())
  displayId   String
  display     Display  @relation(fields: [displayId], references: [id])
  contentUrl  String
  contentType String
  startedAt   DateTime @default(now())
  endedAt     DateTime?
  durationSec Int?
}

model AppSettings {
  id    String @id @default("singleton")
  data  Json   // All settings as JSON
}

model Favorite {
  id    String @id @default(cuid())
  name  String
  url   String
  type  String
  icon  String @default("")
  order Int    @default(0)
}
```

---

## 5. Core Features — Specifications

### 5.1 Dynamic Monitor Detection & Management

The system must **auto-detect all HDMI and DisplayPort outputs** on the PC and let the operator choose which to use.

**Detection methods:**
```typescript
// Option A: Electron (from player process)
import { screen } from 'electron';
const displays = screen.getAllDisplays(); // returns bounds, id, size

// Option B: PowerShell (from Express backend)
const script = `
  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.Screen]::AllScreens | ForEach-Object {
    [PSCustomObject]@{
      DeviceName = $_.DeviceName; Primary = $_.Primary
      Width = $_.Bounds.Width; Height = $_.Bounds.Height
      X = $_.Bounds.X; Y = $_.Bounds.Y
    }
  } | ConvertTo-Json
`;
```

**UI behavior (זיהוי מסכים page):**
- Lists ALL detected monitors with: port name, type badge (HDMI blue / DP purple), resolution, device name
- Primary monitor marked as "ראשי — בקרה" (greyed out, cannot be used for content)
- Each non-primary monitor has "**+ הוסף**" button to add it to the active displays
- Active displays show "**הסר**" button to remove them
- "**סרוק מחדש**" button triggers re-detection (for hot-plugged monitors)
- "**הוסף מסך חדש**" button in sidebar footer opens this panel
- Hot-plug events trigger automatic re-scan

### 5.2 Content Router

Assign any URL, file, or stream to any screen instantly via WebSocket.

**Supported content types:**

| Type | Hebrew Label | Rendering |
|------|-------------|-----------|
| Web URL | כתובת אינטרנט (URL) | Electron `<webview>` |
| YouTube | YouTube / YouTube Live | Embedded player |
| RTMP/HLS | שידור RTMP / HLS | hls.js / video.js |
| Local Video | קובץ וידאו מקומי | HTML5 `<video>` |
| Local Image | תמונה מקומית | `<img>` auto-fit |
| Custom HTML | HTML מותאם אישית | Direct webview render |

**Change URL modal** includes: content type selector, URL input, transition selector (דהייה/חיתוך/החלקה), transition duration, and a favorites list with quick-pick.

### 5.3 Text Message Overlay System

**Message properties:** text, target screens (specific or all), position (top/bottom/center/ticker), duration, animation (slide-up/fade/slide-left/typewriter), priority (normal/urgent/emergency).

**Message composer UI fields (all Hebrew):**
- טקסט ההודעה (textarea)
- מסכי יעד (chip-select: כל המסכים + individual display names)
- מיקום: באנר תחתון | באנר עליון | מרכז | טיקר (גלילה)
- משך (שניות): number input
- אנימציה: החלקה למעלה | דהייה | החלקה שמאלה | מכונת כתיבה
- עדיפות: רגילה | דחופה | חירום

### 5.4 Content Scheduler (תזמון)

Visual timeline editor per display. Supports cron-based recurring schedules, priority-based conflict resolution, and fallback content.

### 5.5 Favorites System

Saved URLs with name + icon for quick assignment. Stored in DB. Displayed in Change URL modal and accessible from dashboard.

---

## 6. Control Panel — All Pages & Views

The control panel is a **single-page React app** with sidebar navigation. Every page is fully functional — no placeholder/dead buttons allowed.

### 6.1 Layout Structure

```
┌────────────────────────────────────────────────────────┐
│  TOPNAV: Logo | Status pills | Live badge | ⌨️ | ⚙️  │
├────────────┬───────────────────────────────────────────┤
│  SIDEBAR   │  MAIN CONTENT AREA                       │
│            │  (switches based on active page)          │
│  ניהול     │                                          │
│  · לוח בקרה│                                          │
│  · הודעות  │                                          │
│  · תזמון   │                                          │
│  · זיהוי   │                                          │
│    מסכים   │                                          │
│            │                                          │
│  מסכים     │                                          │
│  פעילים    │                                          │
│  · לובי    │                                          │
│  · חדר     │                                          │
│    ישיבות  │                                          │
│  · ...     │                                          │
│            │                                          │
│  מערכת     │                                          │
│  · אנליטיקס│                                          │
│            │                                          │
│  [＋ הוסף  │                                          │
│   מסך חדש] │                                          │
└────────────┴───────────────────────────────────────────┘
```

### 6.2 Page: לוח בקרה (Dashboard)

The main view. Shows:
- **Header:** title + subtitle with active display count + quick action buttons (שלח הודעה לכולם, זיהוי מסכים, רענן הכל, כבה הכל)
- **Display grid:** 3-column grid of display cards. Each card shows:
  - Screen preview area with gradient background and content icon
  - Status badge (▶ פעיל / ⏸ המתנה / ⏹ מנותק) with pulsing dot
  - Port label badge (HDMI-1, DP-2, etc.)
  - Text overlay preview when message is active
  - Display name (editable via pencil icon on hover)
  - Current URL (monospace, ltr)
  - Meta: resolution, uptime, port type
  - Actions: שנה URL, הודעה, זהה, remove
- **Activity log:** timestamped list of recent actions with colored dots

### 6.3 Page: הודעות (Messages)

Full-featured message composer (see §5.3). Also shows message history with re-send capability.

### 6.4 Page: תזמון (Scheduler)

Visual timeline editor. Each display gets a horizontal timeline row. Drag to create schedule blocks. Form for: display selection, content URL, start/end time, recurrence pattern, priority.

### 6.5 Page: זיהוי מסכים (Monitor Detection)

See §5.1. Shows all detected monitors with add/remove capability.

### 6.6 Page: אנליטיקס (Analytics)

Dashboard with charts and stats:

**Summary cards (top row):**
- סה״כ מסכים פעילים (total active displays)
- זמן פעילות ממוצע (average uptime)
- הודעות שנשלחו היום (messages sent today)
- שינויי תוכן היום (content changes today)

**Charts:**
- זמן פעילות לפי מסך — bar chart showing uptime hours per display
- שימוש בתוכן — pie/donut chart of content type distribution (URLs, videos, streams)
- פעילות לפי שעה — line chart of content changes over past 24h
- היסטוריית הודעות — table of recent messages with targets and timestamps

**Per-display stats:** click a display to see its play history (what content, when, how long).

### 6.7 Modal: הגדרות (Settings)

Opens as a modal overlay (not a page). Sections:

**כללי (General):**
- שם המערכת (system name input, default: "ScreenCommander")
- שפה (language selector — currently Hebrew only)
- ערכת נושא (theme — currently dark only, for future expansion)

**רשת (Network):**
- פורט שרת (backend port, default: 3000)
- כתובת שרת (backend URL for players)

**נגנים (Players):**
- הפעלה אוטומטית בהפעלת המערכת (auto-start on boot — toggle)
- מצב קיוסק (kiosk mode — toggle)
- הסתרת סמן עכבר (hide cursor — toggle)
- איכות רנדור (render quality — low/medium/high)

**הודעות (Messages defaults):**
- משך ברירת מחדל (default duration — number)
- אנימציה ברירת מחדל (default animation — select)
- מיקום ברירת מחדל (default position — select)
- גודל גופן ברירת מחדל (default font size — number)

**גיבוי ונתונים (Backup & Data):**
- ייצוא הגדרות (export settings — button)
- ייבוא הגדרות (import settings — button)
- איפוס להגדרות מפעל (reset to defaults — danger button with confirmation)

**אודות (About):**
- Version number
- GitHub repository link
- License info (AGPLv3)

### 6.8 Modal: קיצורי מקלדת (Hotkeys)

Opens as a modal overlay. Shows a formatted list of keyboard shortcuts:

| קיצור | פעולה |
|-------|-------|
| `Ctrl + 1-9` | מעבר מהיר למסך 1-9 |
| `Ctrl + M` | שלח הודעה לכולם |
| `Ctrl + R` | רענן את כל הנגנים |
| `Ctrl + B` | כבה את כל המסכים |
| `Ctrl + D` | זיהוי מסכים |
| `Ctrl + S` | פתח הגדרות |
| `Ctrl + Shift + F` | מסך מלא ללוח הבקרה |
| `Escape` | סגור חלון/מודל פתוח |
| `Ctrl + Shift + 1-9` | שלח הודעה למסך ספציפי |
| `F5` | רענן לוח בקרה |

The modal also shows a note: "ניתן להתאים קיצורים בהגדרות" (shortcuts can be customized in settings).

---

## 7. WebSocket Protocol

### 7.1 Backend → Player

```typescript
type ServerToPlayerEvent =
  | { event: 'content:change'; payload: { contentType: string; url: string; transition: 'cut'|'fade'|'slide'; transitionDurationMs: number } }
  | { event: 'overlay:show'; payload: { messageId: string; text: string; position: string; style: MessageStyle; displayDurationSeconds: number; priority: string } }
  | { event: 'overlay:dismiss'; payload: { messageId: string } }
  | { event: 'overlay:dismiss-all'; payload: {} }
  | { event: 'display:identify'; payload: { color: string; label: string } }
  | { event: 'player:restart'; payload: {} }
  | { event: 'player:reload'; payload: {} };
```

### 7.2 Player → Backend

```typescript
type PlayerToServerEvent =
  | { event: 'player:register'; payload: { displayId: string; monitorIndex: number; resolution: { width: number; height: number }; electronVersion: string; appVersion: string } }
  | { event: 'player:heartbeat'; payload: { displayId: string; status: 'idle'|'playing'|'error'; currentUrl: string|null; uptimeSeconds: number; memoryUsageMB: number; activeOverlays: string[] } }
  | { event: 'player:error'; payload: { error: string; stack?: string } }
  | { event: 'content:loaded'; payload: { url: string; loadTimeMs: number } }
  | { event: 'overlay:expired'; payload: { messageId: string } };
```

---

## 8. Player Implementation

### 8.1 Fullscreen Window Placement

```typescript
import { BrowserWindow, screen } from 'electron';

function createPlayerWindow(monitorIndex: number): BrowserWindow {
  const displays = screen.getAllDisplays();
  const target = displays[monitorIndex];
  return new BrowserWindow({
    x: target.bounds.x, y: target.bounds.y,
    width: target.bounds.width, height: target.bounds.height,
    fullscreen: true, frame: false, kiosk: true, alwaysOnTop: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true, nodeIntegration: false, webviewTag: true,
    },
  });
}
```

### 8.2 CLI Arguments

```
screen-commander-player.exe
  --display-id <string>
  --monitor-index <number>       # 0-based
  --backend-url <string>         # ws://localhost:3000
  --fullscreen
  --no-cursor
  --kiosk
  --debug
```

### 8.3 Startup Sequence

1. Backend starts → runs PowerShell monitor detection
2. For each non-primary monitor marked as active: spawn Electron player with `--monitor-index`
3. Player connects to backend via WebSocket, registers itself
4. Player receives initial content assignment and enters fullscreen
5. Control panel opens in default browser on primary monitor

---

## 9. REST API Endpoints

### Displays (`/api/displays`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/displays` | List all displays |
| GET | `/api/displays/:id` | Get single display |
| POST | `/api/displays` | Create/register a display |
| PUT | `/api/displays/:id` | Update display (name, enabled, etc.) |
| DELETE | `/api/displays/:id` | Remove display |
| POST | `/api/displays/:id/content` | Assign content to display |
| POST | `/api/displays/:id/identify` | Flash identification on display |
| POST | `/api/displays/reload-all` | Reload all players |
| POST | `/api/displays/blackout-all` | Black out all displays |

### Content (`/api/content`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/content` | List all content entries |
| POST | `/api/content` | Create content entry |
| DELETE | `/api/content/:id` | Delete content |

### Messages (`/api/messages`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/messages` | List message history |
| POST | `/api/messages` | Create + send message |
| POST | `/api/messages/:id/dismiss` | Dismiss a message |
| POST | `/api/messages/dismiss-all` | Dismiss all messages |
| POST | `/api/messages/:id/resend` | Re-send a previous message |

### Schedule (`/api/schedule`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/schedule` | List all schedule entries |
| POST | `/api/schedule` | Create schedule entry |
| PUT | `/api/schedule/:id` | Update schedule entry |
| DELETE | `/api/schedule/:id` | Delete schedule entry |

### System (`/api/system`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/system/monitors` | Get detected monitors |
| POST | `/api/system/scan` | Re-scan monitors via PowerShell |
| GET | `/api/system/health` | Health check |

### Analytics (`/api/analytics`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/analytics/summary` | Summary stats |
| GET | `/api/analytics/uptime` | Uptime per display |
| GET | `/api/analytics/content-usage` | Content type distribution |
| GET | `/api/analytics/activity` | Activity over time (24h) |
| GET | `/api/analytics/history` | Play history for a display |

### Settings (`/api/settings`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings` | Get all settings |
| PUT | `/api/settings` | Update settings |
| POST | `/api/settings/export` | Export settings as JSON |
| POST | `/api/settings/import` | Import settings from JSON |
| POST | `/api/settings/reset` | Reset to defaults |

### Favorites (`/api/favorites`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/favorites` | List all favorites |
| POST | `/api/favorites` | Create favorite |
| PUT | `/api/favorites/:id` | Update favorite |
| DELETE | `/api/favorites/:id` | Delete favorite |

---

## 10. Development Phases

### Phase 1: Foundation
- Initialize monorepo (Turborepo + pnpm)
- Express backend: REST API, Prisma, WebSocket gateway
- Windows monitor detection service
- Basic Electron player (fullscreen on target monitor)
- Player ↔ backend WebSocket connection + heartbeat
- Control panel skeleton: sidebar + routing + all page stubs in Hebrew

### Phase 2: Content Routing
- POST `/api/displays/:id/content` — URL → specific screen
- Player renders URLs via `<webview>` with security sandbox
- Video playback: MP4, HLS (hls.js), RTMP (video.js)
- Transitions: cut, fade, slide
- Favorites/presets system
- Multi-display batch content assignment

### Phase 3: Text Overlays
- Message composer UI (Hebrew)
- WebSocket overlay push to players
- Overlay renderer with animations (framer-motion)
- Ticker mode (horizontal scroll)
- Auto-dismiss with countdown
- Priority system + emergency full-screen takeover
- Message history + re-send

### Phase 4: Scheduler + Analytics
- Schedule CRUD via REST API
- Visual timeline editor
- Cron-based recurring schedules
- Priority conflict resolution
- Analytics page: uptime charts, content usage, message history
- Play history recording

### Phase 5: Settings + Polish
- Settings modal with all sections (§6.7)
- Hotkeys modal (§6.8) + keyboard event handlers
- Monitor detection page with dynamic add/remove
- Player crash recovery + auto-restart
- Display identification (flash color)
- Windows service / auto-start on boot

---

## 11. Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | Intel i5 10th gen / Ryzen 5 | Intel i7 12th gen / Ryzen 7 |
| RAM | 8 GB | 16 GB (each player ~200-400 MB) |
| GPU | 4+ outputs (Quadro P620, Radeon Pro WX 4100) | 6+ outputs (RTX A2000, Radeon Pro W6600) |
| Storage | 256 GB SSD | 512 GB NVMe |
| OS | Windows 10 Pro x64 | Windows 11 Pro x64 |
| Network | Ethernet | Gigabit Ethernet |

---

## 12. Security

- Control panel: localhost or LAN only
- No authentication required (local access)
- Player WebSocket: accept connections only from backend
- URL validation: block `javascript:` URLs in `<webview>`
- Electron `<webview>`: `sandbox=true`
- Rate-limit message sending

---

## 13. Getting Started

```bash
git clone https://github.com/<your-org>/screen-commander.git
cd screen-commander
pnpm install

cd packages/backend
cp .env.example .env
pnpm prisma migrate dev

cd ../..
pnpm dev    # Turborepo: backend + control-panel + player

# Control panel → http://localhost:5173
# Players auto-launch on connected monitors
```

---

## 14. Critical Reminders for Any AI Session Using This Prompt

1. **All UI text in Hebrew.** No English labels, buttons, or messages in the control panel.
2. **RTL layout.** `dir="rtl"` everywhere. Sidebar on the right. Forms flow right-to-left.
3. **Every sidebar item and topnav button must be functional.** No dead buttons. If a page isn't built yet, show a "בקרוב" (coming soon) placeholder with an icon.
4. **Dynamic monitor management.** Users must be able to add and remove HDMI/DP outputs at runtime.
5. **TypeScript only.** Never generate plain JS.
6. **Use Heebo font for Hebrew, IBM Plex Mono for technical data.**
7. **Industrial control-room aesthetic.** Dark theme, teal accent, scanline overlay.
8. **Express REST API.** Simple routes + services pattern. No GraphQL, no NestJS.
9. **TanStack React Query** for data fetching in the control panel. No Apollo Client.

---

*This prompt is the single source of truth for ScreenCommander. Last updated: Express REST API, no Xibo, no authentication, SQLite only.*
