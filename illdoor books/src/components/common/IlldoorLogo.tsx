import React, { useId } from 'react';

export interface IlldoorLogoProps {
  height?: number;
  mobileHeight?: number;
  className?: string;
  theme?: 'light' | 'dark';
  showText?: boolean;
}

export const IlldoorLogo: React.FC<IlldoorLogoProps> = ({
  height = 28,
  mobileHeight = 22,
  className = '',
  theme = 'light',
}) => {
  const rawId = useId();
  const idPrefix = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  const gradId = `doorGrad-${idPrefix}`;
  const filterId = `haloBlur-${idPrefix}`;

  const h = height;
  const mh = mobileHeight || height;

  const BASE_WIDTH = 588;
  const BASE_HEIGHT = 110;

  const deskScale = h / BASE_HEIGHT;
  const mobScale = mh / BASE_HEIGHT;

  const deskW = Math.round(BASE_WIDTH * deskScale);
  const mobW = Math.round(BASE_WIDTH * mobScale);

  return (
    <div
      className={`illdoor-logo-root relative select-none inline-flex items-center ${className}`}
      style={
        {
          '--desk-w': `${deskW}px`,
          '--desk-h': `${h}px`,
          '--desk-s': deskScale,
          '--mob-w': `${mobW}px`,
          '--mob-h': `${mh}px`,
          '--mob-s': mobScale,
        } as React.CSSProperties
      }
    >
      <div className="illdoor-viewport relative overflow-visible">
        <div className={`illdoor-wrap ${theme === 'dark' ? 'dark-theme' : ''}`}>
          <div className="illdoor-stage">
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

            <div className="illdoor-door">
              <svg viewBox="0 0 70 110" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ef4d23" />
                    <stop offset="100%" stopColor="#ff7a45" />
                  </linearGradient>
                  <filter id={filterId} x="-60%" y="-60%" width="220%" height="220%">
                    <feGaussianBlur stdDeviation="3.2" />
                  </filter>
                </defs>

                {/* static D-shaped platform/halo sitting behind the door — never moves */}
                <path
                  className="door-halo"
                  d="M3,4 H27 A51,51 0 0 1 27,106 H3 Z"
                  fill={`url(#${gradId})`}
                  opacity="0.18"
                  filter={`url(#${filterId})`}
                />

                {/* the D itself is the door leaf: it swings open/closed on its flat left edge */}
                <g className="illdoor-door-leaf">
                  <path d="M8,10 H26 A44,44 0 0 1 26,100 H8 Z" fill={`url(#${gradId})`} />
                  <circle cx="19" cy="55" r="2.2" fill="#201410" opacity="0.55" />
                </g>
              </svg>
            </div>

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
      </div>
    </div>
  );
};

