import React from 'react';
import { motion } from 'framer-motion';
import type { ActiveOverlay } from '../hooks/useOverlays';

interface TextOverlayProps {
  overlay: ActiveOverlay;
}

function getAnimationVariants(position: string) {
  if (position === 'ticker') {
    return {
      initial: { x: '-100%' },
      animate: { x: '100vw' },
      exit: { opacity: 0 },
    };
  }

  const isTop = position === 'top';
  const isCenter = position === 'center';

  return {
    initial: {
      opacity: 0,
      y: isCenter ? 0 : isTop ? -20 : 20,
      scale: isCenter ? 0.95 : 1,
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
    },
    exit: {
      opacity: 0,
      y: isCenter ? 0 : isTop ? -20 : 20,
      scale: isCenter ? 0.95 : 1,
    },
  };
}

function getTickerTransition(text: string) {
  const duration = Math.max(10, text.length * 0.15);
  return {
    x: {
      duration,
      ease: 'linear' as const,
      repeat: Infinity,
    },
  };
}

export function TextOverlay({ overlay }: TextOverlayProps): React.JSX.Element {
  const { text, imageUrl, imageSize = 50, position, style, priority } = overlay;
  const isTicker = position === 'ticker';
  const hasText = text && text.trim().length > 0;
  const hasImage = imageUrl && imageUrl.trim().length > 0;
  const imgMaxWidth = `${imageSize}%`;
  const imgMaxHeight = `${imageSize}vh`;

  const variants = getAnimationVariants(position);

  const priorityClass = priority === 'emergency'
    ? 'text-overlay--emergency'
    : priority === 'urgent'
      ? 'text-overlay--urgent'
      : '';

  // Image only — no text
  if (hasImage && !hasText) {
    return (
      <motion.div
        className={priorityClass}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: imgMaxWidth,
          maxWidth: 'none',
          padding: 0,
          pointerEvents: 'auto',
        }}
        initial={variants.initial}
        animate={variants.animate}
        exit={variants.exit}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <img
          src={imageUrl}
          alt=""
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: imgMaxHeight,
            objectFit: 'contain',
            borderRadius: '8px',
          }}
        />
      </motion.div>
    );
  }

  // Image + text — image as background, text overlaid
  if (hasImage && hasText) {
    return (
      <motion.div
        className={priorityClass}
        style={{
          position: 'relative',
          overflow: 'hidden',
          width: imgMaxWidth,
          maxWidth: 'none',
          padding: 0,
          borderRadius: '8px',
          pointerEvents: 'auto',
        }}
        initial={variants.initial}
        animate={variants.animate}
        exit={variants.exit}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <img
          src={imageUrl}
          alt=""
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '16px 24px',
            fontSize: `${style.fontSize}px`,
            color: style.fontColor,
            backgroundColor: style.backgroundColor,
            direction: 'rtl',
            unicodeBidi: 'embed',
            textAlign: 'center',
          }}
        >
          {'\u202B'}{text}{'\u202C'}
        </div>
      </motion.div>
    );
  }

  // Text only — original behavior
  return (
    <motion.div
      className={`text-overlay ${isTicker ? 'text-overlay--ticker' : ''} ${priorityClass}`}
      style={{
        fontSize: `${style.fontSize}px`,
        color: style.fontColor,
        backgroundColor: style.backgroundColor,
        direction: 'rtl',
        unicodeBidi: 'embed',
        textAlign: 'center',
      }}
      initial={variants.initial}
      animate={variants.animate}
      exit={variants.exit}
      transition={isTicker ? getTickerTransition(text) : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {'\u202B'}{text}{'\u202C'}
    </motion.div>
  );
}
