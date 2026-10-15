import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Page from '../components/Page';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import Spinner, { PageLoader } from '../components/Spinner';
import CodeInput from '../components/CodeInput';
import PasswordInput from '../components/PasswordInput';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import '../styles/pages/settings.css';

const TABS = [
  { id: 'profile', label: 'Profile', icon: 'person' },
  { id: 'password', label: 'Password', icon: 'lock' },
  { id: 'account', label: 'Account', icon: 'manage_accounts' }
];

function ProfileTab() {
  const { user, updateUser } = useAuth();
  const { toast } = useUI();
  const [form, setForm] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [featured, setFeatured] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    api(`/users/${user.userId}`).then((u) => {
      setForm({ firstName: u.firstName, lastName: u.lastName, about: u.about || '', region: u.region || '', profilePhoto: u.profilePhoto || '' });
      setFeatured(u.featuredRecipe || '');
    }).catch((err) => toast(err.message, 'error'));
    api(`/recipes/user/${user.userId}`).then(setRecipes).catch(() => {});
  }, [user.userId, toast]);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  if (!form) return <PageLoader label="Loading your profile…" />;

  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  const pick = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast('Pick a photo file.', 'error');
    if (file.size > 8 * 1024 * 1024) return toast('Photos can be up to 8 MB.', 'error');
    setPhotoFile(file);
    setRemovePhoto(false);
    setPreview(URL.createObjectURL(file));
    return undefined;
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) return toast('First and last name can’t be empty.', 'error');
    setSaving(true);
    try {
      const data = new FormData();
      ['firstName', 'lastName', 'about', 'region'].forEach((k) => data.append(k, form[k]));
      if (photoFile) data.append('profilePhoto', photoFile);
      if (removePhoto) data.append('removePhoto', 'true');
      const res = await api(`/users/${user.userId}`, { method: 'PATCH', form: data });
      await api('/users/set-featured-recipe', { method: 'POST', body: { recipeId: featured || null } });
      updateUser({ firstName: res.firstName, lastName: res.lastName, profilePhoto: res.profilePhoto });
      setForm((f) => ({ ...f, profilePhoto: res.profilePhoto }));
      setPhotoFile(null);
      setPreview('');
      toast('Profile saved');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  const shownPhoto = removePhoto ? '' : preview || form.profilePhoto;

  return (
    <form className="settings__form" onSubmit={save}>
      <div className="settings__photo">
        <Avatar src={shownPhoto} firstName={form.firstName} lastName={form.lastName} size={96} />
        <div className="settings__photo-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}><Icon name="photo_camera" />{shownPhoto ? 'Change photo' : 'Add photo'}</button>
          {shownPhoto && <button type="button" className="btn btn-quiet btn-sm" onClick={() => { setRemovePhoto(true); setPhotoFile(null); setPreview(''); }}>Remove</button>}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files[0]); e.target.value = ''; }} />
        </div>
      </div>

      <div className="settings__grid">
        <label className="field"><span className="field__label">First name</span><input className="input" value={form.firstName} onChange={set('firstName')} maxLength={60} autoComplete="given-name" /></label>
        <label className="field"><span className="field__label">Last name</span><input className="input" value={form.lastName} onChange={set('lastName')} maxLength={60} autoComplete="family-name" /></label>
      </div>
      <label className="field">
        <span className="field__label">About you</span>
        <textarea className="textarea" rows={4} maxLength={500} value={form.about} onChange={set('about')} placeholder="What do you love to cook? Any kitchen speciality?" />
        <span className="field__hint">{form.about.length}/500</span>
      </label>
      <label className="field">
        <span className="field__label">Where you cook</span>
        <div className="input-group"><Icon name="location_on" /><input className="input" value={form.region} onChange={set('region')} maxLength={80} placeholder="e.g. Hanamkonda, Telangana" /></div>
      </label>
      <label className="field">
        <span className="field__label">Featured recipe</span>
        {recipes.length ? (
          <select className="select" value={featured} onChange={(e) => setFeatured(e.target.value)}>
            <option value="">None</option>
            {recipes.map((r) => <option key={r._id} value={r._id}>{r.title}</option>)}
          </select>
        ) : (
          <span className="field__hint">Share a recipe to feature it on your profile. <Link to="/new-recipe" className="link">Write one</Link></span>
        )}
      </label>
      <div className="settings__actions">
        <Link to={`/cook/${user.userId}`} className="btn btn-quiet">View my public profile</Link>
        <button className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : 'Save profile'}</button>
      </div>
    </form>
  );
}

