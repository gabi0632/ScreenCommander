# Player Package Code Review

**Package:** `packages/player`
**Review Date:** 2026-03-28
**Reviewer:** Claude Opus 4.6 (1M context)

---

## Critical Issues

### 1. `backendUrl` Protocol Mismatch in Renderer Audio Routing (VideoPlayer.tsx, LocalVideoContent.tsx)

**Files:** `src/renderer/components/VideoPlayer.tsx:112`, `src/renderer/components/LocalVideoContent.tsx:87`

The renderer calls `window.electronAPI.getConfig()` which returns the raw `PlayerConfig.backendUrl`. When the player is launched with the default CLI value (`ws://localhost:3000` from `DEFAULTS.WS_URL`), this `ws://` URL is passed directly to `fetch()` inside `autoRouteAudio()`:

```typescript
const displayRes = await fetch(`${backendUrl}/api/displays/${displayId}`);
const mapRes = await fetch(`${backendUrl}/api/system/display-audio-map`);
```

`fetch()` does not support `ws://` protocol. These calls will silently fail (caught by the try/catch), meaning audio routing will never work when using the default WebSocket URL.

The main process converts `ws://` to `http://` in `ws-client.ts:20` and `ws-client.ts:130`, but the renderer receives the raw unconverted value from `get-config` IPC handler.

**Expected:** Either convert the URL to HTTP before returning it from the `get-config` IPC handler, or convert it inside the renderer before making fetch calls.

---

### 2. Screenshot Interval Never Cleaned Up (index.ts:64)

**File:** `src/main/index.ts:64`

`startScreenshotCapture()` creates a `setInterval` that runs every 15 seconds, but the interval ID is never stored or cleaned up. When the app is shutting down (via `window-all-closed` or `before-quit`), `destroyHeartbeat()` and `destroyWebSocket()` are called, but the screenshot interval continues running. This can cause errors during shutdown when it tries to capture a page from a destroyed window (the `win.isDestroyed()` check mitigates crashes, but the interval itself leaks).

**Expected:** Store the interval ID and clear it during shutdown, similar to how `heartbeatTimer` is handled in `heartbeat.ts`.

---

### 3. `onExpire` Prop Accepted But Never Used in OverlayManager (OverlayManager.tsx:12)

**File:** `src/renderer/components/OverlayManager.tsx:12`

The `OverlayManager` component accepts `onExpire` in its props interface (line 8) but destructures it away and never passes it to `TextOverlay` children or uses it anywhere in the component body:

```typescript
export function OverlayManager({ overlays, hasActiveTicker }: OverlayManagerProps): React.JSX.Element {
```

The `onExpire` prop is deliberately excluded from the destructuring. However, `App.tsx:64` passes `dismissOverlay` as `onExpire`. This means individual overlay auto-expiry relies entirely on the timer in `useOverlays` hook, which does work. But if the intent was for `OverlayManager` to trigger expiry callbacks on animation completion or other UI events, that functionality is missing.

**Expected:** Either remove `onExpire` from the interface if it is intentionally unused, or wire it through to `TextOverlay` components.

---

### 4. Missing Type Declarations for Ticker API in electron-api.d.ts (electron-api.d.ts)

**File:** `src/renderer/types/electron-api.d.ts`

The `ElectronAPI` interface is missing `onTickerUpdate` and `onTickerClear` method declarations. These methods are defined in the preload script (`src/preload/index.ts:38-44`) and used in the renderer (`src/renderer/hooks/useTicker.ts:23-24`), but the TypeScript type declaration does not include them.

The code works at runtime because `contextBridge.exposeInMainWorld` exposes the actual functions regardless of type declarations. However, TypeScript strict mode should report type errors when accessing `window.electronAPI.onTickerUpdate` since it is not part of the declared interface. This may only compile because of `skipLibCheck` or because the `.d.ts` is not being properly included.

**Expected:** Add the following to the `ElectronAPI` interface:
```typescript
onTickerUpdate: (callback: Listener) => CleanupFn;
onTickerClear: (callback: Listener) => CleanupFn;
```

---

### 5. Inconsistent backendUrl Default Between CLI and Env Fallback (index.ts:26 vs cli-args.ts:9)

**File:** `src/main/index.ts:26` and `src/main/cli-args.ts:9`

The CLI args parser defaults `backend-url` to `DEFAULTS.WS_URL` which is `'ws://localhost:3000'` (line 9 of cli-args.ts).

The env fallback in `index.ts:26` defaults to `'http://localhost:3000'`:

