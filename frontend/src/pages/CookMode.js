import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Page from '../components/Page';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import { PageLoader } from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import { api, assetUrl } from '../api/client';
import { useUI } from '../context/UIContext';
import { unitLabel } from '../lib/format';
import '../styles/pages/cook.css';

const fmt = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};

/** A short kitchen-timer chime made with the Web Audio API (no sound files needed). */
const chime = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35, 0.7].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.32);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    /* audio not available */
  }
  navigator.vibrate?.([300, 120, 300]);
};

/** Keeps the phone screen on while cooking (where the browser supports it). */
function useWakeLock() {
  useEffect(() => {
    let lock = null;
    const request = async () => {
      try {
        if ('wakeLock' in navigator && document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen');
      } catch {
        /* not allowed, that's fine */
      }
    };
    request();
    const onVisible = () => document.visibilityState === 'visible' && request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release?.().catch(() => {});
    };
  }, []);
}

function TimerRing({ timer, minutes, onStart, onPause, onReset, onAdd }) {
  const total = minutes * 60 * 1000;
  const remaining = timer ? timer.remaining : total;
  const progress = total ? 1 - remaining / total : 0;
  const R = 54;
  const C = 2 * Math.PI * R;
  const done = timer && timer.remaining <= 0;

  return (
    <div className={`timer ${timer?.running ? 'is-running' : ''} ${done ? 'is-done' : ''}`}>
      <svg viewBox="0 0 120 120" className="timer__ring" aria-hidden>
        <circle cx="60" cy="60" r={R} className="timer__track" />
        <circle cx="60" cy="60" r={R} className="timer__progress" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
      </svg>
      <div className="timer__center">
        <span className="timer__time" aria-live="polite">{done ? 'Done' : fmt(remaining)}</span>
        <span className="timer__label">{timer?.running ? 'running' : done ? 'time is up' : 'timer'}</span>
      </div>
      <div className="timer__controls">
        {timer?.running ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onPause}><Icon name="pause" filled />Pause</button>
        ) : (
          <button type="button" className="btn btn-primary btn-sm timer__start" onClick={onStart}>
            <Icon name="play_arrow" filled />{timer && !done ? 'Resume' : done ? 'Restart' : `Start ${minutes} min`}
          </button>
        )}
        {timer && <button type="button" className="icon-btn" onClick={onReset} aria-label="Reset timer"><Icon name="restart_alt" /></button>}
        <button type="button" className="icon-btn" onClick={onAdd} aria-label="Add one minute"><Icon name="more_time" /></button>
      </div>
    </div>
  );
}

