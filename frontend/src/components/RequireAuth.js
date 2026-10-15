import React, { useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Sends guests to sign in, then back to the page they wanted. */
export default function RequireAuth({ children, admin = false }) {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const mountedAt = useRef(location.pathname);

  // During the page-exit animation the old page is still on screen. If the user just
  // signed out there, don't redirect to sign-in; the app is already going elsewhere.
  if (window.location.pathname !== mountedAt.current) return user ? children : null;

  if (!user) return <Navigate to="/auth" replace state={{ from: location.pathname + location.search }} />;
  if (admin && !isAdmin) return <Navigate to="/explore" replace />;
  return children;
}
