import React, { useId, useState, useEffect } from 'react';

interface IlldoorLogoProps {
  /** Desired height in px (default: 28) */
  height?: number;
  /** Optional mobile height in px (e.g. 21) */
  mobileHeight?: number;
  /** 'light' uses dark text (#17130f) for light background; 'dark' uses white text for dark background */
  theme?: 'light' | 'dark';
  /** Optional extra classes */
  className?: string;
  /** Optional click handler */
  onClick?: () => void;
}

export const IlldoorLogo: React.FC<IlldoorLogoProps> = ({
  height = 28,
  mobileHeight,
  theme = 'light',
  className = '',
  onClick,
}) => {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeHeight = isMobile && mobileHeight ? mobileHeight : height;
  const scale = activeHeight / 110;
  const width = Math.round(588 * scale);

  const rawId = useId();
  const idPrefix = rawId.replace(/[^a-zA-Z0-9]/g, '_');

  return (
    <div
      onClick={onClick}
      className={`illdoor-wrap ${theme === 'dark' ? 'dark-theme' : ''} ${className}`}
      style={{
        width: `${width}px`,
        height: `${activeHeight}px`,
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
      role="img"
      aria-label="ILLDOOR Logo"
    >
      <div
        className="illdoor-stage"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '588px',
          height: '110px',
        }}
      >
        {/* Letters I, L, L */}
        <span className="illdoor-letter i">
          <span className="illdoor-glyph">I</span>
          <span className="illdoor-ball" />
        </span>

        <span className="illdoor-letter l1">
          <span className="illdoor-glyph">L</span>
          <span className="illdoor-ball" />
        </span>

        <span className="illdoor-letter l2">
          <span className="illdoor-glyph">L</span>
          <span className="illdoor-ball" />
        </span>

        {/* Door (D silhouette with animated swinging door leaf) */}
        <div className="illdoor-door">
          <svg viewBox="0 0 70 110" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`doorGrad_${idPrefix}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ef4d23" />
                <stop offset="100%" stopColor="#ff7a45" />
              </linearGradient>
              <filter id={`haloBlur_${idPrefix}`} x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="3.2" />
              </filter>
            </defs>

            {/* Static D-shaped platform/halo sitting behind the door — never moves */}
            <path
              className="door-halo"
              d="M3,4 H27 A51,51 0 0 1 27,106 H3 Z"
              fill={`url(#doorGrad_${idPrefix})`}
              opacity="0.18"
              filter={`url(#haloBlur_${idPrefix})`}
            />

            {/* The D itself is the door leaf: it swings open/closed on its flat left edge */}
            <g className="illdoor-door-leaf">
              <path d="M8,10 H26 A44,44 0 0 1 26,100 H8 Z" fill={`url(#doorGrad_${idPrefix})`} />
              <circle cx="19" cy="55" r="2.2" fill="#201410" opacity="0.55" />
            </g>
          </svg>
        </div>

        {/* Letters O, O, R */}
        <span className="illdoor-letter o1">
          <span className="illdoor-glyph">O</span>
          <span className="illdoor-ball" />
        </span>

        <span className="illdoor-letter o2">
          <span className="illdoor-glyph">O</span>
          <span className="illdoor-ball" />
        </span>

        <span className="illdoor-letter r">
          <span className="illdoor-glyph">R</span>
          <span className="illdoor-ball" />
        </span>
      </div>
    </div>
  );
};
