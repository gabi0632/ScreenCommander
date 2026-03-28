# Control Panel Code Review Report

**Package:** `packages/control-panel`
**Date:** 2026-03-28
**Reviewer:** Claude Opus 4.6

---

## 1. Critical Issues (Bugs That Would Crash or Break Functionality)

### 1.1 Settings Export Uses GET But Backend Expects POST
**File:** `packages/control-panel/src/hooks/useSettings.ts`, line 22
**Problem:** `useExportSettings` calls `api.get('/settings/export')` but the backend route at `packages/backend/src/routes/settings.routes.ts` line 29 registers this as `POST /api/settings/export`. This means every export attempt will receive a 404 error.
**Expected:** Should use `api.post('/settings/export')`.

### 1.2 Keyboard Shortcuts Listed in HotkeysModal Are Not Implemented
**File:** `packages/control-panel/src/components/modals/HotkeysModal.tsx`, lines 8-19
**Problem:** The HotkeysModal lists 10 keyboard shortcuts (Ctrl+Shift+D, Ctrl+Shift+M, etc.) but there are no `keydown` event listeners anywhere in the codebase that implement these shortcuts. None of the listed shortcuts actually work. The modal is purely cosmetic.
**Expected:** A global keyboard event handler (likely in `AppShell.tsx` or a dedicated `useHotkeys` hook) that listens for these shortcuts and performs the corresponding actions (navigate, open modals, reload displays, blackout, etc.).

### 1.3 LoadingFallback in App.tsx Uses Inline Styles (Spec Violation)
**File:** `packages/control-panel/src/App.tsx`, lines 14-27
**Problem:** The `LoadingFallback` component uses inline styles (`style={{...}}`), which violates the project convention: "No inline styles in React -- use CSS variables from the design system." While not a crash, this sets a bad precedent and violates CLAUDE.md rules.

### 1.4 ImageInput Silently Swallows Upload Errors
**File:** `packages/control-panel/src/components/ui/ImageInput.tsx`, lines 24-25
**Problem:** The `catch` block in `handleFileChange` silently swallows errors with no user feedback. If the image upload fails (e.g., server down, file too large, wrong format), the user has no idea what happened.
**Expected:** Show a toast error message like `toast('שגיאה בהעלאת תמונה', 'error')`. The component does not have access to `useToast` and would need it injected or the error propagated.

### 1.5 Toast Container Positioned on Left (Incorrect for RTL)
**File:** `packages/control-panel/src/components/ui/Toast.tsx`, line 40
**Problem:** The toast container is positioned with `left: 24`. In an RTL layout, toasts should appear on the left side (which is the "end" side in RTL), so this actually happens to be correct visually for RTL. However, line 74 uses `borderRight` for the colored accent border. In RTL, the accent border should be on the right (the "start" side), so `borderLeft` would be the standard side or `borderInlineStart` should be used. Currently `borderRight` places the accent on the visual right, which in RTL is the starting side -- this is acceptable but inconsistent with how RTL components typically show emphasis.

---

## 2. Missing Implementations (Spec Requirements Not Met)

### 2.1 No "Refresh All" Button on Dashboard
**File:** `packages/control-panel/src/pages/DashboardPage.tsx`, lines 135-145
**Problem:** The spec (prompt.md Section 6.2) requires four quick action buttons in the dashboard header: "send message to all", "identify displays", "refresh all", and "blackout all". The dashboard only has three buttons -- "Send Message to All" (line 136), "Identify Displays" (line 139), and "Blackout All" (line 142). The "Refresh All" (reanimate all players) button is missing.
**Expected:** Add a "Refresh All" button using the `useReloadAll` hook (which already exists in `useDisplays.ts` line 74).

### 2.2 No Activity Log on Dashboard
**File:** `packages/control-panel/src/pages/DashboardPage.tsx`
**Problem:** The spec (Section 6.2) calls for an "Activity log: timestamped list of recent actions with colored dots" on the dashboard page. This is entirely missing. The dashboard shows displays and active messages but no activity log.
**Expected:** A section below the display grid showing recent content changes, messages sent, displays added/removed, etc.

