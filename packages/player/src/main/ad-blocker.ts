import { session } from 'electron';

/**
 * Ad-blocking module for the Electron player.
 *
 * Uses Electron's webRequest API to intercept and block network requests
 * to known ad-serving domains. This works at the session level so it
 * catches all requests from both BrowserWindow and <webview> tags.
 *
 * Additionally provides CSS and JS snippets that can be injected into
 * YouTube webview guests to hide ad UI elements and auto-skip pre-roll ads.
 */

// ------------------------------------------------------------------
// 1. Network-level blocking via webRequest
// ------------------------------------------------------------------

/**
 * Domains / URL patterns whose requests should be cancelled outright.
 * These cover Google/YouTube ad infrastructure as well as common
 * third-party ad networks that may appear in embedded content.
 */
const AD_URL_PATTERNS: RegExp[] = [
  // Google / YouTube ad servers
  /^https?:\/\/pagead2\.googlesyndication\.com/,
  /^https?:\/\/pagead\.l\.doubleclick\.net/,
  /^https?:\/\/googleads\.g\.doubleclick\.net/,
  /^https?:\/\/www\.googleadservices\.com/,
  /^https?:\/\/adservice\.google\.\w+/,
  /^https?:\/\/static\.doubleclick\.net/,
  /^https?:\/\/ad\.doubleclick\.net/,
  /^https?:\/\/ads\.google\.com/,
  /^https?:\/\/tpc\.googlesyndication\.com/,
  /^https?:\/\/securepubads\.g\.doubleclick\.net/,
  /^https?:\/\/partner\.googleadservices\.com/,

  // YouTube ad-specific paths
  /^https?:\/\/www\.youtube\.com\/api\/stats\/ads/,
  /^https?:\/\/www\.youtube\.com\/pagead\//,
  /^https?:\/\/www\.youtube\.com\/ptracking/,
  /^https?:\/\/www\.youtube\.com\/get_midroll_/,
  /^https?:\/\/yt3\.ggpht\.com\/.*\/ad_/,

  // YouTube ad manifest / video ad segments
  /^https?:\/\/rr[0-9]+---sn-.*\.googlevideo\.com\/.*(&|%26)adformat=/,
  /^https?:\/\/rr[0-9]+---sn-.*\.googlevideo\.com\/videoplayback.*ctier=L/,
  /^https?:\/\/www\.youtube\.com\/s\/player\/.*\/ad_/,
  /^https?:\/\/www\.youtube\.com\/youtubei\/v1\/player\/ad_break/,

  // General third-party ad networks
  /^https?:\/\/.*\.moatads\.com/,
  /^https?:\/\/.*\.serving-sys\.com/,
  /^https?:\/\/.*\.2mdn\.net/,
  /^https?:\/\/.*\.adsrvr\.org/,
  /^https?:\/\/.*\.googlesyndication\.com/,
  /^https?:\/\/.*\.googletagmanager\.com\/gtag/,
  /^https?:\/\/.*\.googletagservices\.com/,
  /^https?:\/\/.*\.sentry-cdn\.com/,

  // Tracking / analytics that slow down playback
  /^https?:\/\/www\.google-analytics\.com\//,
  /^https?:\/\/play\.google\.com\/log/,
];

/**
 * Initialise network-level ad blocking on the default Electron session.
 * Must be called **after** `app.whenReady()` but **before** any webview
 * or BrowserWindow loads content.
 */
export function initAdBlocker(): void {
  const ses = session.defaultSession;

  ses.webRequest.onBeforeRequest((details, callback) => {
    const { url } = details;

    for (const pattern of AD_URL_PATTERNS) {
      if (pattern.test(url)) {
        // Cancel the request silently
        callback({ cancel: true });
        return;
      }
    }

    // Allow everything else
    callback({ cancel: false });
  });

  console.log('[ad-blocker] Network-level ad blocking initialised');
}

// ------------------------------------------------------------------
// 2. CSS to inject into YouTube webview guests
// ------------------------------------------------------------------

/**
 * CSS rules that hide YouTube's ad-related UI elements.
 * Injected via `webContents.insertCSS()` on the webview's `dom-ready`.
 */
