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
      return `https://www.youtube.com/watch?v=${match[1]}`;
    }
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
  .ytp-paid-content-overlay, .ytp-endscreen-content,
  ytd-compact-promoted-video-renderer,
  #description, #actions, #menu, #sponsor-button,
  ytd-watch-next-secondary-results-renderer,
  #cinematics {
    display: none !important;
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
`;

const FULLPAGE_JS = `
(function() {
  // Inject fullpage CSS
  const style = document.createElement('style');
  style.textContent = ${JSON.stringify(FULLPAGE_CSS)};
  document.head.appendChild(style);

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

  // Run repeatedly to handle dynamic page load
  let attempts = 0;
  const interval = setInterval(() => {
    tryAutoplay();
    attempts++;
    if (attempts > 30) clearInterval(interval);
  }, 1000);

  // Also run on page load
  tryAutoplay();
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
