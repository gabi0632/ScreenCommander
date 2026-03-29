import React, { useRef, useEffect } from 'react';
import { getAudioDeviceLabel, buildAudioRoutingScript } from '../utils/audio-routing';

interface YouTubeContentProps {
  url: string;
}

function toWatchUrl(url: string): string | null {
  // Extract video ID from various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      // Preserve playlist parameter if present
      const listMatch = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
      const listParam = listMatch?.[1] ? `&list=${listMatch[1]}` : '';
      return `https://www.youtube.com/watch?v=${match[1]}${listParam}`;
    }
  }
  // Handle playlist-only URLs (youtube.com/playlist?list=...)
  // YouTube will resolve to the first video in the playlist
  const playlistOnlyMatch = url.match(/youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/);
  if (playlistOnlyMatch?.[1]) {
    return `https://www.youtube.com/playlist?list=${playlistOnlyMatch[1]}`;
  }

  // If it's already a youtube.com URL but we couldn't extract ID, load as-is
  if (/youtube\.com|youtu\.be/.test(url)) {
    return url;
  }
  return null;
}

// CSS injected into YouTube page to make the video player fill the viewport
const FULLPAGE_CSS = `
  /* Hide everything except the video player */
  #masthead-container, #top-row, #bottom-row, #info, #meta,
  #comments, #related, #secondary, #below, #chips,
  ytd-masthead, #guide, #guide-button, tp-yt-app-drawer,
  ytd-mini-guide-renderer, #header, #page-header,
  ytd-engagement-panel-section-list-renderer,
  #chat-container, #ticker, #panel-pages,
  ytd-watch-metadata, ytd-merch-shelf-renderer,
  .ytp-chrome-top, .ytp-pause-overlay,
  .ytp-paid-content-overlay,
  ytd-compact-promoted-video-renderer,
  #description, #actions, #menu, #sponsor-button,
  ytd-watch-next-secondary-results-renderer,
  #cinematics {
    display: none !important;
  }

  /* Hide the endscreen visually but keep it in the DOM so YouTube
     autoplay countdown and navigation still work */
  .ytp-endscreen-content {
    opacity: 0 !important;
    pointer-events: none !important;
  }

  html, body, ytd-app, #content, #page-manager,
  ytd-watch-flexy, #full-bleed-container, #player-full-bleed-container,
  #movie_player, .html5-video-container, video {
    width: 100vw !important;
    height: 100vh !important;
    max-width: 100vw !important;
    max-height: 100vh !important;
    min-width: 100vw !important;
    min-height: 100vh !important;
    margin: 0 !important;
    padding: 0 !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    overflow: hidden !important;
  }

  video {
    object-fit: contain !important;
  }

  /* Remove all scrollbars */
  ::-webkit-scrollbar { display: none !important; }
  * { scrollbar-width: none !important; }

  /* Hide player controls after a moment, show on hover */
  .ytp-chrome-bottom {
    opacity: 0 !important;
    transition: opacity 0.3s !important;
  }
  #movie_player:hover .ytp-chrome-bottom {
    opacity: 1 !important;
  }

  /* Ensure dark background */
  html, body { background: #000 !important; }

  /* ---- Ad-blocking CSS ---- */
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
  ytd-promoted-sparkles-web-renderer,
  ytd-promoted-sparkles-text-search-renderer,
  ytd-ad-slot-renderer,
  ytd-in-feed-ad-layout-renderer,
  ytd-banner-promo-renderer,
  ytd-companion-slot-renderer,
  ytd-promoted-video-renderer,
  ytd-display-ad-renderer,
  ytd-statement-banner-renderer,
  #masthead-ad,
  #player-ads,
  .ytp-ad-survey,
  .ytp-ad-survey-interstitial,
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

  /* Remove yellow ad markers on the progress bar */
  .ytp-progress-bar .ytp-ad-progress-list {
    display: none !important;
  }

  /* Hide ad-showing label and messages */
  .ad-showing .ytp-ad-player-overlay-layout__ad-info-container,
  .ad-showing .ytp-ad-message-container {
    display: none !important;
  }
`;

