import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import Page, { PageHeader } from '../components/Page';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import { PageLoader } from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import { api, assetUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import '../styles/pages/admin.css';

const useData = (path) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api(path).then(setData).catch((e) => setError(e.message)); }, [path]);
  return [data, setData, error];
};

function Overview() {
  const [stats, , error] = useData('/admin/stats');
  if (error) return <EmptyState icon="error" title="Couldn’t load stats">{error}</EmptyState>;
  if (!stats) return <PageLoader />;
  const cards = [
    ['group', 'Cooks', stats.users, '/admin/users'],
    ['menu_book', 'Recipes', stats.recipes, '/admin/recipes'],
    ['star', 'Ratings', stats.ratings, null],
    ['flag', 'Open reports', stats.openReports, '/admin/reports']
  ];
  return (
    <div className="admin-stats">
      {cards.map(([icon, label, value, to]) => {
        const body = (<><Icon name={icon} /><strong>{value}</strong><span>{label}</span></>);
        return to ? <Link key={label} to={to} className={`admin-stat ${label === 'Open reports' && value ? 'is-alert' : ''}`}>{body}</Link> : <div key={label} className="admin-stat">{body}</div>;
      })}
    </div>
  );
}

function Users() {
  const { user: me } = useAuth();
  const { toast, confirm } = useUI();
  const [users, setUsers, error] = useData('/admin/users');
  const [q, setQ] = useState('');
  const list = useMemo(() => (users || []).filter((u) => `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q.toLowerCase())), [users, q]);

  const setRole = async (u, role) => {
    try {
      await api(`/admin/users/${u._id}/role`, { method: 'PATCH', body: { role } });
      setUsers((all) => all.map((x) => (x._id === u._id ? { ...x, role } : x)));
      toast(`${u.firstName} is now ${role === 'admin' ? 'an admin' : 'a cook'}`);
    } catch (err) { toast(err.message, 'error'); }
  };
  const remove = async (u) => {
    const ok = await confirm({ title: `Delete ${u.firstName} ${u.lastName}?`, message: `This also deletes their ${u.recipeCount} recipes, reviews, meal plan and shopping list. It can’t be undone.`, confirmLabel: 'Delete account', danger: true });
    if (!ok) return;
    try {
      await api(`/admin/users/${u._id}`, { method: 'DELETE' });
      setUsers((all) => all.filter((x) => x._id !== u._id));
      toast('Account deleted');
    } catch (err) { toast(err.message, 'error'); }
  };

  if (error) return <EmptyState icon="error" title="Couldn’t load users">{error}</EmptyState>;
  if (!users) return <PageLoader />;
  return (
    <>
      <div className="input-group admin-search"><Icon name="search" /><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" /></div>
      <ul className="admin-list">
        {list.map((u) => (
          <li key={u._id} className="admin-row">
            <Avatar src={u.profilePhoto} firstName={u.firstName} lastName={u.lastName} size={40} />
            <div className="admin-row__main">
              <Link to={`/cook/${u._id}`} className="admin-row__title">{u.firstName} {u.lastName}{u._id === me.userId && <span className="badge">You</span>}</Link>
              <span className="admin-row__sub">{u.email} · {u.recipeCount} recipes · joined {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}</span>
            </div>
            <select className="select admin-row__role" value={u.role === 'admin' ? 'admin' : 'user'} onChange={(e) => setRole(u, e.target.value)} disabled={u._id === me.userId} aria-label="Role">
              <option value="user">Cook</option>
              <option value="admin">Admin</option>
            </select>
            <button type="button" className="icon-btn icon-btn--danger" onClick={() => remove(u)} disabled={u._id === me.userId} aria-label={`Delete ${u.firstName}`}><Icon name="delete" /></button>
          </li>
        ))}
      </ul>
    </>
  );
}

function Recipes() {
  const { toast, confirm } = useUI();
  const [recipes, setRecipes, error] = useData('/admin/recipes');
  const [q, setQ] = useState('');
  const list = useMemo(() => (recipes || []).filter((r) => `${r.title} ${r.createdBy?.firstName} ${r.createdBy?.lastName}`.toLowerCase().includes(q.toLowerCase())), [recipes, q]);

  const remove = async (r) => {
    const ok = await confirm({ title: `Delete “${r.title}”?`, message: 'It will be removed for everyone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await api(`/admin/recipes/${r._id}`, { method: 'DELETE' });
      setRecipes((all) => all.filter((x) => x._id !== r._id));
      toast('Recipe deleted');
    } catch (err) { toast(err.message, 'error'); }
  };

  if (error) return <EmptyState icon="error" title="Couldn’t load recipes">{error}</EmptyState>;
  if (!recipes) return <PageLoader />;
  return (
    <>
      <div className="input-group admin-search"><Icon name="search" /><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recipes or cooks" /></div>
      <ul className="admin-list">
        {list.map((r) => (
          <li key={r._id} className="admin-row">
            {r.mainImage ? <img className="admin-row__thumb" src={assetUrl(r.mainImage)} alt="" /> : <span className="admin-row__thumb admin-row__thumb--empty"><Icon name="skillet" /></span>}
            <div className="admin-row__main">
              <Link to={`/recipe/${r._id}`} className="admin-row__title">{r.title}</Link>
              <span className="admin-row__sub">by {r.createdBy?.firstName} {r.createdBy?.lastName} · {r.ratingCount ? `${r.avgRating}★ (${r.ratingCount})` : 'no ratings'} · {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</span>
            </div>
            <Link to={`/edit-recipe/${r._id}`} className="icon-btn" aria-label="Edit"><Icon name="edit" /></Link>
            <button type="button" className="icon-btn icon-btn--danger" onClick={() => remove(r)} aria-label="Delete"><Icon name="delete" /></button>
          </li>
        ))}
      </ul>
    </>
  );
}

function Reports() {
  const { toast, confirm } = useUI();
  const [reports, setReports, error] = useData('/admin/reports');

  const setStatus = async (r, status) => {
    try {
      await api(`/admin/reports/${r._id}`, { method: 'PATCH', body: { status } });
      setReports((all) => all.map((x) => (x._id === r._id ? { ...x, status } : x)));
    } catch (err) { toast(err.message, 'error'); }
  };
  const removeRecipe = async (r) => {
    const ok = await confirm({ title: 'Delete the reported recipe?', message: `“${r.item?.title}” will be removed for everyone and the report closed.`, confirmLabel: 'Delete recipe', danger: true });
    if (!ok) return;
    try {
      await api(`/admin/recipes/${r.reportedItem}`, { method: 'DELETE' });
      setReports((all) => all.map((x) => (String(x.reportedItem) === String(r.reportedItem) ? { ...x, status: 'resolved', item: null } : x)));
      toast('Recipe deleted, report closed');
    } catch (err) { toast(err.message, 'error'); }
  };

  if (error) return <EmptyState icon="error" title="Couldn’t load reports">{error}</EmptyState>;
  if (!reports) return <PageLoader />;
  if (!reports.length) return <EmptyState icon="verified" title="No reports">When cooks report a recipe, it shows up here.</EmptyState>;
  return (
    <ul className="admin-list">
      {reports.map((r) => (
        <li key={r._id} className={`admin-row admin-row--report ${r.status === 'resolved' ? 'is-resolved' : ''}`}>
          <span className={`badge ${r.status === 'open' ? 'badge--brand' : 'badge--herb'}`}>{r.status === 'open' ? 'Open' : 'Resolved'}</span>
          <div className="admin-row__main">
            {r.item ? <Link to={`/recipe/${r.reportedItem}`} className="admin-row__title">{r.item.title}</Link> : <span className="admin-row__title muted">Recipe was deleted</span>}
            <span className="admin-row__sub">“{r.reason}” — {r.reportedBy ? `${r.reportedBy.firstName} ${r.reportedBy.lastName}` : 'deleted user'}, {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</span>
          </div>
          {r.status === 'open' ? (
            <>
              {r.item && <button type="button" className="btn btn-danger btn-sm" onClick={() => removeRecipe(r)}>Delete recipe</button>}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStatus(r, 'resolved')}>Dismiss</button>
            </>
          ) : (
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setStatus(r, 'open')}>Reopen</button>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function Admin() {
  return (
    <Page title="Admin" className="admin">
      <PageHeader title="Admin" subtitle="Manage cooks, recipes and reports." />
      <nav className="admin-tabs">
        {[['', 'Overview', 'dashboard'], ['users', 'Cooks', 'group'], ['recipes', 'Recipes', 'menu_book'], ['reports', 'Reports', 'flag']].map(([to, label, icon]) => (
          <NavLink key={label} to={`/admin${to ? `/${to}` : ''}`} end className="chip"><Icon name={icon} />{label}</NavLink>
        ))}
      </nav>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="users" element={<Users />} />
        <Route path="recipes" element={<Recipes />} />
        <Route path="reports" element={<Reports />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Page>
  );
}