### 2.3 Favorites System Not Integrated into ChangeUrlModal
**File:** `packages/control-panel/src/components/modals/ChangeUrlModal.tsx`
**Problem:** The spec (Section 5.2 and 5.5) says the "Change URL modal includes: ... favorites list with quick-pick." While `useFavorites` hook exists and `favorites.routes.ts` backend is implemented, the ChangeUrlModal has preset channels hardcoded but no integration with the Favorites API. Users cannot save, manage, or quick-pick from favorites.
**Expected:** The ChangeUrlModal should have a tab or section for favorites, fetched from `/api/favorites`.

### 2.4 No Favorites Management UI Anywhere
**File:** N/A (entirely missing)
**Problem:** The spec (Section 5.5, Section 9) defines a favorites CRUD system. The backend has `/api/favorites` with full CRUD. The `useFavorites` hook exists. But there is no UI page or component that lets users create, edit, or delete favorites. The `useFavorites` hook is imported nowhere.
**Expected:** Either a dedicated section in Settings or a dedicated page/modal for managing favorites.

### 2.5 Missing Scheduler Update Functionality
**File:** `packages/control-panel/src/pages/SchedulerPage.tsx`
**Problem:** The scheduler only supports creating and deleting schedule entries. The `useUpdateScheduleEntry` hook exists in `useSchedule.ts` (line 30) but is never imported or used. Users cannot edit existing schedule entries -- they can only delete and re-create them.
**Expected:** An edit button or inline editing for existing schedule entries.

### 2.6 Scheduler Displays contentId Instead of URL
**File:** `packages/control-panel/src/pages/SchedulerPage.tsx`, line 180
**Problem:** The schedule entry display shows `entry.contentId` (a CUID like `clxyz123...`) rather than the human-readable content URL or title. This is meaningless to users.
**Expected:** Show the content URL or a resolved content title. This may require the backend to include content details in the schedule response, or a separate lookup.

### 2.7 No Per-Display Analytics View
**File:** `packages/control-panel/src/pages/AnalyticsPage.tsx`
**Problem:** The spec (Section 6.6) says "Per-display stats: click a display to see its play history." The analytics page shows a global play history table but has no click-to-filter-by-display functionality. The `usePlayHistory` hook does not pass a `displayId` parameter.
**Expected:** Either a display selector/filter on the analytics page, or clickable display names that filter the history.

### 2.8 Analytics Play History Shows displayId Instead of Display Name
**File:** `packages/control-panel/src/pages/AnalyticsPage.tsx`, line 189
**Problem:** `{h.displayId}` renders a raw CUID like `clxyz123...` instead of the display's human-readable name.
**Expected:** Resolve display names by cross-referencing with the displays data (using `useDisplays`).

### 2.9 No "Coming Soon" Placeholder for Missing Features
**File:** Multiple
**Problem:** CLAUDE.md Section 14 states: "If a page isn't built yet, show a 'coming soon' placeholder with an icon." While most pages are built, features like favorites management have no placeholder at all.

### 2.10 Missing Reset Confirmation Dialog for Settings
**File:** `packages/control-panel/src/components/modals/SettingsModal.tsx`, lines 98-105
**Problem:** The spec (Section 6.7) says the reset button should be a "danger button with confirmation." Currently `handleReset` immediately calls `resetSettings.mutate()` with no confirmation dialog. One accidental click wipes all settings.
**Expected:** Show a confirmation modal/dialog before resetting.

---

## 3. Logic Errors (Code That Runs But Produces Wrong Results)

### 3.1 DisplayCard Uptime Calculation Uses createdAt Instead of Actual Uptime
**File:** `packages/control-panel/src/components/DisplayCard.tsx`, lines 43-48
**Problem:** `formatUptime` calculates `Date.now() - new Date(createdAt).getTime()`. This shows the time since the display was first created in the database, not the actual player uptime. A display created 3 months ago that was just rebooted will show "2160 hours" uptime.
**Expected:** Use actual player uptime data from the heartbeat (the `uptimeSeconds` field sent in `player:heartbeat` events), or track `lastOnlineAt` in the display record.

