import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, TOKEN_KEY, USER_KEY } from '../api/client';

const AuthContext = createContext(null);

const readStoredUser = () => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    if (token && user && user.userId) return { ...user, token };
  } catch {
    /* ignore broken storage */
  }
  return null;
};

const persist = (session) => {
  try {
    if (session) {
      const { token, ...user } = session;
      if (token) localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  } catch {
    /* storage may be blocked (private mode); the session still lives in memory */
  }
};

// Clean up keys from the old version of the app
try {
  ['token', 'user'].forEach((k) => localStorage.removeItem(k));
} catch {
  /* ignore */
}

export function AuthProvider({ children }) {
  // Restore the session immediately so a page refresh keeps you signed in
  const [user, setUser] = useState(readStoredUser);
  const [ready, setReady] = useState(false);
  const [savedIds, setSavedIds] = useState(() => new Set());

  const signIn = useCallback((session) => {
    persist(session);
    setUser(session);
  }, []);

  const signOut = useCallback(() => {
    persist(null);
    setUser(null);
    setSavedIds(new Set());
    api('/logout', { method: 'POST' }).catch(() => {});
  }, []);

  /** Merge profile changes (name, photo...) into the stored session. */
  const updateUser = useCallback((changes) => {
    setUser((current) => {
      if (!current) return current;
      const next = { ...current, ...changes };
      persist(next);
      return next;
    });
  }, []);

  // On start-up, refresh the user details from the server (role or photo may have changed)
  useEffect(() => {
    let cancelled = false;
    const stored = readStoredUser();
    if (!stored) {
      setReady(true);
      return undefined;
    }
    api('/me')
      .then((fresh) => {
        if (!cancelled) signIn(fresh);
      })
      .catch((error) => {
        if (!cancelled && error.status === 401) {
          persist(null);
          setUser(null);
        }
      })
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, [signIn]);

  // Any 401 from the API signs the user out
  useEffect(() => {
    const onUnauthorized = () => {
      persist(null);
      setUser(null);
    };
    window.addEventListener('cloudchef:unauthorized', onUnauthorized);
    return () => window.removeEventListener('cloudchef:unauthorized', onUnauthorized);
  }, []);

  // Saved-recipe ids power the bookmark state on every card
  const refreshSaved = useCallback(() => {
    if (!user) return Promise.resolve();
    return api('/users/saved-ids')
      .then((ids) => setSavedIds(new Set(ids)))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (user?.userId) refreshSaved();
  }, [user?.userId, refreshSaved]);

  const toggleSaved = useCallback(async (recipeId) => {
    const isSaved = savedIds.has(recipeId);
    // Optimistic update so the bookmark responds instantly
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(recipeId);
      else next.add(recipeId);
      return next;
    });
    try {
      if (isSaved) await api('/users/delete-saved-recipe', { method: 'DELETE', body: { recipeId } });
      else await api('/users/save-recipe', { method: 'POST', body: { recipeId } });
      return !isSaved;
    } catch (error) {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (isSaved) next.add(recipeId);
        else next.delete(recipeId);
        return next;
      });
      throw error;
    }
  }, [savedIds]);

  const value = useMemo(
    () => ({ user, ready, signIn, signOut, updateUser, savedIds, toggleSaved, refreshSaved, isAdmin: user?.role === 'admin' }),
    [user, ready, signIn, signOut, updateUser, savedIds, toggleSaved, refreshSaved]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