```typescript
backendUrl: process.env['BACKEND_URL'] ?? 'http://localhost:3000',
```

This means the protocol used depends on which code path parsed the configuration. The WebSocket client (`ws-client.ts:20`) converts both `ws://` and `http://` URLs to `http://` for Socket.IO, so Socket.IO connection works either way. But the renderer receives the raw URL for fetch calls (see Issue #1), making the env fallback accidentally correct while the CLI default is broken for audio routing.

**Expected:** Use a consistent URL scheme. Store `http://` as the canonical form and derive `ws://` where needed, or always normalize in the IPC handler.

---

## Missing Implementations

### 6. RTMP Playback Not Implemented (VideoPlayer.tsx:101-103)

**File:** `src/renderer/components/VideoPlayer.tsx:101-103`

RTMP playback immediately returns an error message:

```typescript
if (type === 'rtmp') {
  setError('RTMP playback requires a transcoding proxy. Direct RTMP is not supported in Electron.');
  return;
}
```

The spec (prompt.md Section 5.2) lists RTMP as a supported content type and mentions "hls.js / video.js" for rendering. While direct RTMP is indeed not supported in browsers/Electron, the implementation simply shows an error with no fallback. There is no transcoding proxy, no video.js integration, and no alternative approach documented.

**Expected:** Either implement RTMP-to-HLS transcoding (e.g., via ffmpeg proxy), integrate video.js with RTMP support, or clearly document this limitation and remove RTMP from the content type enum/UI if it will never be supported.

---

### 7. No `get-player-state` Handler in Renderer (heartbeat.ts:50-52)

**File:** `src/main/heartbeat.ts:47-52`

The `requestRendererState()` function sends a `get-player-state` IPC message to the renderer:

```typescript
export function requestRendererState(): void {
  const win = getPlayerWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send('get-player-state');
  }
}
```

The preload exposes `onGetPlayerState` for this purpose (`preload/index.ts:47-49`), but the renderer (`App.tsx`) never registers a handler for it. The renderer only proactively pushes state via `sendPlayerState` in a `useEffect` (line 28-34), but never responds to pull-requests from the main process.

Additionally, `requestRendererState()` is exported but never called anywhere in the codebase.

**Expected:** Either remove the dead `requestRendererState` code, or implement a handler in `App.tsx` that responds to `get-player-state` events by calling `sendPlayerState`.

---

### 8. Single Instance Lock Disabled (index.ts:42-47)

**File:** `src/main/index.ts:42-47`

The single instance lock code is entirely commented out:

```typescript
// const gotLock = app.requestSingleInstanceLock({ displayId: config.displayId });
// if (!gotLock) {
//   console.error(`[player] Another instance is already running for display ${config.displayId}`);
//   app.quit();
// }
```

This means multiple Electron player instances can be accidentally launched for the same display, fighting over the same monitor and WebSocket registration. In a production multi-display setup, this could cause flicker, resource waste, or display conflicts.

**Expected:** Re-enable the single instance lock per display, or use a different mechanism (like PID files or named pipes) to prevent duplicate player instances for the same display.

---

### 9. `useTransition` Hook Defined But Never Used (useTransition.ts)

**File:** `src/renderer/hooks/useTransition.ts`

This entire hook (57 lines) is defined but never imported or used anywhere. The actual transition logic is handled by `TransitionWrapper.tsx` which has its own internal state management. This is dead code.

**Expected:** Either remove the unused hook, or refactor `TransitionWrapper` to use it for consistency.

---

## Logic Errors

### 10. Content Load Time Measurement Is Meaningless (useContentState.ts:29-33)

**File:** `src/renderer/hooks/useContentState.ts:29-33`

```typescript
const loadStart = performance.now();
requestAnimationFrame(() => {
  const loadTimeMs = Math.round(performance.now() - loadStart);
  window.electronAPI?.reportContentLoaded(data.url, loadTimeMs);
});
```

This measures the time between setting state and the next animation frame, which is approximately 16ms (one frame) regardless of actual content loading time. It does not measure how long the content (webview, video, image) actually takes to load. For a webview loading a website, the actual load could take seconds, but this will always report ~16ms.

**Expected:** Measure actual content load time, e.g., by having content components report when they finish loading (webview `did-finish-load`, video `canplay`, image `onload`).

---

### 11. Transition Exit Phase Return Value Ignored (TransitionWrapper.tsx:44)

**File:** `src/renderer/components/TransitionWrapper.tsx:40-44`

```typescript
const exitTimer = setTimeout(() => {
  setCurrentChildren(children);
  setPhase('enter');

  const enterTimer = setTimeout(() => {
    setPhase('idle');
  }, durationMs);

  return () => clearTimeout(enterTimer);  // This return is ignored
}, durationMs);
```

The inner `setTimeout` callback returns a cleanup function (`() => clearTimeout(enterTimer)`), but `setTimeout` callbacks' return values are discarded by the JavaScript runtime. If the component unmounts or the content changes again during the enter phase, the `enterTimer` will not be cleaned up, potentially causing a setState on an unmounted component.

**Expected:** Store `enterTimer` in a ref and clear it in the useEffect cleanup, or use a single cleanup approach.

---

### 12. `webview` `sandbox="true"` Is Not a Valid Electron Attribute (WebViewContent.tsx:59, CustomHtmlContent.tsx:35)

**Files:** `src/renderer/components/WebViewContent.tsx:59`, `src/renderer/components/CustomHtmlContent.tsx:35`

Electron's `<webview>` tag does not support a `sandbox` HTML attribute. The spec (prompt.md Section 12) requires `<webview>` sandbox=true for security. However, in Electron, webview guest pages run in a separate process by default, and sandboxing is controlled via `webPreferences` passed to the webview, not via an HTML attribute.

The `sandbox="true"` attribute will be silently ignored by Electron, meaning the webviews are not sandboxed as intended. The content loaded in the webview has full access to the renderer process capabilities.

**Expected:** Use `webpreferences="sandbox=true"` attribute on the webview tag, or configure sandboxing through the `did-attach-webview` event in the main process.

---

### 13. Overlay Auto-Expire Timer Not Cleared When Same Message Re-sent (useOverlays.ts:57-71)

**File:** `src/renderer/hooks/useOverlays.ts:57-71`

When an overlay with the same `messageId` is re-sent (e.g., resend from control panel), the existing overlay is filtered out from state, but its old auto-expire timer in `timersRef` is not cleared before a new timer is set:

```typescript
setOverlays((prev) => {
  const filtered = prev.filter((o) => o.messageId !== data.messageId);
  // ...
  return [...trimmed, overlay];
});

// New timer set, but old timer for same messageId not cleared
if (data.displayDurationSeconds > 0) {
  const timer = setTimeout(() => {
    dismissOverlay(data.messageId);
  }, data.displayDurationSeconds * 1000);
  timersRef.current.set(data.messageId, timer);
}
```

The `timersRef.current.set()` will overwrite the reference to the old timer, but the old `setTimeout` is still running. It will fire and call `dismissOverlay`, which will dismiss the newly re-sent overlay prematurely.

**Expected:** Clear the existing timer for the `messageId` before setting a new one:
```typescript
const existingTimer = timersRef.current.get(data.messageId);
if (existingTimer) clearTimeout(existingTimer);
```

---

### 14. CSP Blocks Dynamic Content Sources (index.html:6)

**File:** `src/renderer/index.html:6`

The Content Security Policy:
```
frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com;
```

This restricts `frame-src` to only YouTube domains and self. However, `WebViewContent.tsx` loads arbitrary URLs in webviews, and `YouTubeContent.tsx` uses an `<iframe>` for YouTube embeds. While Electron webviews may bypass CSP (they run in separate processes), the iframe-based YouTube embed is subject to CSP. The `frame-src` directive would block YouTube embeds if the iframe is in the main renderer page context.

Additionally, `connect-src` does not include `localhost:3000`, which could block fetch calls to the backend API from the renderer (for audio routing). The `'self'` might cover this if the renderer is served from the same origin, but in dev mode with `ELECTRON_RENDERER_URL` set to a different port, it could be blocked.

**Expected:** Ensure CSP allows all necessary sources: backend API for audio routing fetch calls, and verify that YouTube iframe embeds work under the current CSP.

---

## Electron-Specific Issues

### 15. `webSecurity: false` Disables Same-Origin Policy (window-manager.ts:44)

**File:** `src/main/window-manager.ts:44`

```typescript
webSecurity: false,
```

This disables the same-origin policy for the entire renderer process, including all webviews loaded within it. This means any webpage loaded in a webview can make requests to any origin, including `file://` URLs and the local filesystem. Combined with `sandbox: false` (line 47), this creates a significant security surface.

The spec (prompt.md Section 12) requires: "URL validation: block javascript: URLs in webview" and "Electron webview: sandbox=true". Both are currently violated.

**Expected:** Remove `webSecurity: false` or restrict it to development mode only. Enable `sandbox: true` in webPreferences.

---

### 16. `sandbox: false` in WebPreferences (window-manager.ts:47)

**File:** `src/main/window-manager.ts:47`

```typescript
sandbox: false,
```

The preload script requires `sandbox: false` because it uses Node.js `ipcRenderer` directly. However, the spec requires sandboxing for security. With `sandbox: false`, the renderer process (and by extension, content loaded via webviews with `nodeIntegration` potentially leaking through) has more access than necessary.

Modern Electron best practice is to use `sandbox: true` with `contextIsolation: true`. The preload script should work with sandboxing enabled since `contextBridge` and `ipcRenderer` are available in sandboxed preload scripts.

**Expected:** Set `sandbox: true`. The preload's use of `contextBridge` and `ipcRenderer` is compatible with sandboxed mode.

---

### 17. `new-window` Event Is Deprecated in Modern Electron (WebViewContent.tsx:28)

**File:** `src/renderer/components/WebViewContent.tsx:28`

```typescript
webview.addEventListener('new-window', handleNewWindow);
```

The `new-window` event on webview elements was deprecated in Electron. In Electron 28+ (which this project targets per the spec), new window requests from webviews should be handled via `setWindowOpenHandler` on the webContents, or through the `did-attach-webview` event in the main process.

The event listener may not fire at all in the targeted Electron version, meaning pop-ups from webview content would not be blocked.

**Expected:** Handle new window creation via the main process `did-attach-webview` handler or use `webContents.setWindowOpenHandler`.

---

### 18. Navigation Guard Incomplete (index.ts:112-121)

**File:** `src/main/index.ts:111-122`

```typescript
contents.on('will-navigate', (navEvent, url) => {
  const win = getPlayerWindow();
  if (contents === win?.webContents) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'file:' && !url.startsWith('http://localhost')) {
      navEvent.preventDefault();
    }
  }
});
```

Issues:
1. Only checks the main window's webContents, not webview guest contents. Webviews loaded with arbitrary URLs can navigate freely.
2. Allows all `file:` protocol URLs, which could be used to navigate to sensitive local files.
3. Allows any `http://localhost` URL regardless of port, which could include other local services.
4. Does not handle `https://localhost` URLs.
5. The `new URL(url)` call can throw if `url` is malformed, which would crash the handler (no try/catch).

**Expected:** Add error handling around URL parsing. Consider restricting `file:` URLs to the app's own files. Apply navigation guards to webview contents as well.

---

## Minor Issues

### 19. Duplicated `autoRouteAudio` Function (VideoPlayer.tsx:30-90, LocalVideoContent.tsx:24-72)

**Files:** `src/renderer/components/VideoPlayer.tsx:30-90`, `src/renderer/components/LocalVideoContent.tsx:24-72`

The `autoRouteAudio` function is copy-pasted across two files with minor differences (the `DisplayAudioMapEntry` interface in `LocalVideoContent.tsx` is missing the `width` and `height` fields that exist in `VideoPlayer.tsx`). This violates DRY and creates a maintenance burden -- any bug fix or improvement must be applied in both places.

**Expected:** Extract `autoRouteAudio` into a shared utility module (e.g., `src/renderer/utils/audio-routing.ts`).

---

### 20. `IdentifyFlash` May Re-trigger on Parent Re-render (IdentifyFlash.tsx:14)

**File:** `src/renderer/components/IdentifyFlash.tsx:14`

```typescript
useEffect(() => {
  const timer = setTimeout(onComplete, IDENTIFY_DURATION_MS);
  return () => clearTimeout(timer);
}, [onComplete]);
```

The effect depends on `onComplete`. In `App.tsx`, `clearIdentify` is created with `useCallback` and has a stable reference, so this should be fine. However, if `onComplete` ever changes reference (e.g., if `clearIdentify` were to depend on changing state), the timer would be reset, extending the identify flash indefinitely. This is a fragile dependency.

**Expected:** Remove `onComplete` from the dependency array and use a ref to call the latest callback, or explicitly verify the callback stability.

---

### 21. `object-fit: cover` in global.css Conflicts with Component Styles (global.css:35)

**File:** `src/renderer/styles/global.css:35`

```css
webview, iframe, img, video {
  object-fit: cover;
}
```

This global rule sets `object-fit: cover` for all media elements. However, individual components set their own `object-fit`:
- `LocalVideoContent.tsx:110` sets `objectFit: 'contain'`
- `LocalImageContent.tsx:21` sets `objectFit: 'contain'`
- `VideoPlayer.tsx:185` sets `objectFit: 'cover'`

The inline styles should win over the CSS file, but the global rule can cause a flash of `cover` mode before React hydrates and applies inline styles. More importantly, it creates confusion about which style actually applies.

**Expected:** Remove the global `object-fit: cover` rule and let each component define its own object-fit behavior.

---

### 22. YouTube Embed Uses Deprecated Parameters (YouTubeContent.tsx:27)

**File:** `src/renderer/components/YouTubeContent.tsx:27`

```typescript
return `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&loop=1&playlist=${videoId}&rel=0&modestbranding=1`;
```

The `modestbranding` parameter was deprecated by YouTube in August 2023 and has no effect in the current embed player. Not a functional issue, but unnecessary.

**Expected:** Remove `modestbranding=1` from the embed URL.

---

### 23. No Cleanup for `will-navigate` Event Listener on Webview (WebViewContent.tsx:29-33)

**File:** `src/renderer/components/WebViewContent.tsx:29-33`

The `will-navigate` event listener is set up on the webview element in a `useEffect` that has an empty dependency array `[]`, but the webview `src` prop can change (via `url` prop changes). When the URL changes, React will update the `src` attribute but the event listener will remain from the initial mount. This is mostly fine since the listener references the same function, but the `handleWillNavigate` function checks `event.url` against `isJavaScriptUrl`, which is correct regardless of the current `src`.

However, the effect registers the listener only once on mount. If the webview element is recreated by React (e.g., due to key changes in a parent), the ref could become stale between the old and new DOM elements. Since the `url` prop is not in the dependency array, the listener won't re-attach to a new webview element.

**Expected:** Add `url` to the dependency array or use a ref callback pattern to ensure listeners are always attached to the current DOM element.

---

### 24. Error State Not Reset When URL Changes (LocalVideoContent.tsx:76-97)

**File:** `src/renderer/components/LocalVideoContent.tsx:76-97`

When the `url` prop changes (new video assigned), the `useEffect` runs again but never resets the `error` state to `null`. If a previous video failed, the error screen will continue showing even though the new URL might be valid.

```typescript
useEffect(() => {
  const video = videoRef.current;
  if (!video) return;
  // error state never reset here
  video.muted = false;
  // ...
}, [url]);
```

The same issue exists in `VideoPlayer.tsx` -- the `error` state is set via `setError` but never cleared when the URL changes.

**Expected:** Add `setError(null)` at the beginning of the `useEffect` in both components.

---

### 25. React StrictMode Double-Mount Effects (main.tsx:14-17)

**File:** `src/renderer/main.tsx:14-17`

```typescript
ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

React StrictMode in development causes effects to mount, unmount, and remount. This means:
- IPC listeners in hooks (`useContentState`, `useOverlays`, `useTicker`, `useIdentify`, `useConnectionStatus`) will be registered, unregistered, and re-registered
- The overlay auto-expire timers could fire during the cleanup/re-register cycle
- Heartbeat state updates could be briefly disconnected

While this is only a development-mode issue, it can make debugging confusing since events might appear to be missed or duplicated during development.

**Expected:** Be aware of this during development. Consider removing StrictMode if it causes persistent dev-time issues, or ensure all effects properly handle the double-mount pattern.

---

### 26. Unsafe Type Assertions Throughout Renderer (Multiple Files)

**Files:** Multiple renderer hooks and components

All IPC payloads received in the renderer are cast with `as` assertions without runtime validation:

- `useContentState.ts:21`: `const data = payload as ContentChangePayload;`
- `useOverlays.ts:44`: `const data = payload as OverlayShowPayload;`
- `useOverlays.ts:78`: `const data = payload as OverlayDismissPayload;`
- `useTicker.ts:12`: `const data = payload as TickerUpdatePayload;`
- `useIdentify.ts:23`: `const data = payload as DisplayIdentifyPayload;`
- `useConnectionStatus.ts:12`: `setConnected(status as boolean);`

If the backend ever sends a malformed payload (or the schema changes), these unsafe casts will cause runtime errors with no useful error messages. The project spec mandates Zod validation for all inputs.

**Expected:** Add Zod schema validation (using the schemas from `@screen-commander/shared`) to validate payloads before use, or at minimum add basic runtime type checks.

---

### 27. `ws` Package Listed as Dependency But Never Used (package.json:20)

**File:** `package.json:20`

```json
"ws": "^8.20.0"
```

The `ws` package is listed as a dependency, but the player uses `socket.io-client` (which uses its own WebSocket implementation) for all WebSocket communication. The `ws` package is never imported in any player source file. This adds unnecessary weight to the package.

`@types/ws` is also listed (line 16) but equally unused.

**Expected:** Remove `ws` and `@types/ws` from dependencies.

---

### 28. `insertCSS` for Cursor Hiding May Not Cover Webviews (window-manager.ts:62-63)

**File:** `src/main/window-manager.ts:62-63`

```typescript
if (config.noCursor) {
  playerWindow.webContents.insertCSS('* { cursor: none !important; }');
}
```

This CSS is injected into the main renderer page, but it does not propagate into webview guest pages. Content loaded in webviews (the primary display mechanism for WEB_URL content) will still show the cursor. Each webview has its own isolated document.

**Expected:** Also inject the CSS into webview guest pages via the `did-attach-webview` event handler, using `webContents.insertCSS` on the guest webContents.

---

### 29. `EmergencyPanel` Animation Exit Never Triggers (EmergencyPanel.tsx:31-32)

**File:** `src/renderer/components/EmergencyPanel.tsx:31-32`

```tsx
<AnimatePresence>
  <motion.div
    key="emergency-panel"
    initial={{ x: '100%' }}
    animate={{ x: 0 }}
    exit={{ x: '100%' }}
```

The `AnimatePresence` wraps a single `motion.div` with a static key `"emergency-panel"`. For `AnimatePresence` exit animations to trigger, the child must be conditionally removed (i.e., rendered or not based on state). But `EmergencyPanel` returns `null` early when `overlays.length === 0` (line 10), which means the `AnimatePresence` component itself is not rendered at all -- the exit animation never plays.

In `App.tsx:67`, `EmergencyPanel` is always rendered (not conditionally). The conditional is internal to the component. When overlays go from non-empty to empty, the component returns `null` immediately, unmounting the `AnimatePresence` and its children without allowing the exit animation to run.

**Expected:** Move the `AnimatePresence` to the parent (`App.tsx`) and conditionally render `EmergencyPanel` inside it, or restructure `EmergencyPanel` to always render `AnimatePresence` and conditionally render its children.

---

### 30. Ticker Direction Is LTR But Content Is Hebrew (ticker.css:16)

**File:** `src/renderer/styles/ticker.css:16`

```css
.ticker-bar {
  direction: ltr;
}
```

The ticker bar is set to LTR direction, but the content (messages from the ScreenCommander system) is predominantly Hebrew RTL text. This means Hebrew ticker text will scroll from left to right (the English reading direction), which is the opposite of what Hebrew readers would expect. In Hebrew news tickers, text typically scrolls from left to right as well (entering from left, exiting right) since the scroll direction is about the animation, not the text direction. However, the CSS animation scrolls content from right to left (standard English ticker direction):

```css
@keyframes ticker-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-100%); }
}
```

Combined with `padding-left: 100%`, text starts off-screen to the right and moves left. This is actually correct for Hebrew tickers (text enters from the right side of the screen). However, the `direction: ltr` on the container may cause issues with Hebrew text rendering (bidirectional text algorithm).

**Expected:** Verify the visual behavior with actual Hebrew text and consider using `direction: rtl` with adjusted animation if Hebrew text renders incorrectly.

---

### 31. `will-navigate` Event Handler on Webview Has Wrong Type (WebViewContent.tsx:22)

**File:** `src/renderer/components/WebViewContent.tsx:22`

```typescript
const handleWillNavigate = (event: Event & { url?: string }) => {
```

The Electron webview `will-navigate` event provides the URL as a property on the event object, but the exact shape depends on the Electron version. The type `Event & { url?: string }` is a best-guess that may not match the actual event shape. The cast `as EventListener` on line 29 further obscures type safety.

**Expected:** Use Electron's proper webview event types, or validate `event.url` more defensively.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 5 |
| Missing Implementation | 4 |
| Logic Error | 7 |
| Electron-Specific | 5 |
| Minor | 10 |
| **Total** | **31** |

The most impactful issues to address first are:
1. **Issue #1** (backendUrl protocol mismatch) -- breaks audio routing entirely
2. **Issue #13** (overlay timer not cleared on resend) -- causes premature overlay dismissal
3. **Issues #15/#16** (webSecurity/sandbox disabled) -- security violations per spec
4. **Issue #12** (webview sandbox attribute ineffective) -- false sense of security
5. **Issue #2** (screenshot interval leak) -- resource leak on shutdown