const FULLPAGE_JS = `
(function() {
  // Inject fullpage CSS
  const style = document.createElement('style');
  style.textContent = ${JSON.stringify(FULLPAGE_CSS)};
  document.head.appendChild(style);

  // ---- Ad-blocking: skip ads and fast-forward unskippable ones ----
  function clickSkipButton() {
    var skipBtns = document.querySelectorAll(
      '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, button.ytp-ad-skip-button-modern'
    );
    for (var i = 0; i < skipBtns.length; i++) {
      var btn = skipBtns[i];
      if (btn.offsetParent !== null) {
        btn.click();
        return true;
      }
    }
    // Fallback: look for any clickable element with "Skip" text
    var allBtns = document.querySelectorAll('button, .ytp-ad-overlay-close-button');
    for (var j = 0; j < allBtns.length; j++) {
      var b = allBtns[j];
      if (b.offsetParent !== null) {
        var text = (b.textContent || '').toLowerCase();
        if (text.includes('skip') || text.includes('דלג')) {
          b.click();
          return true;
        }
      }
    }
    return false;
  }

  function fastForwardAd() {
    var player = document.querySelector('#movie_player');
    if (!player) return false;
    var isAdShowing = player.classList.contains('ad-showing');
    if (!isAdShowing) return false;
    var video = document.querySelector('video');
    if (!video) return false;
    if (video.duration && isFinite(video.duration) && video.duration > 0) {
      video.currentTime = video.duration;
      return true;
    }
    return false;
  }

  function closeOverlayAds() {
    var closeBtns = document.querySelectorAll(
      '.ytp-ad-overlay-close-button, .ytp-ad-overlay-close-container'
    );
    for (var i = 0; i < closeBtns.length; i++) {
      closeBtns[i].click();
    }
  }

  var wasMutedByAdBlocker = false;
  function muteAdAudio() {
    var player = document.querySelector('#movie_player');
    var video = document.querySelector('video');
    if (!player || !video) return;
    var isAdShowing = player.classList.contains('ad-showing');
    if (isAdShowing && !video.muted) {
      video.muted = true;
      wasMutedByAdBlocker = true;
    } else if (!isAdShowing && wasMutedByAdBlocker) {
      video.muted = false;
      wasMutedByAdBlocker = false;
    }
  }

  function adBlockTick() {
    clickSkipButton();
    fastForwardAd();
    closeOverlayAds();
    muteAdAudio();
  }

  // Run ad-blocker on an interval and via mutation observer
  adBlockTick();
  var adBlockInterval = setInterval(adBlockTick, 500);

  var adObserver = new MutationObserver(function() { adBlockTick(); });
  function startAdObserver() {
    var target = document.querySelector('#movie_player') || document.body;
    adObserver.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  }
  if (document.querySelector('#movie_player')) {
    startAdObserver();
  } else {
    var waitForPlayerEl = setInterval(function() {
      if (document.querySelector('#movie_player')) {
        clearInterval(waitForPlayerEl);
        startAdObserver();
      }
    }, 500);
    setTimeout(function() { clearInterval(waitForPlayerEl); }, 30000);
  }

  // Try to dismiss consent dialogs and click play
  function tryAutoplay() {
    // Dismiss cookie consent if present
    const consentButton = document.querySelector('button[aria-label*="Accept"], button[aria-label*="Agree"], .eom-button-row button:first-child, tp-yt-paper-button.ytd-consent-bump-v2-lightbox');
    if (consentButton) consentButton.click();

    // Click play button if paused
    const video = document.querySelector('video');
    if (video && video.paused) {
      video.play().catch(() => {});
    }
  }

  // Ensure YouTube's autoplay toggle is ON so the next video plays automatically
  function enableAutoplayToggle() {
    // The autoplay toggle button has a specific data attribute when it's off
    const toggle = document.querySelector('.ytp-autonav-toggle-button');
    if (toggle) {
      const isChecked = toggle.getAttribute('aria-checked');
      if (isChecked === 'false') {
        toggle.click();
      }
    }
  }

  // Use YouTube's internal player API to advance to the next video when current one ends
  function setupNextVideoHandler() {
    const video = document.querySelector('video');
    if (!video || video.__scNextHandlerAttached) return;
    video.__scNextHandlerAttached = true;

    video.addEventListener('ended', () => {
      // Give YouTube a moment to process the end state and trigger its own autoplay
      setTimeout(() => {
        // Check if YouTube already navigated (URL changed or video is playing again)
        const v = document.querySelector('video');
        if (v && !v.paused && v.currentTime < 5) return; // YouTube autoplay kicked in

        // Try using the internal player API to go to next video
        const player = document.getElementById('movie_player');
        if (player && typeof player.nextVideo === 'function') {
          player.nextVideo();
          return;
        }

        // Fallback: click the "next" button in the player controls
        const nextBtn = document.querySelector('.ytp-next-button');
        if (nextBtn && nextBtn.getAttribute('aria-disabled') !== 'true') {
          nextBtn.click();
          return;
        }

        // Fallback: click the autoplay video card in the endscreen
        const endscreenLink = document.querySelector('.ytp-endscreen-content a.ytp-endscreen-next, .ytp-autonav-endscreen-link-container a');
        if (endscreenLink) {
          endscreenLink.click();
          return;
        }

        // Last resort: find the "Up next" video link
        const upNextLink = document.querySelector('ytd-compact-autoplay-renderer a#thumbnail, a.ytp-suggestion-link');
        if (upNextLink) {
          upNextLink.click();
        }
      }, 2000);
    });
  }

  // When YouTube does SPA navigation to a new video, re-apply our setup
  function observeNavigation() {
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        // Re-attach the ended handler for the new video
        setTimeout(() => {
          const video = document.querySelector('video');
          if (video) {
            video.__scNextHandlerAttached = false;
            setupNextVideoHandler();
          }
          enableAutoplayToggle();
          tryAutoplay();
        }, 1500);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Run repeatedly to handle dynamic page load
  let attempts = 0;
  const interval = setInterval(() => {
    tryAutoplay();
    enableAutoplayToggle();
    setupNextVideoHandler();
    attempts++;
    if (attempts > 30) clearInterval(interval);
  }, 1000);

  // Also run on page load
  tryAutoplay();
  observeNavigation();
})();
`;

