import React, { useEffect, useState } from 'react';
import { assetUrl } from '../api/client';

const initials = (first = '', last = '') => `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || '?';

/** Profile photo with a colourful initials fallback (also used when the image fails to load). */
export default function Avatar({ src, firstName, lastName, size = 40, className = '' }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]); // a new photo gets a fresh try
  const hue = ((firstName || '').charCodeAt(0) * 37 + (lastName || '').charCodeAt(0) * 17) % 360 || 18;
  const style = { width: size, height: size, fontSize: Math.max(11, size * 0.38) };

  if (src && !broken) {
    return (
      <img
        src={assetUrl(src)}
        alt=""
        className={`avatar ${className}`}
        style={style}
        onError={() => setBroken(true)}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span className={`avatar avatar--initials ${className}`} style={{ ...style, background: `hsl(${hue} 45% 32%)` }} aria-hidden>
      {initials(firstName, lastName)}
    </span>
  );
}
