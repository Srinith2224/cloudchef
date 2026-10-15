import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from './Icon';

let openCount = 0;

/**
 * Accessible modal. On phones it slides up as a bottom sheet.
 * Closes with Escape or a tap on the backdrop.
 */
export default function Modal({ open, onClose, title, children, size = 'md', footer, className = '' }) {
  const panelRef = useRef(null);
  const lastFocus = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    lastFocus.current = document.activeElement;
    openCount += 1;
    document.body.classList.add('no-scroll');

    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => {
      const target = panelRef.current?.querySelector('[autofocus], input, textarea, select, button:not(.modal__close)');
      (target || panelRef.current)?.focus();
    }, 60);

    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      openCount -= 1;
      if (openCount <= 0) document.body.classList.remove('no-scroll');
      lastFocus.current?.focus?.();
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
        >
          <motion.div
            ref={panelRef}
            className={`modal modal--${size} ${className}`}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98, transition: { duration: 0.16 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          >
            <div className="modal__grip" aria-hidden />
            {(title || onClose) && (
              <div className="modal__header">
                {title && <h2 className="modal__title">{title}</h2>}
                {onClose && (
                  <button type="button" className="icon-btn modal__close" onClick={onClose} aria-label="Close">
                    <Icon name="close" />
                  </button>
                )}
              </div>
            )}
            <div className="modal__body">{children}</div>
            {footer && <div className="modal__footer">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
