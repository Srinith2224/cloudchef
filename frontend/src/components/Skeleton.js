import React from 'react';

export const Skeleton = ({ className = '', style }) => <div className={`skeleton ${className}`} style={style} aria-hidden />;

/** Placeholder grid shown while recipes load. */
export const RecipeGridSkeleton = ({ count = 8 }) => (
  <div className="recipe-grid" aria-busy="true" aria-label="Loading recipes">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rcard rcard--skeleton">
        <Skeleton className="rcard__media" />
        <div className="rcard__body">
          <Skeleton style={{ height: 18, width: '75%' }} />
          <Skeleton style={{ height: 14, width: '45%', marginTop: 10 }} />
        </div>
      </div>
    ))}
  </div>
);

export default Skeleton;