### 3.2 DetectPage Always Assigns HDMI Connection Type
**File:** `packages/control-panel/src/pages/DetectPage.tsx`, lines 32-33
**Problem:** When adding a monitor, the code hardcodes `connectionType: ConnectionType.HDMI` and `portLabel: 'HDMI-${index}'` for every monitor. DisplayPort monitors are misidentified as HDMI.
**Expected:** Detect the actual connection type from the monitor hardware data, or at minimum let the user choose.

### 3.3 SettingsModal Does Not Preserve Unknown/Extended Settings Fields
**File:** `packages/control-panel/src/components/modals/SettingsModal.tsx`, lines 44-46
**Problem:** `setForm({ ...DEFAULT_SETTINGS, ...settings })` spreads DEFAULT_SETTINGS first, then settings. This works for top-level keys, but if `settings` has nested objects with extra keys not in DEFAULT_SETTINGS, those get preserved. However, the real issue is on save (line 50): `updateSettings.mutate(form)` sends only the known `form` state. If the backend has added new settings fields that the frontend doesn't know about, they will be overwritten with defaults. This is a forward-compatibility issue.

### 3.4 SettingsModal Red Alert Section Has Optional Chaining on Potentially Missing redAlert
**File:** `packages/control-panel/src/components/modals/SettingsModal.tsx`, line 268
**Problem:** `form.redAlert?.enabled` and `form.redAlert?.watchedCities` use optional chaining, but `form` is typed as `AppSettings` where `redAlert` is a required field (not optional). The optional chaining is defensive but suggests the data shape may not always include `redAlert`, particularly if the settings were created before the redAlert feature was added. The spread `{ ...DEFAULT_SETTINGS, ...settings }` should cover this, but only at the top level -- if `settings` has `redAlert: undefined`, the spread would set it to `undefined`.

### 3.5 Identify All Displays Fires Mutations in Rapid Succession
**File:** `packages/control-panel/src/pages/DashboardPage.tsx`, lines 106-112
**Problem:** `handleIdentifyAll` loops through all enabled displays and calls `identifyDisplay.mutate(d.id)` in a tight loop with no delay. This could overwhelm the backend with simultaneous requests and the toast "identifying all displays" fires before any mutation completes. Also, `useMutation` does not guarantee all mutations succeed, and errors are not handled.
**Expected:** Either use a batch endpoint (like `POST /api/displays/identify-all`) or add sequential execution with error handling.

### 3.6 Ticker Preview Animation Duration Calculation Uses Stale scrollWidth
**File:** `packages/control-panel/src/pages/RunningMessagesPage.tsx`, lines 406-412
**Problem:** The `useEffect` calculates `scrollWidth` immediately after setting `scrollRef.current`, but the DOM may not have rendered the new text yet. This can result in `scrollWidth` being 0 or stale, causing incorrect animation duration.
**Expected:** Use `requestAnimationFrame` or `ResizeObserver` to get accurate scroll width after the DOM updates.

---

## 4. UI/UX Issues (Layout Problems, Missing Hebrew, RTL Issues)

### 4.1 Messages History Table Shows Raw English Position/Priority Values
**File:** `packages/control-panel/src/pages/MessagesPage.tsx`, line 232
**Problem:** `{msg.position}` renders the raw enum value like "bottom", "top", "center", "ticker" in English. The priority column (line 243) does translate to Hebrew, but the position column does not.
**Expected:** Map position values to Hebrew: "top" -> "למעלה", "bottom" -> "למטה", "center" -> "מרכז", "ticker" -> "טיקר".

### 4.2 AnalyticsPage Shows contentType in English
**File:** `packages/control-panel/src/pages/AnalyticsPage.tsx`, line 126
**Problem:** `{item.contentType}` in the content usage legend and `{h.contentType}` on line 190 display raw content type enum values like "WEB_URL", "HLS_STREAM" in English. These should be translated to Hebrew labels.
**Expected:** Map content types to Hebrew: "WEB_URL" -> "כתובת אינטרנט", "HLS_STREAM" -> "שידור HLS", etc.

