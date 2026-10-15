import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../components/Icon';
import Modal from '../components/Modal';

const UIContext = createContext(null);

let toastId = 0;

const TOAST_ICONS = { success: 'check_circle', error: 'error', info: 'info' };

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  /** toast('Saved') or toast('Could not save', 'error') */
  const toast = useCallback((message, type = 'success', options = {}) => {
    const id = ++toastId;
    setToasts((list) => [...list.slice(-2), { id, message, type, action: options.action }]);
    setTimeout(() => dismiss(id), options.duration || (type === 'error' ? 5000 : 3200));
    return id;
  }, [dismiss]);

  /** const ok = await confirm({ title, message, confirmLabel, danger }) */
  const confirm = useCallback((options) => new Promise((resolve) => {
    resolver.current = resolve;
    setDialog(options);
  }), []);

  const closeDialog = (result) => {
    setDialog(null);
    resolver.current?.(result);
    resolver.current = null;
  };

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <UIContext.Provider value={value}>
      {children}

      <div className="toast-stack" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              className={`toast toast--${t.type}`}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              role={t.type === 'error' ? 'alert' : 'status'}
            >
              <Icon name={TOAST_ICONS[t.type] || 'info'} />
              <span className="toast__text">{t.message}</span>
              {t.action && (
                <button type="button" className="toast__action" onClick={() => { t.action.onClick(); dismiss(t.id); }}>
                  {t.action.label}
                </button>
              )}
              <button type="button" className="toast__close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
                <Icon name="close" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Modal open={Boolean(dialog)} onClose={() => closeDialog(false)} size="sm" title={dialog?.title}>
        {dialog && (
          <>
            {dialog.message && <p className="dialog__message">{dialog.message}</p>}
            <div className="dialog__actions">
              <button type="button" className="btn btn-ghost" onClick={() => closeDialog(false)}>
                {dialog.cancelLabel || 'Cancel'}
              </button>
              <button
                type="button"
                className={`btn ${dialog.danger ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => closeDialog(true)}
                autoFocus
              >
                {dialog.confirmLabel || 'Confirm'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </UIContext.Provider>
  );
}

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside <UIProvider>');
  return ctx;
};
