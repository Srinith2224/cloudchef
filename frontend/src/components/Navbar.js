import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from './Icon';
import Avatar from './Avatar';
import { useAuth } from '../context/AuthContext';

const MAIN_LINKS = [
  { to: '/explore', label: 'Explore', icon: 'travel_explore' },
  { to: '/planner', label: 'Meal plan', icon: 'calendar_month', auth: true },
  { to: '/shopping-list', label: 'Shopping list', icon: 'shopping_basket', auth: true },
  { to: '/ai-chef', label: 'AI chef', icon: 'auto_awesome', auth: true }
];

const TAB_LINKS = [
  { to: '/explore', label: 'Explore', icon: 'travel_explore' },
  { to: '/saved', label: 'Saved', icon: 'bookmark' },
  { to: '/new-recipe', label: 'Create', icon: 'add', primary: true },
  { to: '/planner', label: 'Plan', icon: 'calendar_month' },
  { to: '/shopping-list', label: 'List', icon: 'shopping_basket' }
];

function UserMenu() {
  const { user, signOut, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const items = [
    { to: `/cook/${user.userId}`, icon: 'person', label: 'My profile' },
    { to: '/my-recipes', icon: 'menu_book', label: 'My recipes' },
    { to: '/saved', icon: 'bookmark', label: 'Saved recipes' },
    { to: '/ai-chef', icon: 'auto_awesome', label: 'AI chef', mobileOnly: true },
    { to: '/settings', icon: 'settings', label: 'Settings' },
    ...(isAdmin ? [{ to: '/admin', icon: 'shield_person', label: 'Admin' }] : [])
  ];

  return (
    <div className="usermenu" ref={ref}>
      <button
        type="button"
        className="usermenu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar src={user.profilePhoto} firstName={user.firstName} lastName={user.lastName} size={36} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="usermenu__panel"
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 500, damping: 34 }}
          >
            <div className="usermenu__head">
              <Avatar src={user.profilePhoto} firstName={user.firstName} lastName={user.lastName} size={44} />
              <div>
                <strong>{user.firstName} {user.lastName}</strong>
                <span>{user.email}</span>
              </div>
            </div>
            {items.map((item) => (
              <Link key={item.to} to={item.to} role="menuitem" className={`usermenu__item ${item.mobileOnly ? 'only-mobile' : ''}`}>
                <Icon name={item.icon} />{item.label}
              </Link>
            ))}
            <button
              type="button"
              role="menuitem"
              className="usermenu__item usermenu__item--danger"
              onClick={() => { signOut(); navigate('/'); }}
            >
              <Icon name="logout" />Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Navbar() {
  const { user } = useAuth();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const onLanding = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Full-screen cook mode hides the app chrome
  if (location.pathname.endsWith('/cook')) return null;

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <header className={`topbar ${scrolled ? 'is-scrolled' : ''} ${onLanding ? 'topbar--landing' : ''}`}>
        <div className="topbar__inner">
          <Link to={user ? '/explore' : '/'} className="brand" aria-label="CloudChef home">
            <img src="/cloudcheflogo.png" alt="" className="brand__logo" />
            <span className="brand__name">CloudChef</span>
          </Link>

          <nav className="topnav" aria-label="Main">
            {MAIN_LINKS.filter((l) => !l.auth || user).map((link) => (
              <NavLink key={link.to} to={link.to} className="topnav__link">
                {({ isActive }) => (
                  <>
                    <Icon name={link.icon} filled={isActive} />
                    <span>{link.label}</span>
                    {isActive && <motion.span layoutId="topnav-pill" className="topnav__pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="topbar__end">
            {user ? (
              <>
                <Link to="/new-recipe" className="btn btn-primary btn-sm hide-mobile">
                  <Icon name="add" />New recipe
                </Link>
                <UserMenu />
              </>
            ) : (
              <>
                <Link to="/auth" className="btn btn-ghost btn-sm">Sign in</Link>
                <Link to="/auth?mode=signup" className="btn btn-primary btn-sm hide-mobile">Create account</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {user && !onLanding && (
        <nav className="tabbar" aria-label="Main">
          {TAB_LINKS.map((tab) => (
            <NavLink key={tab.to} to={tab.to} className={`tabbar__link ${tab.primary ? 'tabbar__link--primary' : ''}`}>
              {({ isActive }) => (
                <>
                  <span className="tabbar__icon">
                    <Icon name={tab.icon} filled={isActive} />
                    {isActive && !tab.primary && <motion.span layoutId="tab-dot" className="tabbar__dot" />}
                  </span>
                  <span className="tabbar__label">{tab.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      )}
    </>
  );
}
