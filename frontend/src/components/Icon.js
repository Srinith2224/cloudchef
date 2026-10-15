import React from 'react';

/** Material Symbols Rounded icon. `filled` switches to the solid style. */
export default function Icon({ name, filled = false, className = '', size, label, ...rest }) {
  return (
    <span
      className={`icon ${filled ? 'icon--filled' : ''} ${className}`}
      style={size ? { fontSize: size } : undefined}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      {...rest}
    >
      {name}
    </span>
  );
}
