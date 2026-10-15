import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Page from '../components/Page';
import Icon from '../components/Icon';
import Spinner from '../components/Spinner';
import CodeInput from '../components/CodeInput';
import PasswordInput from '../components/PasswordInput';
import { api } from '../api/client';
import { useUI } from '../context/UIContext';
import '../styles/pages/auth.css';

const slide = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.28 } },
  exit: { opacity: 0, x: -24, transition: { duration: 0.15 } }
};

export default function ForgotPassword() {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { toast } = useUI();

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try { await fn(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const sendCode = (e) => {
    e?.preventDefault();
    run(async () => {
      const res = await api('/otp/send-password-reset-otp', { method: 'POST', body: { email } });
      setInfo(res.message);
      setStep('reset');
    });
  };

  const reset = (e) => {
    e.preventDefault();
    run(async () => {
      await api('/otp/verify-reset-otp', { method: 'POST', body: { email, otp: code, newPassword: password } });
      toast('Password updated. Sign in with your new password.');
      navigate('/auth', { replace: true });
    });
  };

  return (
    <Page title="Reset password" className="auth">
      <div className="auth__layout auth__layout--single">
        <section className="auth__card">
          <Link to="/auth" className="btn btn-quiet btn-sm auth__back"><Icon name="arrow_back" />Back to sign in</Link>
          <h1 className="auth__title">{step === 'email' ? 'Reset your password' : 'Choose a new password'}</h1>
          <p className="auth__sub">{step === 'email' ? 'Enter the email you signed up with. We will send you a 6-digit code.' : info}</p>

          <AnimatePresence mode="wait" initial={false}>
            {step === 'email' ? (
              <motion.form key="email" {...slide} className="auth__form" onSubmit={sendCode} noValidate>
                <div className="field">
                  <label className="field__label" htmlFor="fp-email">Email</label>
                  <div className="input-group">
                    <Icon name="mail" />
                    <input id="fp-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
                  </div>
                </div>
                {error && <div className="notice notice--error" role="alert"><Icon name="error" />{error}</div>}
                <button className="btn btn-primary btn-lg btn-block" disabled={busy || !email}>{busy ? <Spinner /> : 'Send code'}</button>
              </motion.form>
            ) : (
              <motion.form key="reset" {...slide} className="auth__form" onSubmit={reset} noValidate>
                <div className="field">
                  <span className="field__label">Code from your email</span>
                  <CodeInput value={code} onChange={setCode} invalid={Boolean(error)} />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="fp-new">New password</label>
                  <PasswordInput id="fp-new" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
                </div>
                {error && <div className="notice notice--error" role="alert"><Icon name="error" />{error}</div>}
                <button className="btn btn-primary btn-lg btn-block" disabled={busy || code.length < 6 || password.length < 8}>
                  {busy ? <Spinner /> : 'Update password'}
                </button>
                <button type="button" className="btn btn-quiet btn-sm" onClick={sendCode} disabled={busy}><Icon name="refresh" />Send a new code</button>
              </motion.form>
            )}
          </AnimatePresence>
        </section>
      </div>
    </Page>
  );
}
