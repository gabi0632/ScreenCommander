import React from 'react';
import { ContentType } from '@screen-commander/shared';
import { WebViewContent } from './WebViewContent';
import { YouTubeContent } from './YouTubeContent';
import { VideoPlayer } from './VideoPlayer';
import { LocalVideoContent } from './LocalVideoContent';
import { LocalImageContent } from './LocalImageContent';
import { CustomHtmlContent } from './CustomHtmlContent';
import { ErrorScreen } from './ErrorScreen';

interface ContentFrameProps {
  content: {
    contentType: string;
    url: string;
  } | null;
}

function detectEffectiveType(contentType: string, url: string): string {
  // Auto-detect content type from URL patterns regardless of declared type
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('.m3u8') || lowerUrl.includes('/hls/') || lowerUrl.includes('livehls')) {
    return ContentType.HLS_STREAM;
  }
  if (lowerUrl.startsWith('rtmp://')) {
    return ContentType.RTMP_STREAM;
  }
  if (/youtube\.com\/watch|youtu\.be\/|youtube\.com\/embed/i.test(url)) {
    return ContentType.YOUTUBE;
  }
  if (/\.(mp4|webm|ogg|mov|avi|mkv)(\?|$)/i.test(url)) {
    return ContentType.LOCAL_VIDEO;
  }
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(url)) {
    return ContentType.LOCAL_IMAGE;
  }
  return contentType;
}

export function ContentFrame({ content }: ContentFrameProps): React.JSX.Element {
  if (!content) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        color: '#333',
        fontSize: '14px',
        fontFamily: 'monospace',
      }}>
        STANDBY
      </div>
    );
  }

  const effectiveType = detectEffectiveType(content.contentType, content.url);

  switch (effectiveType) {
    case ContentType.WEB_URL:
      return <WebViewContent url={content.url} />;
    case ContentType.YOUTUBE:
      return <YouTubeContent url={content.url} />;
    case ContentType.HLS_STREAM:
      return <VideoPlayer url={content.url} type="hls" />;
    case ContentType.RTMP_STREAM:
      return <VideoPlayer url={content.url} type="rtmp" />;
    case ContentType.LOCAL_VIDEO:
      return <LocalVideoContent url={content.url} />;
    case ContentType.LOCAL_IMAGE:
      return <LocalImageContent url={content.url} />;
    case ContentType.CUSTOM_HTML:
      return <CustomHtmlContent html={content.url} />;
    default:
      return <ErrorScreen message={`Unsupported content type: ${effectiveType}`} />;
  }
}