### 4.3 Toggle Component Uses `left` for Knob Position (RTL Issue)
**File:** `packages/control-panel/src/components/ui/Toggle.tsx`, line 42
**Problem:** The toggle knob position is set with `left: checked ? 20 : 2`. In an RTL context, `left` still means physical left. Since the toggle is an isolated inline component, this likely renders correctly visually, but using `inset-inline-start` (or CSS logical properties) would be more RTL-correct. However, since the toggle container doesn't inherit RTL direction internally, this is a minor issue.

### 4.4 Modal Footer Uses flex-start (RTL Inconsistency)
**File:** `packages/control-panel/src/components/ui/Modal.css`, line 73
**Problem:** `.sc-modal-footer` uses `justify-content: flex-start`. In an RTL layout, `flex-start` is the right side, so buttons appear on the right. This is correct for RTL and places the primary action button on the right (start) side. No issue -- this is actually correct.

### 4.5 Sidebar Active Link Indicator Uses `border-left` Instead of `border-inline-end`
**File:** `packages/control-panel/src/layouts/AppShell.css`, lines 65-66, 77
**Problem:** The sidebar link uses `border-left: 2px solid transparent` and the active state uses `border-left-color: var(--accent)`. In RTL, the sidebar is on the right. `border-left` draws on the physical left side of the link (away from the sidebar edge). For the active indicator to appear on the sidebar edge (which in RTL is the left side of the sidebar, i.e., the edge closest to the main content), `border-left` is actually correct since the sidebar is on the right and the border-left faces the content area. This is acceptable.

### 4.6 Missing Sidebar Section Separator for "Running Messages" and "Alerts"
**File:** `packages/control-panel/src/layouts/AppShell.tsx`, lines 12-23
**Problem:** The nav items include "Running Messages" and "Alerts" in the main "management" section, but these are not in the spec's sidebar structure (Section 6.1). The spec lists: Dashboard, Messages, Scheduler, Monitor Detection under "Management", then active displays, then Analytics under "System". The additions (Running Messages, Alerts) are custom features beyond the spec -- this is not necessarily wrong, but they should be documented.

### 4.7 "Running Messages" Page Not Referenced in Spec
**File:** `packages/control-panel/src/pages/RunningMessagesPage.tsx`
**Problem:** This entire page (ticker management) is not in the original spec. The spec describes a ticker mode as part of the message overlay system (position: "ticker"), not as a separate running messages/ticker configuration page. This is an extension beyond the spec.

### 4.8 "Alerts" Page Not Referenced in Spec
**File:** `packages/control-panel/src/pages/AlertsPage.tsx`
**Problem:** The Red Alert / Pikud HaOref integration is not in the original spec. This is a custom feature extension. While functional, it adds complexity not covered by the spec.

### 4.9 No 404/Catch-All Route
**File:** `packages/control-panel/src/App.tsx`
**Problem:** If the user navigates to an unknown URL (e.g., `/unknown`), the app renders the `AppShell` with an empty `<Outlet />`. There is no 404 page or redirect to the dashboard.
**Expected:** Add a catch-all `<Route path="*" element={<Navigate to="/" />} />` or a Hebrew 404 page.

### 4.10 DisplayCard URL Display Mixes Hebrew Channel Name with English URL
**File:** `packages/control-panel/src/components/DisplayCard.tsx`, lines 153-154
**Problem:** When a channel name is found, it renders `channelName -- URL`. The mixed Hebrew name and LTR URL in the same `display-card-url` div (which has `direction: ltr`) causes the Hebrew channel name to appear right-aligned within an LTR context, creating a confusing bidirectional text situation.
**Expected:** Show the channel name separately (in RTL) and the URL below it (in LTR), or only show the channel name without the full URL.

### 4.11 Dashboard Active Messages Section Shows Duration as "X seconds" with Wrong Hebrew Abbreviation
**File:** `packages/control-panel/src/pages/DashboardPage.tsx`, line 191
**Problem:** `{msg.displayDuration}ש׳` uses the abbreviation `ש׳` which means "hours" (שעות). But `displayDuration` is in seconds. Should be `שנ׳` (שניות) or `ש'` for seconds.
**Expected:** `{msg.displayDuration}שנ׳` or spell out `שניות`.

