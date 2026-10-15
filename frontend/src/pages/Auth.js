import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import Lottie from 'lottie-react';
import Page from '../components/Page';
import Icon from '../components/Icon';
import Spinner from '../components/Spinner';
import CodeInput from '../components/CodeInput';
import PasswordInput from '../components/PasswordInput';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import cookingAnimation from '../assets/cooking-background.json';
import '../styles/pages/auth.css';

const slide = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, x: -24, transition: { duration: 0.16 } }
};

export default function Auth() {
  const [params, setParams] = useSearchParams();
  const mode = params.get('mode') === 'signup' ? 'signup' : 'signin';
  const [step, setStep] = useState('details'); // signup: details -> code
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(null);

  const { user, signIn } = useAuth();
  const { toast } = useUI();
  const navigate = useNavigate();
  const location = useLocation();
  const goTo = location.state?.from || '/explore';

  useEffect(() => {
    api('/google-client-id').then((d) => setGoogleClientId(d.clientId)).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) navigate(goTo, { replace: true });
  }, [user, goTo, navigate]);

  const setField = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  const switchMode = (next) => {
    setParams(next === 'signup' ? { mode: 'signup' } : {}, { replace: true });
    setStep('details');
    setError('');
    setInfo('');
    setCode('');
  };

  const finish = (session, message) => {
    signIn(session);
    toast(message);
    navigate(goTo, { replace: true });
  };

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onSignIn = (e) => {
    e.preventDefault();
    run(async () => {
      const session = await api('/login', { method: 'POST', body: { email: form.email, password: form.password } });
      finish(session, `Welcome back, ${session.firstName}`);
    });
  };

  const sendCode = (e) => {
    e?.preventDefault();
    run(async () => {
      const res = await api('/otp/send-registration-otp', { method: 'POST', body: form });
      setInfo(res.message);
      setStep('code');
      setCode('');
    });
  };

  const verify = (e) => {
    e.preventDefault();
    if (code.length < 6) return setError('Enter all 6 digits.');
    return run(async () => {
      const session = await api('/otp/verify-registration-otp', { method: 'POST', body: { email: form.email, otp: code } });
      finish(session, `Welcome to CloudChef, ${session.firstName}`);
    });
  };

  const onGoogle = (credential) => run(async () => {
    const session = await api('/google-signin', { method: 'POST', body: { token: credential.credential } });
    finish(session, `Welcome, ${session.firstName}`);
  });

  const heading = mode === 'signin' ? 'Welcome back' : step === 'code' ? 'Check your email' : 'Create your account';
  const sub = mode === 'signin'
    ? 'Sign in to save recipes, plan meals and keep your shopping list.'
    : step === 'code'
      ? info || `We sent a 6-digit code to ${form.email}.`
      : 'It takes a minute. We will email you a code to confirm it’s you.';

  return (
    <Page title={mode === 'signin' ? 'Sign in' : 'Create account'} className="auth">
      <div className="auth__layout">
        <section className="auth__card">
          <div className="segmented auth__switch" role="tablist">
            {['signin', 'signup'].map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                className={`segmented__btn ${mode === m ? 'is-active' : ''}`}
                onClick={() => switchMode(m)}
              >
                {mode === m && <motion.span layoutId="auth-seg" className="segmented__pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                <span>{m === 'signin' ? 'Sign in' : 'Sign up'}</span>
              </button>
            ))}
          </div>

          <h1 className="auth__title">{heading}</h1>
          <p className="auth__sub">{sub}</p>

          <AnimatePresence mode="wait" initial={false}>
            {mode === 'signin' && (
              <motion.form key="signin" {...slide} onSubmit={onSignIn} className="auth__form" noValidate>
                <div className="field">
                  <label className="field__label" htmlFor="email">Email</label>
                  <div className="input-group">
                    <Icon name="mail" />
                    <input id="email" className="input" type="email" autoComplete="email" value={form.email} onChange={setField('email')} placeholder="you@example.com" required />
                  </div>
                </div>
                <div className="field">
                  <div className="auth__label-row">
                    <label className="field__label" htmlFor="password">Password</label>
                    <Link to="/forgot-password" className="auth__link">Forgot password?</Link>
                  </div>
                  <PasswordInput id="password" value={form.password} onChange={setField('password')} placeholder="Your password" required />
                </div>
                {error && <div className="notice notice--error" role="alert"><Icon name="error" />{error}</div>}
                <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy || !form.email || !form.password}>
                  {busy ? <Spinner /> : 'Sign in'}
                </button>
              </motion.form>
            )}

            {mode === 'signup' && step === 'details' && (
              <motion.form key="signup" {...slide} onSubmit={sendCode} className="auth__form" noValidate>
                <div className="auth__names">
                  <div className="field">
                    <label className="field__label" htmlFor="firstName">First name</label>
                    <input id="firstName" className="input" autoComplete="given-name" value={form.firstName} onChange={setField('firstName')} required />
                  </div>
                  <div className="field">
                    <label className="field__label" htmlFor="lastName">Last name</label>
                    <input id="lastName" className="input" autoComplete="family-name" value={form.lastName} onChange={setField('lastName')} required />
                  </div>
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="su-email">Email</label>
                  <div className="input-group">
                    <Icon name="mail" />
                    <input id="su-email" className="input" type="email" autoComplete="email" value={form.email} onChange={setField('email')} placeholder="you@example.com" required />
                  </div>
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="su-password">Password</label>
                  <PasswordInput id="su-password" autoComplete="new-password" value={form.password} onChange={setField('password')} placeholder="At least 8 characters" required />
                  <PasswordStrength value={form.password} />
                </div>
                {error && <div className="notice notice--error" role="alert"><Icon name="error" />{error}</div>}
                <button
                  type="submit"
                  className="btn btn-primary btn-lg btn-block"
                  disabled={busy || !form.firstName || !form.lastName || !form.email || form.password.length < 8}
                >
                  {busy ? <Spinner /> : 'Send code'}
                </button>
              </motion.form>
            )}

            {mode === 'signup' && step === 'code' && (
              <motion.form key="code" {...slide} onSubmit={verify} className="auth__form" noValidate>
                <CodeInput value={code} onChange={setCode} invalid={Boolean(error)} />
                {error && <div className="notice notice--error" role="alert"><Icon name="error" />{error}</div>}
                <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy || code.length < 6}>
                  {busy ? <Spinner /> : 'Create account'}
                </button>
                <div className="auth__code-actions">
                  <button type="button" className="btn btn-quiet btn-sm" onClick={() => { setStep('details'); setError(''); }}>
                    <Icon name="arrow_back" />Change details
                  </button>
                  <button type="button" className="btn btn-quiet btn-sm" onClick={sendCode} disabled={busy}>
                    <Icon name="refresh" />Send a new code
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {googleClientId && step === 'details' && (
            <div className="auth__google">
              <div className="auth__or"><span>or</span></div>
              <GoogleOAuthProvider clientId={googleClientId}>
                <GoogleLogin
                  onSuccess={onGoogle}
                  onError={() => setError('Google sign in was cancelled or failed.')}
                  theme="filled_black"
                  shape="pill"
                  size="large"
                  text={mode === 'signup' ? 'signup_with' : 'signin_with'}
                  width="320"
                />
              </GoogleOAuthProvider>
            </div>
          )}
        </section>

        <aside className="auth__art" aria-hidden>
          <div className="auth__lottie">
            <Lottie animationData={cookingAnimation} loop />
          </div>
          <p className="auth__quote">“Cooking is like love. It should be entered into with abandon or not at all.”</p>
          <span className="auth__quote-by">Harriet Van Horne</span>
        </aside>
      </div>
    </Page>
  );
}

function PasswordStrength({ value }) {
  if (!value) return <span className="field__hint">Use 8 or more characters. A mix of letters and numbers is stronger.</span>;
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  const level = value.length < 8 ? 0 : Math.min(3, Math.ceil(score / 1.7));
  const labels = ['Too short', 'Okay', 'Good', 'Strong'];
  return (
    <div className={`strength strength--${level}`}>
      <div className="strength__bars">{[1, 2, 3].map((i) => <span key={i} className={i <= level ? 'on' : ''} />)}</div>
      <span className="strength__label">{labels[level]}</span>
    </div>
  );
}