export function YouTubeContent({ url }: YouTubeContentProps): React.JSX.Element {
  const webviewRef = useRef<HTMLWebViewElement>(null);
  const watchUrl = toWatchUrl(url);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleDomReady = async () => {
      try {
        // @ts-expect-error -- Electron webview has executeJavaScript
        await webview.executeJavaScript(FULLPAGE_JS);
      } catch {
        // Best effort
      }

      // Audio routing
      if (!window.electronAPI) return;
      try {
        const config = await window.electronAPI.getConfig();
        const label = await getAudioDeviceLabel(config.displayId, config.backendUrl);
        if (label && webview) {
          const script = buildAudioRoutingScript(label);
          // @ts-expect-error -- Electron webview has executeJavaScript
          await webview.executeJavaScript(script);
        }
      } catch {
        // Audio routing is best-effort
      }
    };

    webview.addEventListener('dom-ready', handleDomReady);

    return () => {
      webview.removeEventListener('dom-ready', handleDomReady);
    };
  }, [url]);

  if (!watchUrl) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        color: '#ff4d6a',
        fontSize: 14,
      }}>
        Invalid YouTube URL
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#000' }}>
      <webview
        ref={webviewRef as React.RefObject<HTMLWebViewElement>}
        src={watchUrl}
        style={{ flex: '1 1 auto', display: 'flex', width: '100%', border: 'none' }}
        // @ts-expect-error -- Electron webview uses webpreferences attribute
        webpreferences="sandbox=yes"
      />
    </div>
  );
}
