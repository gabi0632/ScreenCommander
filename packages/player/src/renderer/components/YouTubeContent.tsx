import React, { useMemo } from 'react';

interface YouTubeContentProps {
  url: string;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

export function YouTubeContent({ url }: YouTubeContentProps): React.JSX.Element {
  const embedUrl = useMemo(() => {
    const videoId = extractYouTubeId(url);
    if (!videoId) return null;
    // controls=1 so user can unmute. YouTube blocks autoplay with sound in embeds.
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&loop=1&playlist=${videoId}&rel=0&modestbranding=1`;
  }, [url]);

  if (!embedUrl) {
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
    <iframe
      src={embedUrl}
      allow="autoplay; encrypted-media; fullscreen"
      allowFullScreen
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        background: '#000',
      }}
    />
  );
}