export const YOUTUBE_AD_HIDE_CSS = `
/* Pre-roll / mid-roll ad overlays */
.ytp-ad-module,
.video-ads,
.ytp-ad-overlay-container,
.ytp-ad-overlay-slot,
.ytp-ad-image-overlay,
.ytp-ad-text-overlay,
.ytp-ad-skip-button-container,
.ytp-ad-player-overlay,
.ytp-ad-player-overlay-layout,
.ytp-ad-player-overlay-instream-info,
.ytp-ad-action-interstitial,
.ytp-ad-action-interstitial-background,
.ytp-ad-action-interstitial-slot,
.ytp-ad-feedback-dialog-container,
.ytp-ad-preview-container,
.ytp-ad-progress,
.ytp-ad-progress-list,
.ad-showing .ytp-chrome-top,
.ytp-paid-content-overlay,
.ytd-promoted-sparkles-web-renderer,
.ytd-promoted-sparkles-text-search-renderer,
ytd-ad-slot-renderer,
ytd-in-feed-ad-layout-renderer,
ytd-banner-promo-renderer,
ytd-companion-slot-renderer,
ytd-promoted-video-renderer,
ytd-compact-promoted-video-renderer,
ytd-display-ad-renderer,
ytd-statement-banner-renderer,
ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
#masthead-ad,
#player-ads,
#panels > ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"],
tp-yt-paper-dialog:has(.ytd-enforcement-message-view-model),
/* Survey / feedback prompts that appear during ads */
.ytp-ad-survey,
.ytp-ad-survey-interstitial,
/* "Ad" badge in progress bar */
.ytp-ad-visit-advertiser-button,
.ytp-ad-button,
.ytp-ad-persistent-progress-bar-container {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  width: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}

/* Remove the yellow ad markers on the progress bar */
.ytp-progress-bar .ytp-ad-progress-list {
  display: none !important;
}

/* When an ad is showing, the player adds .ad-showing — hide the ad label */
.ad-showing .ytp-ad-player-overlay-layout__ad-info-container,
.ad-showing .ytp-ad-message-container {
  display: none !important;
}
`;

// ------------------------------------------------------------------
// 3. JS to inject into YouTube webview guests
// ------------------------------------------------------------------

/**
 * Script that runs inside the YouTube webview to:
 *  - Auto-click the "Skip Ad" button as soon as it appears
 *  - Fast-forward unskippable ads by seeking to the end
 *  - Remove ad overlay elements from the DOM
 */
export const YOUTUBE_AD_SKIP_JS = `
(function() {
  'use strict';

  // --- Skip button clicker ---
  function clickSkipButton() {
    // Modern skip button (2024+)
    const skipBtns = document.querySelectorAll(
      '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, button.ytp-ad-skip-button-modern'
    );
    for (const btn of skipBtns) {
      if (btn instanceof HTMLElement && btn.offsetParent !== null) {
        btn.click();
        return true;
      }
    }

    // Fallback: look for any clickable element with "Skip" text
    const allBtns = document.querySelectorAll('button, .ytp-ad-overlay-close-button');
    for (const btn of allBtns) {
      if (btn instanceof HTMLElement && btn.offsetParent !== null) {
        const text = (btn.textContent || '').toLowerCase();
        if (text.includes('skip') || text.includes('דלג')) {
          btn.click();
          return true;
        }
      }
    }
    return false;
  }

  // --- Fast-forward unskippable ads ---
  function fastForwardAd() {
    const player = document.querySelector('#movie_player');
    if (!player) return false;

    const isAdShowing = player.classList.contains('ad-showing');
    if (!isAdShowing) return false;

    const video = document.querySelector('video');
    if (!video) return false;

    // If the ad video has a finite duration, skip to the end
    if (video.duration && isFinite(video.duration) && video.duration > 0) {
      video.currentTime = video.duration;
      return true;
    }
    return false;
  }

  // --- Close overlay ads ---
  function closeOverlayAds() {
    const closeButtons = document.querySelectorAll(
      '.ytp-ad-overlay-close-button, .ytp-ad-overlay-close-container'
    );
    for (const btn of closeButtons) {
      if (btn instanceof HTMLElement) {
        btn.click();
      }
    }
  }

  // --- Mute ads (unmute when ad ends) ---
  let wasMutedByUs = false;
  function muteAdAudio() {
    const player = document.querySelector('#movie_player');
    const video = document.querySelector('video');
    if (!player || !video) return;

    const isAdShowing = player.classList.contains('ad-showing');
    if (isAdShowing && !video.muted) {
      video.muted = true;
      wasMutedByUs = true;
    } else if (!isAdShowing && wasMutedByUs) {
      video.muted = false;
      wasMutedByUs = false;
    }
  }

  // --- Main loop: runs every 500ms ---
  function adBlockTick() {
    clickSkipButton();
    fastForwardAd();
    closeOverlayAds();
    muteAdAudio();
  }

  // Run immediately and then on interval
  adBlockTick();
  const intervalId = setInterval(adBlockTick, 500);

  // Also observe DOM mutations for faster reaction
  const observer = new MutationObserver(() => {
    adBlockTick();
  });

  function startObserver() {
    const target = document.querySelector('#movie_player') || document.body;
    observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  // Start observer when player is available
  if (document.querySelector('#movie_player')) {
    startObserver();
  } else {
    const waitForPlayer = setInterval(() => {
      if (document.querySelector('#movie_player')) {
        clearInterval(waitForPlayer);
        startObserver();
      }
    }, 500);
    // Give up after 30 seconds
    setTimeout(() => clearInterval(waitForPlayer), 30000);
  }

  // Clean up if the page navigates away (SPA navigation)
  window.addEventListener('beforeunload', () => {
    clearInterval(intervalId);
    observer.disconnect();
  });
})();
`;
