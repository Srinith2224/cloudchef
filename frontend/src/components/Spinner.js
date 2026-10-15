import React from 'react';

export default function Spinner({ size = 18, className = '' }) {
  return <span className={`spinner ${className}`} style={{ width: size, height: size }} role="status" aria-label="Loading" />;
}

/** Full-area loading state for pages. */
export const PageLoader = ({ label = 'Loading…' }) => (
  <div className="page-loader">
    <Spinner size={28} />
    <span>{label}</span>
  </div>
);
