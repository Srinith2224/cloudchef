import React, { useState } from 'react';
import Icon from './Icon';

/** Read-only stars, or an interactive picker when onChange is given. */
export default function StarRating({ value = 0, onChange, size = 18, className = '' }) {
  const [hover, setHover] = useState(0);
  const interactive = typeof onChange === 'function';
  const shown = hover || value;

  if (!interactive) {
    return (
      <span className={`stars ${className}`} aria-label={`${value.toFixed ? value.toFixed(1) : value} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((i) => {
          const fill = Math.max(0, Math.min(1, value - (i - 1)));
          return (
            <span key={i} className="star" style={{ fontSize: size }}>
              <Icon name="star" className="star__bg" filled />
              <span className="star__fill" style={{ width: `${fill * 100}%` }}><Icon name="star" filled /></span>
            </span>
          );
        })}
      </span>
    );
  }

  return (
    <span className={`stars stars--input ${className}`} role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
          className={`star-btn ${i <= shown ? 'is-on' : ''}`}
          style={{ fontSize: size }}
          onMouseEnter={() => setHover(i)}
          onFocus={() => setHover(i)}
          onBlur={() => setHover(0)}
          onClick={() => onChange(i)}
        >
          <Icon name="star" filled={i <= shown} />
        </button>
      ))}
    </span>
  );
}