---

## 5. Minor Issues (Code Quality, Edge Cases)

### 5.1 Badge Component Uses Inline Styles Extensively
**File:** `packages/control-panel/src/components/ui/Badge.tsx`
**Problem:** The entire Badge component is styled with inline `style={{}}` objects. Per CLAUDE.md: "No inline styles in React -- use CSS variables from the design system." Same applies to Toggle.tsx, Chip.tsx, and various places in SettingsModal.tsx.

### 5.2 Duplicate Channel Name Mappings
**File:** `packages/control-panel/src/components/DisplayCard.tsx`, lines 5-22 and `packages/control-panel/src/components/modals/ChangeUrlModal.tsx`, lines 24-46
**Problem:** The `CHANNEL_NAMES` map in DisplayCard.tsx and `PRESET_CHANNELS` in ChangeUrlModal.tsx duplicate the same data. If a channel URL changes, both files must be updated.
**Expected:** Extract to a shared constant file or derive from a single source of truth.

### 5.3 ImageInput Remove Button Positioned with `left` in RTL
**File:** `packages/control-panel/src/components/ui/ImageInput.tsx`, line 80
**Problem:** The image remove button "x" is positioned with `left: 4`. In an RTL layout, `left` is the far side (since reading starts from right). The button should use `inset-inline-start: 4px` or `right: 4` for RTL consistency. This button also uses the plain letter "x" instead of a proper close icon or Hebrew equivalent.

### 5.4 No Error Boundaries
**File:** `packages/control-panel/src/App.tsx`
**Problem:** There are no React error boundaries. If any lazy-loaded page throws during render, the entire app crashes with a white screen.
**Expected:** Wrap routes or the app in an error boundary that shows a Hebrew error message with a retry option.

### 5.5 Select Component Missing Placeholder/Empty Option Handling
**File:** `packages/control-panel/src/components/ui/Select.tsx`
**Problem:** The Select component renders all options from the `options` array but has no built-in support for a disabled placeholder option (like "-- choose --"). The SchedulerPage manually adds `{ value: '', label: 'choose display...' }` as the first option.

### 5.6 WebSocket Reconnection Does Not Re-Register Subscriptions
**File:** `packages/control-panel/src/lib/websocket.ts`
**Problem:** When the socket reconnects after a disconnect, the `dashboardEvents` event handlers are only registered once in the `getSocket()` function (lines 27-42). These Socket.IO event handlers survive reconnection since Socket.IO re-registers them. However, the `listeners` map is a global Map that is never cleared, so callbacks accumulate if components mount/unmount rapidly. The `subscribe` function returns an unsubscribe callback, but if a component forgets to call it, listeners leak.

### 5.7 Input Value Prop Type Mismatch for Number Inputs
**File:** Multiple (e.g., `SchedulerPage.tsx` line 152, `DashboardPage.tsx` line 270)
**Problem:** Number `<Input>` components pass `value={duration}` where `duration` is a `number`, but `<input>` expects `value` to be `string | ReadonlyArray<string> | number | undefined`. While React accepts numbers for input values, TypeScript strict mode with the `InputHTMLAttributes<HTMLInputElement>` type should handle this. However, when the user clears the field, `parseInt('', 10)` returns `NaN`, and the fallback `|| 30` prevents the input from being clearable -- users cannot temporarily clear the field to type a new number.

### 5.8 AlertsPage Config Object May Be Stale
**File:** `packages/control-panel/src/pages/AlertsPage.tsx`, line 38
**Problem:** `const config = settings?.redAlert ?? DEFAULT_SETTINGS.redAlert` creates a reference on every render. When `updateRedAlert` is called (line 69), it reads `config` from the current render, which may be stale if multiple updates are fired rapidly. The `settings` query might not have re-fetched yet.
**Expected:** Use functional updates or optimistic updates to prevent stale reads.