function PasswordTab() {
  const { user } = useAuth();
  const { toast } = useUI();
  const [step, setStep] = useState('new');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const send = async (e) => {
    e?.preventDefault();
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirmPw) return setError('The two passwords don’t match.');
    setBusy(true);
    setError('');
    try {
      const res = await api('/otp/send-password-update-otp', { method: 'POST', body: { newPassword: password } });
      toast(res.message, 'info');
      setStep('code');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const verify = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/otp/verify-password-update-otp', { method: 'POST', body: { otp: code } });
      toast('Password updated');
      setStep('new');
      setPassword('');
      setConfirmPw('');
      setCode('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {step === 'new' ? (
        <motion.form key="new" className="settings__form" onSubmit={send} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <p className="muted">For your safety we’ll send a code to <strong>{user.email}</strong> before changing it.</p>
          <label className="field"><span className="field__label">New password</span><PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="At least 8 characters" /></label>
          <label className="field"><span className="field__label">Type it again</span><PasswordInput value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" placeholder="Same password" /></label>
          {error && <div className="notice notice--error" role="alert"><Icon name="error" />{error}</div>}
          <div className="settings__actions"><button className="btn btn-primary" disabled={busy || !password || !confirmPw}>{busy ? <Spinner /> : 'Send code'}</button></div>
        </motion.form>
      ) : (
        <motion.form key="code" className="settings__form" onSubmit={verify} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <p className="muted">Enter the 6-digit code we sent to <strong>{user.email}</strong>.</p>
          <CodeInput value={code} onChange={setCode} invalid={Boolean(error)} />
          {error && <div className="notice notice--error" role="alert"><Icon name="error" />{error}</div>}
          <div className="settings__actions">
            <button type="button" className="btn btn-quiet" onClick={() => { setStep('new'); setError(''); }}>Back</button>
            <button className="btn btn-primary" disabled={busy || code.length < 6}>{busy ? <Spinner /> : 'Update password'}</button>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

function AccountTab() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="settings__form">
      <div className="settings__row"><span className="muted">Email</span><strong>{user.email}</strong></div>
      <div className="settings__row"><span className="muted">Account type</span><span className={`badge ${user.role === 'admin' ? 'badge--brand' : ''}`}>{user.role === 'admin' ? 'Admin' : 'Cook'}</span></div>
      <div className="settings__actions settings__actions--start">
        <button type="button" className="btn btn-danger" onClick={() => { signOut(); navigate('/'); }}><Icon name="logout" />Sign out on this device</button>
      </div>
    </div>
  );
}

export default function Settings() {
  const [tab, setTab] = useState('profile');
  return (
    <Page title="Settings" className="settings">
      <h1 className="settings__title">Settings</h1>
      <div className="settings__layout">
        <nav className="settings__tabs" aria-label="Settings sections">
          {TABS.map((t) => (
            <button key={t.id} type="button" className={`settings__tab ${tab === t.id ? 'is-active' : ''}`} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
              {tab === t.id && <motion.span layoutId="settings-tab" className="settings__tab-bg" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
              <Icon name={t.icon} filled={tab === t.id} /><span>{t.label}</span>
            </button>
          ))}
        </nav>
        <section className="settings__panel panel">
          <h2 className="settings__panel-title">{TABS.find((t) => t.id === tab).label}</h2>
          {tab === 'profile' && <ProfileTab />}
          {tab === 'password' && <PasswordTab />}
          {tab === 'account' && <AccountTab />}
        </section>
      </div>
    </Page>
  );
}
