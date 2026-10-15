import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Page from '../components/Page';
import Icon from '../components/Icon';
import Spinner, { PageLoader } from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import { api, assetUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { TAG_GROUPS, UNITS, formatTime } from '../lib/format';
import '../styles/pages/editor.css';

const STEPS = [
  { id: 'basics', label: 'Basics' },
  { id: 'ingredients', label: 'Ingredients' },
  { id: 'method', label: 'Method' },
  { id: 'details', label: 'Tags & nutrition' },
  { id: 'review', label: 'Review' }
];

const DRAFT_KEY = 'cloudchef.recipeDraft';
const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_VIDEO = 50 * 1024 * 1024;

let uid = 0;
const key = () => `k${Date.now().toString(36)}${(uid += 1)}`;
const newIngredient = () => ({ key: key(), name: '', quantity: '', unit: '' });
const newStep = () => ({ key: key(), text: '', timer: '', ingredient: '', quantity: '', alternate: '', image: '', video: '', imageFile: null, videoFile: null, imagePreview: '', videoPreview: '', showMore: false });

const emptyRecipe = () => ({
  title: '',
  description: '',
  hours: 0,
  minutes: 30,
  servings: 2,
  ingredients: [newIngredient(), newIngredient(), newIngredient()],
  steps: [newStep(), newStep()],
  tags: [],
  nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  nutritionManual: false,
  mainImage: '',
  mainImageFile: null,
  mainImagePreview: '',
  removeMainImage: false
});

/** Converts a recipe from the API (or the AI chef) into editor state. */
const fromRecipe = (r) => ({
  ...emptyRecipe(),
  title: r.title || '',
  description: r.description || '',
  hours: r.totalTime?.hours || 0,
  minutes: r.totalTime?.minutes ?? 0,
  servings: r.servings || 2,
  ingredients: (r.ingredients?.length ? r.ingredients : [{}]).map((i) => ({ ...newIngredient(), name: i.name || '', quantity: String(i.quantity ?? ''), unit: i.unit || '' })),
  steps: (r.steps?.length ? r.steps : [{}]).map((s) => ({ ...newStep(), text: s.text || s.description || '', timer: s.timer ? String(s.timer) : '', ingredient: s.ingredient || '', quantity: s.quantity || '', alternate: s.alternate || '', image: s.image || '', video: s.video || '', showMore: Boolean(s.ingredient || s.alternate) })),
  tags: r.tags || [],
  nutrition: { calories: r.nutrition?.calories || 0, protein: r.nutrition?.protein || 0, carbs: r.nutrition?.carbs || 0, fat: r.nutrition?.fat || 0 },
  nutritionManual: Boolean(r._id && r.nutrition?.calories),
  mainImage: r.mainImage || ''
});

/** Draft without File objects / blob URLs (those can't be stored). */
const toDraft = (s) => ({
  ...s,
  mainImageFile: null,
  mainImagePreview: '',
  steps: s.steps.map((st) => ({ ...st, imageFile: null, videoFile: null, imagePreview: '', videoPreview: '' }))
});

const slide = {
  enter: (d) => ({ opacity: 0, x: d * 40 }),
  center: { opacity: 1, x: 0 },
  exit: (d) => ({ opacity: 0, x: d * -40 })
};

export default function RecipeEditor() {
  const { id } = useParams();
  const editing = Boolean(id);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { toast, confirm } = useUI();

  const [state, setState] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [stage, setStage] = useState(0);
  const [direction, setDirection] = useState(1);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const dirty = useRef(false);
  const coverInput = useRef(null);

  // Load: existing recipe, AI prefill, saved draft, or a blank form
  useEffect(() => {
    if (editing) {
      api(`/recipes/${id}`)
        .then((r) => {
          if (String(r.createdBy?._id) !== String(user.userId) && !isAdmin) {
            setLoadError('You can only edit your own recipes.');
            return;
          }
          setState(fromRecipe(r));
        })
        .catch((err) => setLoadError(err.message));
      return;
    }
    if (location.state?.prefill) {
      setState(fromRecipe(location.state.prefill));
      dirty.current = true;
      return;
    }
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (draft && draft.title !== undefined) {
        setState({ ...emptyRecipe(), ...draft });
        toast('We restored your unfinished recipe', 'info', {
          action: { label: 'Start over', onClick: () => { localStorage.removeItem(DRAFT_KEY); setState(emptyRecipe()); } }
        });
        return;
      }
    } catch {
      /* ignore */
    }
    setState(emptyRecipe());
  }, [editing, id, location.state, user.userId, isAdmin, toast]);

  const update = useCallback((changes) => {
    dirty.current = true;
    setState((s) => ({ ...s, ...(typeof changes === 'function' ? changes(s) : changes) }));
  }, []);

  // Autosave new recipes as a draft
  useEffect(() => {
    if (!state || editing || !dirty.current) return undefined;
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(toDraft(state))); } catch { /* full storage */ }
    }, 600);
    return () => clearTimeout(t);
  }, [state, editing]);

  // Warn before closing the tab with unsaved work
  useEffect(() => {
    const onUnload = (e) => {
      if (!dirty.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  // Free blob URLs when leaving
  const blobs = useRef(new Set());
  useEffect(() => () => blobs.current.forEach((u) => URL.revokeObjectURL(u)), []);
  const previewOf = (file) => {
    const url = URL.createObjectURL(file);
    blobs.current.add(url);
    return url;
  };

  // Live nutrition estimate from ingredients
  const ingredientSignature = state ? JSON.stringify(state.ingredients.map((i) => [i.name, i.quantity, i.unit])) : '';
  useEffect(() => {
    if (!state || state.nutritionManual) return undefined;
    const valid = state.ingredients.filter((i) => i.name.trim() && i.quantity.trim());
    if (!valid.length) return undefined;
    const t = setTimeout(() => {
      setEstimating(true);
      api('/recipes/calculate-nutrition', { method: 'POST', body: { ingredients: valid } })
        .then((n) => setState((s) => (s.nutritionManual ? s : { ...s, nutrition: { calories: n.calories, protein: n.protein, carbs: n.carbs, fat: n.fat } })))
        .catch(() => {})
        .finally(() => setEstimating(false));
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingredientSignature, state?.nutritionManual]);

  const validStage = useMemo(() => (s, i) => {
    const e = {};
    if (i === 0) {
      if (!s.title.trim()) e.title = 'Give your recipe a name.';
      if (!s.description.trim()) e.description = 'Add a sentence or two about the dish.';
      if (!(Number(s.hours) || Number(s.minutes))) e.time = 'How long does it take in total?';
    }
    if (i === 1) {
      const filled = s.ingredients.filter((ing) => ing.name.trim());
      if (!filled.length) e.ingredients = 'Add at least one ingredient.';
      else if (filled.some((ing) => !ing.quantity.trim())) e.ingredients = 'Every ingredient needs a quantity (for example 2, 200 or 1/2).';
    }
    if (i === 2 && !s.steps.some((st) => st.text.trim())) e.steps = 'Add at least one step.';
    return e;
  }, []);

  const goTo = (target) => {
    if (target > stage) {
      for (let i = stage; i < target; i += 1) {
        const e = validStage(state, i);
        if (Object.keys(e).length) {
          setErrors(e);
          setDirection(i > stage ? 1 : -1);
          setStage(i);
          return;
        }
      }
    }
    setErrors({});
    setDirection(target > stage ? 1 : -1);
    setStage(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loadError) {
    return (
      <Page title="Edit recipe">
        <EmptyState icon="lock" title="Can’t edit this recipe" action={<button className="btn btn-primary" onClick={() => navigate(-1)}>Go back</button>}>{loadError}</EmptyState>
      </Page>
    );
  }
  if (!state) return <PageLoader label={editing ? 'Opening your recipe…' : 'Getting the kitchen ready…'} />;

  /* ---------- field helpers ---------- */
  const setIngredient = (index, field, value) => update((s) => ({ ingredients: s.ingredients.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing)) }));
  const addIngredient = (focus = true) => {
    update((s) => ({ ingredients: [...s.ingredients, newIngredient()] }));
    if (focus) setTimeout(() => document.querySelector('.ing-row:last-child input')?.focus(), 30);
  };
  const removeIngredient = (index) => update((s) => ({ ingredients: s.ingredients.length > 1 ? s.ingredients.filter((_, i) => i !== index) : [newIngredient()] }));
  const moveItem = (list, index, delta) => {
    const next = list.slice();
    const target = index + delta;
    if (target < 0 || target >= next.length) return list;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  };

  const setStepField = (index, changes) => update((s) => ({ steps: s.steps.map((st, i) => (i === index ? { ...st, ...changes } : st)) }));
  const addStep = () => {
    update((s) => ({ steps: [...s.steps, newStep()] }));
    setTimeout(() => {
      const el = document.querySelectorAll('.step-card textarea');
      el[el.length - 1]?.focus();
    }, 30);
  };
  const removeStep = (index) => update((s) => ({ steps: s.steps.length > 1 ? s.steps.filter((_, i) => i !== index) : [newStep()] }));

  const pickStepMedia = (index, file, kind) => {
    if (!file) return;
    const isVideo = kind === 'video';
    if (isVideo ? !file.type.startsWith('video/') : !file.type.startsWith('image/')) return toast(`Pick a ${isVideo ? 'video' : 'photo'} file.`, 'error');
    if (file.size > (isVideo ? MAX_VIDEO : MAX_IMAGE)) return toast(isVideo ? 'Videos can be up to 50 MB.' : 'Photos can be up to 8 MB.', 'error');
    setStepField(index, isVideo ? { videoFile: file, videoPreview: previewOf(file) } : { imageFile: file, imagePreview: previewOf(file) });
    return undefined;
  };

  const pickCover = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast('Pick a photo file (JPG, PNG or WebP).', 'error');
    if (file.size > MAX_IMAGE) return toast('Photos can be up to 8 MB.', 'error');
    update({ mainImageFile: file, mainImagePreview: previewOf(file), removeMainImage: false });
    return undefined;
  };

  const toggleTag = (tag) => update((s) => ({ tags: s.tags.includes(tag) ? s.tags.filter((t) => t !== tag) : [...s.tags, tag] }));
  const addCustomTag = () => {
    const tag = tagInput.trim().replace(/,$/, '');
    if (!tag) return;
    if (state.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return setTagInput('');
    update((s) => ({ tags: [...s.tags, tag.slice(0, 30)] }));
    setTagInput('');
    return undefined;
  };

  const coverSrc = state.mainImagePreview || (!state.removeMainImage && state.mainImage ? assetUrl(state.mainImage) : '');
  const presetTags = Object.values(TAG_GROUPS).flat();

  /* ---------- submit ---------- */
  const submit = async () => {
    for (let i = 0; i < 3; i += 1) {
      const e = validStage(state, i);
      if (Object.keys(e).length) {
        setErrors(e);
        setDirection(-1);
        setStage(i);
        return;
      }
    }
    setSaving(true);
    try {
      const steps = state.steps.filter((st) => st.text.trim());
      const payload = {
        title: state.title.trim(),
        description: state.description.trim(),
        totalTime: { hours: Number(state.hours) || 0, minutes: Number(state.minutes) || 0 },
        servings: Number(state.servings) || 2,
        ingredients: state.ingredients.filter((i) => i.name.trim()).map(({ name, quantity, unit }) => ({ name: name.trim(), quantity: quantity.trim(), unit })),
        steps: steps.map((st) => ({
          text: st.text.trim(),
          timer: Number(st.timer) || 0,
          ingredient: st.ingredient.trim(),
          quantity: st.quantity.trim(),
          alternate: st.alternate.trim(),
          image: st.imageFile ? '' : st.image,
          video: st.videoFile ? '' : st.video
        })),
        tags: state.tags,
        nutrition: state.nutrition,
        removeMainImage: state.removeMainImage
      };

      const form = new FormData();
      form.append('recipe', JSON.stringify(payload));
      if (state.mainImageFile) form.append('mainImage', state.mainImageFile);
      steps.forEach((st, i) => {
        if (st.imageFile) form.append(`stepImage-${i}`, st.imageFile);
        if (st.videoFile) form.append(`stepVideo-${i}`, st.videoFile);
      });

      const saved = await api(editing ? `/recipes/${id}` : '/recipes', { method: editing ? 'PATCH' : 'POST', form });
      dirty.current = false;
      if (!editing) localStorage.removeItem(DRAFT_KEY);
      toast(editing ? 'Changes saved' : 'Recipe published');
      navigate(`/recipe/${saved._id}`, { replace: true });
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const discard = async () => {
    if (dirty.current) {
      const ok = await confirm({ title: editing ? 'Discard your changes?' : 'Discard this recipe?', message: 'What you typed will be lost.', confirmLabel: 'Discard', danger: true });
      if (!ok) return;
    }
    dirty.current = false;
    if (!editing) localStorage.removeItem(DRAFT_KEY);
    navigate(editing ? `/recipe/${id}` : '/explore');
  };

  /* ---------- stages ---------- */
  const stages = [
    // Basics
    <div key="basics" className="editor__stage">
      <div className="field">
        <label className="field__label" htmlFor="title">Recipe name</label>
        <input id="title" className="input input--big" value={state.title} maxLength={120} onChange={(e) => update({ title: e.target.value })} placeholder="e.g. Hyderabadi chicken biryani" aria-invalid={Boolean(errors.title)} autoFocus={!editing} />
        {errors.title && <span className="field__error">{errors.title}</span>}
      </div>
      <div className="field">
        <label className="field__label" htmlFor="description">Short description</label>
        <textarea id="description" className="textarea" rows={3} maxLength={1500} value={state.description} onChange={(e) => update({ description: e.target.value })} placeholder="What makes it good? Where is it from? Who is it for?" aria-invalid={Boolean(errors.description)} />
        {errors.description && <span className="field__error">{errors.description}</span>}
      </div>

      <div className="editor__grid2">
        <div className="field">
          <span className="field__label">Total time</span>
          <div className="editor__time">
            <label><input className="input" type="number" min="0" max="72" inputMode="numeric" value={state.hours} onChange={(e) => update({ hours: Math.max(0, Math.min(72, parseInt(e.target.value, 10) || 0)) })} aria-label="Hours" /><span>h</span></label>
            <label><input className="input" type="number" min="0" max="59" inputMode="numeric" value={state.minutes} onChange={(e) => update({ minutes: Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)) })} aria-label="Minutes" /><span>min</span></label>
          </div>
          {errors.time && <span className="field__error">{errors.time}</span>}
        </div>
        <div className="field">
          <span className="field__label">Makes</span>
          <div className="servings servings--lg">
            <button type="button" className="icon-btn" onClick={() => update((s) => ({ servings: Math.max(1, s.servings - 1) }))} aria-label="Fewer servings"><Icon name="remove" /></button>
            <span><strong>{state.servings}</strong> {state.servings === 1 ? 'serving' : 'servings'}</span>
            <button type="button" className="icon-btn" onClick={() => update((s) => ({ servings: Math.min(50, s.servings + 1) }))} aria-label="More servings"><Icon name="add" /></button>
          </div>
        </div>
      </div>

      <div className="field">
        <span className="field__label">Cover photo <span className="muted">(optional, but recipes with photos get more cooks)</span></span>
        <div
          className={`cover ${coverSrc ? 'has-image' : ''}`}
          onClick={() => coverInput.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('is-drag'); }}
          onDragLeave={(e) => e.currentTarget.classList.remove('is-drag')}
          onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('is-drag'); pickCover(e.dataTransfer.files[0]); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && coverInput.current?.click()}
        >
          {coverSrc ? (
            <>
              <img src={coverSrc} alt="Cover preview" />
              <div className="cover__overlay"><Icon name="photo_camera" />Change photo</div>
            </>
          ) : (
            <div className="cover__empty">
              <Icon name="add_photo_alternate" />
              <strong>Add a photo of the finished dish</strong>
              <span>Tap to choose, or drop an image here. JPG, PNG or WebP, up to 8 MB.</span>
            </div>
          )}
          <input ref={coverInput} type="file" accept="image/*" hidden onChange={(e) => { pickCover(e.target.files[0]); e.target.value = ''; }} />
        </div>
        {coverSrc && (
          <button type="button" className="btn btn-quiet btn-sm editor__remove-cover" onClick={() => update({ mainImageFile: null, mainImagePreview: '', removeMainImage: Boolean(state.mainImage) })}>
            <Icon name="delete" />Remove photo
          </button>
        )}
      </div>
    </div>,

    // Ingredients
    <div key="ingredients" className="editor__stage">
      <p className="muted editor__help">List everything, in the order you use it. Quantities can be like 2, 250 or 1/2.</p>
      <div className="ing-list" role="list">
        <AnimatePresence initial={false}>
          {state.ingredients.map((ing, i) => (
            <motion.div key={ing.key} className="ing-row" role="listitem" layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20, transition: { duration: 0.15 } }}>
              <input className="input ing-row__name" value={ing.name} onChange={(e) => setIngredient(i, 'name', e.target.value)} placeholder={i === 0 ? 'e.g. Basmati rice' : 'Ingredient'} aria-label={`Ingredient ${i + 1} name`}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.parentElement.querySelector('.ing-row__qty').focus(); } }} />
              <input className="input ing-row__qty" value={ing.quantity} onChange={(e) => setIngredient(i, 'quantity', e.target.value)} placeholder="Qty" inputMode="decimal" aria-label={`Ingredient ${i + 1} quantity`}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (i === state.ingredients.length - 1) addIngredient(); } }} />
              <select className="select ing-row__unit" value={ing.unit} onChange={(e) => setIngredient(i, 'unit', e.target.value)} aria-label={`Ingredient ${i + 1} unit`}>
                <option value="">unit</option>
                {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
              <div className="ing-row__tools">
                <button type="button" className="icon-btn" onClick={() => update((s) => ({ ingredients: moveItem(s.ingredients, i, -1) }))} disabled={i === 0} aria-label="Move up"><Icon name="arrow_upward" /></button>
                <button type="button" className="icon-btn icon-btn--danger" onClick={() => removeIngredient(i)} aria-label={`Remove ingredient ${i + 1}`}><Icon name="close" /></button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {errors.ingredients && <span className="field__error">{errors.ingredients}</span>}
      <button type="button" className="btn btn-ghost editor__add" onClick={() => addIngredient()}><Icon name="add" />Add ingredient</button>
    </div>,

    // Method
    <div key="method" className="editor__stage">
      <p className="muted editor__help">One action per step reads best in cook mode. Add a timer when the step involves waiting.</p>
      <AnimatePresence initial={false}>
        {state.steps.map((st, i) => {
          const imageSrc = st.imagePreview || (st.image ? assetUrl(st.image) : '');
          const videoSrc = st.videoPreview || (st.video ? assetUrl(st.video) : '');
          return (
            <motion.div key={st.key} className="step-card" layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -24, transition: { duration: 0.15 } }}>
              <div className="step-card__head">
                <span className="step__num">{i + 1}</span>
                <div className="step-card__tools">
                  <button type="button" className="icon-btn" onClick={() => update((s) => ({ steps: moveItem(s.steps, i, -1) }))} disabled={i === 0} aria-label="Move step up"><Icon name="arrow_upward" /></button>
                  <button type="button" className="icon-btn" onClick={() => update((s) => ({ steps: moveItem(s.steps, i, 1) }))} disabled={i === state.steps.length - 1} aria-label="Move step down"><Icon name="arrow_downward" /></button>
                  <button type="button" className="icon-btn icon-btn--danger" onClick={() => removeStep(i)} aria-label={`Remove step ${i + 1}`}><Icon name="delete" /></button>
                </div>
              </div>
              <textarea className="textarea" rows={3} value={st.text} onChange={(e) => setStepField(i, { text: e.target.value })} placeholder={i === 0 ? 'e.g. Wash the rice and soak it for 30 minutes.' : 'What happens next?'} aria-label={`Step ${i + 1}`} />

              <div className="step-card__row">
                <label className="step-card__timer">
                  <Icon name="timer" />
                  <input className="input" type="number" min="0" max="600" inputMode="numeric" value={st.timer} onChange={(e) => setStepField(i, { timer: e.target.value })} placeholder="0" aria-label="Timer in minutes" />
                  <span>min timer</span>
                </label>
                <label className="btn btn-ghost btn-sm step-card__upload">
                  <Icon name="add_photo_alternate" />{imageSrc ? 'Change photo' : 'Photo'}
                  <input type="file" accept="image/*" hidden onChange={(e) => { pickStepMedia(i, e.target.files[0], 'image'); e.target.value = ''; }} />
                </label>
                <label className="btn btn-ghost btn-sm step-card__upload">
                  <Icon name="videocam" />{videoSrc ? 'Change video' : 'Video'}
                  <input type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(e) => { pickStepMedia(i, e.target.files[0], 'video'); e.target.value = ''; }} />
                </label>
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => setStepField(i, { showMore: !st.showMore })} aria-expanded={st.showMore}>
                  <Icon name={st.showMore ? 'expand_less' : 'expand_more'} />Key ingredient
                </button>
              </div>

              <AnimatePresence initial={false}>
                {st.showMore && (
                  <motion.div className="step-card__more" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    <input className="input" value={st.ingredient} onChange={(e) => setStepField(i, { ingredient: e.target.value })} placeholder="Main ingredient" aria-label="Main ingredient" />
                    <input className="input" value={st.quantity} onChange={(e) => setStepField(i, { quantity: e.target.value })} placeholder="How much" aria-label="Quantity" />
                    <input className="input" value={st.alternate} onChange={(e) => setStepField(i, { alternate: e.target.value })} placeholder="Swap with (optional)" aria-label="Alternative" />
                  </motion.div>
                )}
              </AnimatePresence>

              {(imageSrc || videoSrc) && (
                <div className="step-card__media">
                  {imageSrc && (
                    <figure>
                      <img src={imageSrc} alt={`Step ${i + 1}`} />
                      <button type="button" className="step-card__x" aria-label="Remove photo" onClick={() => setStepField(i, { image: '', imageFile: null, imagePreview: '' })}><Icon name="close" /></button>
                    </figure>
                  )}
                  {videoSrc && (
                    <figure>
                      <video src={videoSrc} controls preload="metadata" />
                      <button type="button" className="step-card__x" aria-label="Remove video" onClick={() => setStepField(i, { video: '', videoFile: null, videoPreview: '' })}><Icon name="close" /></button>
                    </figure>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
      {errors.steps && <span className="field__error">{errors.steps}</span>}
      <button type="button" className="btn btn-ghost editor__add" onClick={addStep}><Icon name="add" />Add step</button>
    </div>,

    // Tags & nutrition
    <div key="details" className="editor__stage">
      {Object.entries(TAG_GROUPS).map(([group, options]) => (
        <fieldset key={group} className="filters__group">
          <legend>{group}</legend>
          <div className="filters__chips">
            {options.map((tag) => (
              <button key={tag} type="button" className={`chip ${state.tags.includes(tag) ? 'is-active' : ''}`} aria-pressed={state.tags.includes(tag)} onClick={() => toggleTag(tag)}>{tag}</button>
            ))}
          </div>
        </fieldset>
      ))}
      <fieldset className="filters__group">
        <legend>Your own tags</legend>
        <div className="editor__tag-input">
          <input className="input" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addCustomTag(); } }} placeholder="e.g. Biryani, Monsoon, Kids" maxLength={30} />
          <button type="button" className="btn btn-ghost" onClick={addCustomTag} disabled={!tagInput.trim()}>Add</button>
        </div>
        <div className="filters__chips" style={{ marginTop: 10 }}>
          {state.tags.filter((t) => !presetTags.includes(t)).map((tag) => (
            <button key={tag} type="button" className="chip is-active" onClick={() => toggleTag(tag)} aria-label={`Remove tag ${tag}`}>{tag}<Icon name="close" /></button>
          ))}
        </div>
      </fieldset>

      <div className="editor__nutrition panel">
        <div className="editor__nutrition-head">
          <div>
            <h3>Nutrition for the whole recipe</h3>
            <p className="field__hint">{state.nutritionManual ? 'You are entering these numbers yourself.' : 'Estimated from your ingredients. Shown per serving on the recipe page.'}</p>
          </div>
          {estimating && <Spinner />}
        </div>
        <div className="editor__nutrition-grid">
          {[['calories', 'kcal'], ['protein', 'g protein'], ['carbs', 'g carbs'], ['fat', 'g fat']].map(([field, label]) => (
            <label key={field} className="editor__nutrient">
              <input className="input" type="number" min="0" inputMode="numeric" value={state.nutrition[field]} readOnly={!state.nutritionManual}
                onChange={(e) => update((s) => ({ nutrition: { ...s.nutrition, [field]: Math.max(0, parseInt(e.target.value, 10) || 0) } }))} />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => update((s) => ({ nutritionManual: !s.nutritionManual }))}>
          <Icon name={state.nutritionManual ? 'auto_fix_high' : 'edit'} />{state.nutritionManual ? 'Use the estimate instead' : 'Enter my own numbers'}
        </button>
      </div>
    </div>,

    // Review
    <div key="review" className="editor__stage">
      <div className="preview">
        <div className="preview__media">
          {coverSrc ? <img src={coverSrc} alt="" /> : <div className="rcard__placeholder"><Icon name="skillet" /></div>}
        </div>
        <div className="preview__body">
          <h2>{state.title || 'Untitled recipe'}</h2>
          <p className="muted">{state.description}</p>
          <div className="row" style={{ marginTop: 12 }}>
            {formatTime({ hours: state.hours, minutes: state.minutes }) && <span className="badge badge--saffron"><Icon name="schedule" />{formatTime({ hours: state.hours, minutes: state.minutes })}</span>}
            <span className="badge">{state.servings} servings</span>
            <span className="badge">{state.ingredients.filter((i) => i.name.trim()).length} ingredients</span>
            <span className="badge">{state.steps.filter((s) => s.text.trim()).length} steps</span>
          </div>
          {state.tags.length > 0 && <div className="row" style={{ marginTop: 12 }}>{state.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>}
        </div>
      </div>
      <div className="preview__checks">
        {[
          [Boolean(coverSrc), 'Cover photo', 0],
          [state.ingredients.some((i) => i.name.trim()), 'Ingredients', 1],
          [state.steps.some((s) => s.text.trim()), 'Method', 2],
          [state.tags.length > 0, 'Tags help people find it', 3]
        ].map(([ok, label, target]) => (
          <button key={label} type="button" className={`preview__check ${ok ? 'is-ok' : ''}`} onClick={() => goTo(target)}>
            <Icon name={ok ? 'check_circle' : 'radio_button_unchecked'} filled={ok} />{label}<Icon name="chevron_right" />
          </button>
        ))}
      </div>
    </div>
  ];

  const isLast = stage === STEPS.length - 1;

  return (
    <Page title={editing ? 'Edit recipe' : 'New recipe'} className="editor">
      <div className="editor__top">
        <div>
          <h1 className="editor__title">{editing ? 'Edit recipe' : 'Share a recipe'}</h1>
          {!editing && <p className="muted small">Your progress is saved on this device as you type.</p>}
        </div>
        <button type="button" className="btn btn-quiet btn-sm" onClick={discard}><Icon name="close" />{editing ? 'Cancel' : 'Discard'}</button>
      </div>

      <ol className="stepper" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s.id}>
            <button type="button" className={`stepper__item ${i === stage ? 'is-current' : ''} ${i < stage ? 'is-done' : ''}`} onClick={() => goTo(i)} aria-current={i === stage ? 'step' : undefined}>
              <span className="stepper__dot">{i < stage ? <Icon name="check" /> : i + 1}</span>
              <span className="stepper__label">{s.label}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="editor__panel">
        <h2 className="editor__stage-title">{STEPS[stage].label}</h2>
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div key={stage} custom={direction} variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}>
            {stages[stage]}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="editor__nav">
        <button type="button" className="btn btn-ghost btn-lg" onClick={() => goTo(stage - 1)} disabled={stage === 0}>
          <Icon name="arrow_back" />Back
        </button>
        {isLast ? (
          <button type="button" className="btn btn-primary btn-lg" onClick={submit} disabled={saving}>
            {saving ? <><Spinner />{editing ? 'Saving…' : 'Publishing…'}</> : <><Icon name={editing ? 'save' : 'publish'} />{editing ? 'Save changes' : 'Publish recipe'}</>}
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-lg" onClick={() => goTo(stage + 1)}>
            Next<Icon name="arrow_forward" />
          </button>
        )}
      </div>
    </Page>
  );
}