### 5.9 ChangeUrlModal Has Non-Secure HTTP URL in Presets
**File:** `packages/control-panel/src/components/modals/ChangeUrlModal.tsx`, line 39
**Problem:** `http://41.205.93.154/FOX-NEWS/index.m3u8` uses plain HTTP. Mixed content issues may arise if the control panel is served over HTTPS (unlikely for localhost but a concern for LAN access).

### 5.10 No Form Validation on Schedule Time Inputs
**File:** `packages/control-panel/src/pages/SchedulerPage.tsx`
**Problem:** The scheduler does not validate that `endTime > startTime`, that `startTime` is not in the past, or that the cron expression is valid. Invalid data is sent directly to the backend.
**Expected:** Client-side validation before submission.

### 5.11 ImageInput Component Not Exported from UI Index
**File:** `packages/control-panel/src/components/ui/index.ts`
**Problem:** `ImageInput` is not exported from the UI barrel file. Components import it directly: `import { ImageInput } from '../components/ui/ImageInput'`. This inconsistency means some UI components use the barrel export and others use direct imports.

### 5.12 usePlayHistory Does Not Accept displayId Parameter
**File:** `packages/control-panel/src/hooks/useAnalytics.ts`, lines 40-45
**Problem:** `usePlayHistory` fetches from `/analytics/history` with no query parameters. The spec says per-display filtering should be available. The backend route at `analytics.routes.ts` line 47 accepts `req.query` which likely supports a `displayId` filter, but the hook ignores this.

### 5.13 Unused Imports
**File:** `packages/control-panel/src/pages/RunningMessagesPage.tsx`, line 3
**Problem:** `useRef` is imported from React and used. `useEffect` and `useState` are used. However, in the parent component, `useRef` is not used -- it is only used in the child `TickerPreview`. This is fine since it is used in the same file. No actual unused imports found on close inspection.

### 5.14 No Loading/Error States for Mutations
**File:** Multiple pages
**Problem:** While most mutations handle `onSuccess` and `onError` via toasts, none show a loading spinner or disable the entire form while a mutation is in progress. Only submit buttons get `disabled={mutation.isPending}`, but users can still modify form fields during submission.

### 5.15 hardwareId Not Passed When Creating Display
**File:** `packages/control-panel/src/pages/DetectPage.tsx`, line 28
**Problem:** The `useCreateDisplay` mutation in `useDisplays.ts` does not include `hardwareId` in its type definition. The `createDisplay.mutate` call in DetectPage passes `name`, `monitorIndex`, `connectionType`, `portLabel`, `width`, `height`, `posX`, `posY` -- but the `Display` type has a required `hardwareId` field. The backend's `createDisplaySchema` may auto-generate this, but if it requires it, the request will fail validation.

### 5.16 No Responsive Design for Mobile/Tablet
**File:** `packages/control-panel/src/layouts/AppShell.css`
**Problem:** The sidebar is fixed at 260px with no responsive breakpoints. On screens smaller than ~800px, the main content area becomes too narrow. Only `AnalyticsPage.css` has a `@media` query. The control panel will be unusable on tablets without horizontal scrolling.
**Expected:** Add responsive breakpoints to collapse the sidebar into a hamburger menu on smaller screens, or at minimum add a scroll container.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 5 |
| Missing Implementation | 10 |
| Logic Error | 6 |
| UI/UX Issue | 11 |
| Minor Issue | 16 |
| **Total** | **48** |

### Top Priority Fixes
1. **Settings export HTTP method mismatch** (will 404 every time)
2. **Implement keyboard shortcuts** (HotkeysModal shows them but none work)
3. **Add "Refresh All" button** to dashboard
4. **Translate position values to Hebrew** in messages history table
5. **Fix uptime calculation** in DisplayCard (shows time since creation, not actual uptime)
6. **Fix DetectPage** always assigning HDMI connection type
7. **Add 404/catch-all route** to prevent blank pages
8. **Add confirmation dialog** before settings reset
9. **Show display names** instead of raw IDs in analytics and scheduler
10. **Add error boundary** to prevent full-app crashes