export default function CookMode() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useUI();
  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [finished, setFinished] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const [timers, setTimers] = useState({}); // stepIndex -> { remaining, running, endAt }
  const firedRef = useRef(new Set());

  useWakeLock();

  useEffect(() => {
    api(`/recipes/${id}`).then(setRecipe).catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    document.body.classList.add('cook-open');
    return () => document.body.classList.remove('cook-open');
  }, []);

  // Tick every running timer from its end time (accurate even if the tab sleeps)
  useEffect(() => {
    const anyRunning = Object.values(timers).some((t) => t.running);
    if (!anyRunning) return undefined;
    const tick = setInterval(() => {
      setTimers((all) => {
        const next = { ...all };
        Object.entries(all).forEach(([key, t]) => {
          if (!t.running) return;
          const remaining = t.endAt - Date.now();
          if (remaining <= 0) {
            next[key] = { ...t, remaining: 0, running: false };
            if (!firedRef.current.has(key)) {
              firedRef.current.add(key);
              chime();
              toast(`Step ${Number(key) + 1} timer is done`, 'info');
            }
          } else {
            next[key] = { ...t, remaining };
          }
        });
        return next;
      });
    }, 250);
    return () => clearInterval(tick);
  }, [timers, toast]);

  const steps = recipe?.steps || [];
  const step = steps[index];
  const isLast = index === steps.length - 1;

  const go = useCallback((delta) => {
    if (!steps.length) return;
    if (delta > 0 && isLast) {
      setFinished(true);
      return;
    }
    const next = Math.min(steps.length - 1, Math.max(0, index + delta));
    if (next === index) return;
    setDirection(delta);
    setIndex(next);
  }, [index, isLast, steps.length]);

  const exit = useCallback(() => navigate(`/recipe/${id}`), [navigate, id]);

  useEffect(() => {
    const onKey = (e) => {
      if (showIngredients || e.target.closest('input, textarea')) return;
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'Escape') exit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, exit, showIngredients]);

  const timerFor = (i) => timers[i];
  const startTimer = (i, minutes) => {
    firedRef.current.delete(String(i));
    setTimers((all) => {
      const current = all[i];
      const remaining = current && current.remaining > 0 ? current.remaining : minutes * 60000;
      return { ...all, [i]: { remaining, running: true, endAt: Date.now() + remaining } };
    });
  };
  const pauseTimer = (i) => setTimers((all) => ({ ...all, [i]: { ...all[i], running: false, remaining: Math.max(0, all[i].endAt - Date.now()) } }));
  const resetTimer = (i) => setTimers((all) => {
    const next = { ...all };
    delete next[i];
    return next;
  });
  const addMinute = (i, minutes) => {
    firedRef.current.delete(String(i));
    setTimers((all) => {
      const t = all[i];
      if (!t) return { ...all, [i]: { remaining: (minutes + 1) * 60000, running: false, endAt: 0 } };
      const remaining = Math.max(0, t.running ? t.endAt - Date.now() : t.remaining) + 60000;
      return { ...all, [i]: { ...t, remaining, endAt: Date.now() + remaining } };
    });
  };

  const otherRunning = useMemo(
    () => Object.entries(timers).filter(([key, t]) => Number(key) !== index && (t.running || t.remaining === 0)),
    [timers, index]
  );

  if (error) {
    return (
      <Page title="Cook mode">
        <EmptyState icon="no_meals" title="This recipe isn’t available" action={<Link className="btn btn-primary" to="/explore">Browse recipes</Link>}>{error}</EmptyState>
      </Page>
    );
  }
  if (!recipe) return <PageLoader label="Setting up your kitchen…" />;

  if (finished) {
    return (
      <Page title={`Cooking ${recipe.title}`} className="cook cook--done">
        <motion.div className="cook-done" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
          <motion.div className="cook-done__badge" initial={{ rotate: -20, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 14 }}>
            <Icon name="restaurant" />
          </motion.div>
          <h1>Enjoy your {recipe.title}</h1>
          <p>You made it through all {steps.length} steps. How did it turn out?</p>
          <div className="cook-done__actions">
            <Link to={`/recipe/${id}#reviews-title`} className="btn btn-primary btn-lg"><Icon name="star" filled />Rate this recipe</Link>
            <button type="button" className="btn btn-ghost btn-lg" onClick={() => { setFinished(false); setIndex(0); }}><Icon name="replay" />Start again</button>
          </div>
          <Link to="/explore" className="btn btn-quiet">Back to recipes</Link>
        </motion.div>
      </Page>
    );
  }

  const media = step?.video ? (
    <video key={step.video} className="cook__media" src={assetUrl(step.video)} poster={step.image ? assetUrl(step.image) : undefined} controls playsInline preload="metadata" />
  ) : step?.image ? (
    <img key={step.image} className="cook__media" src={assetUrl(step.image)} alt="" />
  ) : null;

  return (
    <Page title={`Cooking ${recipe.title}`} className="cook">
      <header className="cook__top">
        <button type="button" className="icon-btn" onClick={exit} aria-label="Exit cook mode"><Icon name="close" /></button>
        <div className="cook__heading">
          <span className="cook__recipe">{recipe.title}</span>
          <span className="cook__count">Step {index + 1} of {steps.length}</span>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowIngredients(true)}>
          <Icon name="grocery" /><span className="hide-mobile">Ingredients</span>
        </button>
      </header>

      <div className="cook__progress" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={index + 1}>
        {steps.map((_, i) => (
          <button key={i} type="button" className={`cook__seg ${i < index ? 'is-done' : ''} ${i === index ? 'is-current' : ''}`} onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); }} aria-label={`Go to step ${i + 1}`} />
        ))}
      </div>

      <div className="cook__stage">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.section
            key={index}
            className={`cook__step ${media ? 'has-media' : ''}`}
            custom={direction}
            initial={(d) => ({ opacity: 0, x: d * 60 })}
            animate={{ opacity: 1, x: 0 }}
            exit={(d) => ({ opacity: 0, x: d * -60 })}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(e, info) => {
              if (info.offset.x < -80) go(1);
              else if (info.offset.x > 80) go(-1);
            }}
          >
            <div className="cook__text">
              <span className="cook__num">{index + 1}</span>
              <p className="cook__instruction">{step.text}</p>
              {(step.ingredient || step.alternate) && (
                <div className="cook__extras">
                  {step.ingredient && <span className="badge"><Icon name="nutrition" />{step.ingredient}{step.quantity ? ` · ${step.quantity}` : ''}</span>}
                  {step.alternate && <span className="badge badge--herb">Swap: {step.alternate}</span>}
                </div>
              )}
              {step.timer > 0 && (
                <TimerRing
                  timer={timerFor(index)}
                  minutes={step.timer}
                  onStart={() => startTimer(index, step.timer)}
                  onPause={() => pauseTimer(index)}
                  onReset={() => resetTimer(index)}
                  onAdd={() => addMinute(index, step.timer)}
                />
              )}
            </div>
            {media && <div className="cook__visual">{media}</div>}
          </motion.section>
        </AnimatePresence>
      </div>

      {otherRunning.length > 0 && (
        <div className="cook__running">
          {otherRunning.map(([key, t]) => (
            <button key={key} type="button" className={`cook__pill ${t.remaining === 0 ? 'is-done' : ''}`} onClick={() => { setDirection(Number(key) > index ? 1 : -1); setIndex(Number(key)); }}>
              <Icon name="timer" />Step {Number(key) + 1}: {t.remaining === 0 ? 'done' : fmt(t.remaining)}
            </button>
          ))}
        </div>
      )}

      <footer className="cook__nav">
        <button type="button" className="btn btn-ghost btn-lg" onClick={() => go(-1)} disabled={index === 0}>
          <Icon name="arrow_back" /><span className="hide-mobile">Previous</span>
        </button>
        <span className="cook__hint hide-mobile">Swipe or use ← → keys</span>
        <button type="button" className="btn btn-primary btn-lg cook__next" onClick={() => go(1)}>
          {isLast ? 'Finish' : 'Next step'}<Icon name={isLast ? 'check' : 'arrow_forward'} />
        </button>
      </footer>

      <Modal open={showIngredients} onClose={() => setShowIngredients(false)} title="Ingredients" size="sm">
        <ul className="cook__ing">
          {recipe.ingredients.map((ing, i) => (
            <li key={i}><span>{ing.name}</span><strong>{ing.quantity} {unitLabel(ing.unit, ing.quantity)}</strong></li>
          ))}
        </ul>
      </Modal>
    </Page>
  );
}
