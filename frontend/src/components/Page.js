import React, { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/** Wraps every route: sets the tab title and gives a short, calm page transition. */
export default function Page({ title, children, className = '', wide = false }) {
  const reduce = useReducedMotion();

  useEffect(() => {
    document.title = title ? `${title} · CloudChef` : 'CloudChef';
  }, [title]);

  return (
    <motion.main
      id="main"
      className={`page ${wide ? 'page--wide' : ''} ${className}`}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, y: -6, transition: { duration: 0.12 } }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.main>
  );
}

export const PageHeader = ({ title, subtitle, actions, children }) => (
  <header className="page-header">
    <div className="page-header__text">
      <h1 className="page-header__title">{title}</h1>
      {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      {children}
    </div>
    {actions && <div className="page-header__actions">{actions}</div>}
  </header>
);
