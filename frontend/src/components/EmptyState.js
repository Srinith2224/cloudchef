import React from 'react';
import Icon from './Icon';

export default function EmptyState({ icon = 'restaurant', title, children, action }) {
  return (
    <div className="empty">
      <div className="empty__icon"><Icon name={icon} /></div>
      <h3 className="empty__title">{title}</h3>
      {children && <p className="empty__text">{children}</p>}
      {action && <div className="empty__action">{action}</div>}
    </div>
  );
}
