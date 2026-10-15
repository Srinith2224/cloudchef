import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Page from '../components/Page';
import Icon from '../components/Icon';
import { api } from '../api/client';
import { useUI } from '../context/UIContext';
import { formatTime, unitLabel } from '../lib/format';
import '../styles/pages/ai.css';

const CUISINES = ['Any', 'Indian', 'South Indian', 'Chinese', 'Italian', 'Mexican', 'Thai', 'Mediterranean', 'American'];
const DIETS = ['Vegetarian', 'Vegan', 'Eggetarian', 'Gluten-free', 'High-protein', 'Low-carb'];
const LOADING_LINES = ['Reading your ingredients', 'Checking the spice rack', 'Picking a cooking method', 'Writing the steps', 'Plating it up'];

function Thinking() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % LOADING_LINES.length), 1600);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="ai-thinking" role="status">
      <div className="ai-thinking__pot" aria-hidden>
        <span /><span /><span />
      </div>
      <AnimatePresence mode="wait">
        <motion.p key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>{LOADING_LINES[i]}…</motion.p>
      </AnimatePresence>
    </div>
  );
}

export default function AiChef() {
  const navigate = useNavigate();
  const { toast } = useUI();
  const [mode, setMode] = useState('text');
  const [enabled, setEnabled] = useState(true);
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState('');
  const [servings, setServings] = useState(2);
  const [cuisine, setCuisine] = useState('Any');
  const [difficulty, setDifficulty] = useState('Easy');
  const [diets, setDiets] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recipe, setRecipe] = useState(null);
  const resultRef = useRef(null);

  useEffect(() => {
    api('/ai/status').then((d) => setEnabled(d.enabled)).catch(() => {});
  }, []);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const addItems = (text) => {
    const parts = text.split(',').map((t) => t.trim()).filter(Boolean);
    if (!parts.length) return;
    setItems((list) => [...list, ...parts.filter((p) => !list.some((l) => l.toLowerCase() === p.toLowerCase()))].slice(0, 30));
    setDraft('');
  };

  const pickPhoto = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast('Pick a photo file.', 'error');
    if (file.size > 8 * 1024 * 1024) return toast('Photos can be up to 8 MB.', 'error');
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    return undefined;
  };

  const options = { servings, cuisine: cuisine === 'Any' ? '' : cuisine, difficulty, dietary: diets.join(', ') };
  const canGenerate = mode === 'text' ? items.length > 0 || draft.trim() : Boolean(photo);

  const generate = async () => {
    const list = draft.trim() ? [...items, ...draft.split(',').map((t) => t.trim()).filter(Boolean)] : items;
    if (draft.trim()) addItems(draft);
    setLoading(true);
    setError('');
    setRecipe(null);
    try {
      let data;
      if (mode === 'text') {
        data = await api('/ai/recipe-from-text', { method: 'POST', body: { ingredients: list, ...options } });
      } else {
        const form = new FormData();
        form.append('image', photo);
        Object.entries(options).forEach(([k, v]) => form.append(k, v));
        data = await api('/ai/recipe-from-image', { method: 'POST', form });
      }
      setRecipe(data.recipe);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveAsMine = () => navigate('/new-recipe', { state: { prefill: { ...recipe, steps: recipe.steps } } });

  return (
    <Page title="AI chef" className="ai">
      <header className="ai__head">
        <span className="ai__badge"><Icon name="auto_awesome" filled />AI chef</span>
        <h1>Cook with what you have</h1>
        <p className="muted">List your ingredients or snap a photo of your fridge. You get a full recipe you can cook or save.</p>
      </header>

      {!enabled && (
        <div className="notice notice--error" style={{ marginBottom: 20 }}>
          <Icon name="key" />
          <span>The AI chef isn’t switched on yet. Add a <strong>GEMINI_API_KEY</strong> to the backend <code>.env</code> file and restart the server.</span>
        </div>
      )}

      <section className="ai__panel panel">
        <div className="segmented ai__mode" role="tablist">
          {[['text', 'edit_note', 'Ingredients'], ['photo', 'photo_camera', 'Photo']].map(([id, icon, label]) => (
            <button key={id} type="button" role="tab" aria-selected={mode === id} className={`segmented__btn ${mode === id ? 'is-active' : ''}`} onClick={() => setMode(id)}>
              {mode === id && <motion.span layoutId="ai-seg" className="segmented__pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
              <Icon name={icon} /><span>{label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {mode === 'text' ? (
            <motion.div key="text" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="field">
              <label className="field__label" htmlFor="ai-ing">Ingredients you have</label>
              <div className="ai-tags" onClick={() => document.getElementById('ai-ing')?.focus()}>
                {items.map((item) => (
                  <span key={item} className="chip is-active chip--static">
                    {item}
                    <button type="button" onClick={() => setItems((l) => l.filter((x) => x !== item))} aria-label={`Remove ${item}`}><Icon name="close" /></button>
                  </span>
                ))}
                <input
                  id="ai-ing"
                  value={draft}
                  onChange={(e) => (e.target.value.endsWith(',') ? addItems(e.target.value) : setDraft(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addItems(draft); }
                    if (e.key === 'Backspace' && !draft && items.length) setItems((l) => l.slice(0, -1));
                  }}
                  placeholder={items.length ? 'Add more…' : 'e.g. eggs, tomato, onion, bread'}
                />
              </div>
              <span className="field__hint">Press Enter or a comma after each one.</span>
            </motion.div>
          ) : (
            <motion.div key="photo" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="field">
              <span className="field__label">Photo of your fridge, pantry or ingredients</span>
              <div className={`ai-photo ${preview ? 'has-image' : ''}`}>
                {preview ? <img src={preview} alt="Your ingredients" /> : (
                  <div className="ai-photo__empty"><Icon name="kitchen" /><span>Clear, well-lit photos work best.</span></div>
                )}
                <div className="ai-photo__actions">
                  <label className="btn btn-primary btn-sm only-mobile"><Icon name="photo_camera" />Take photo<input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { pickPhoto(e.target.files[0]); e.target.value = ''; }} /></label>
                  <label className="btn btn-ghost btn-sm"><Icon name="image" />{preview ? 'Choose another' : 'Choose photo'}<input type="file" accept="image/*" hidden onChange={(e) => { pickPhoto(e.target.files[0]); e.target.value = ''; }} /></label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="ai__options">
          <div className="field">
            <span className="field__label">Servings</span>
            <div className="servings servings--lg">
              <button type="button" className="icon-btn" onClick={() => setServings((s) => Math.max(1, s - 1))} aria-label="Fewer"><Icon name="remove" /></button>
              <span><strong>{servings}</strong></span>
              <button type="button" className="icon-btn" onClick={() => setServings((s) => Math.min(20, s + 1))} aria-label="More"><Icon name="add" /></button>
            </div>
          </div>
          <label className="field">
            <span className="field__label">Cuisine</span>
            <select className="select" value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
              {CUISINES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Difficulty</span>
            <select className="select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {['Easy', 'Medium', 'Hard'].map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
        </div>

        <fieldset className="filters__group">
          <legend>Diet (optional)</legend>
          <div className="filters__chips">
            {DIETS.map((d) => (
              <button key={d} type="button" className={`chip ${diets.includes(d) ? 'is-active' : ''}`} aria-pressed={diets.includes(d)} onClick={() => setDiets((l) => (l.includes(d) ? l.filter((x) => x !== d) : [...l, d]))}>{d}</button>
            ))}
          </div>
        </fieldset>

        {error && <div className="notice notice--error" role="alert"><Icon name="error" />{error}</div>}

        <button type="button" className="btn btn-primary btn-lg btn-block ai__go" onClick={generate} disabled={!canGenerate || loading || !enabled}>
          <Icon name="auto_awesome" filled />{loading ? 'Cooking up a recipe…' : recipe ? 'Make another one' : 'Create my recipe'}
        </button>
      </section>

      <div ref={resultRef}>
        <AnimatePresence mode="wait">
          {loading && <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Thinking /></motion.div>}
          {recipe && !loading && (
            <motion.article key="result" className="ai-result" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
              {recipe.detectedIngredients?.length > 0 && (
                <div className="ai-result__seen"><Icon name="visibility" /><span>Spotted: {recipe.detectedIngredients.join(', ')}</span></div>
              )}
              <h2 className="ai-result__title">{recipe.title}</h2>
              {recipe.description && <p className="muted">{recipe.description}</p>}
              <div className="row ai-result__facts">
                {formatTime(recipe.totalTime) && <span className="badge badge--chili"><Icon name="schedule" />{formatTime(recipe.totalTime)}</span>}
                <span className="badge">{recipe.servings} servings</span>
                {recipe.tags.map((t) => <span key={t} className="tag">{t}</span>)}
              </div>

              <div className="ai-result__cols">
                <div>
                  <h3>Ingredients</h3>
                  <ul className="ai-result__ing">
                    {recipe.ingredients.map((ing, i) => <li key={i}><span>{ing.name}</span><strong>{ing.quantity} {unitLabel(ing.unit, ing.quantity)}</strong></li>)}
                  </ul>
                </div>
                <div>
                  <h3>Method</h3>
                  <ol className="ai-result__steps">
                    {recipe.steps.map((s, i) => (
                      <li key={i}>
                        <span className="step__num">{i + 1}</span>
                        <p>{s.text}{s.timer > 0 && <span className="badge badge--chili ai-result__timer"><Icon name="timer" />{s.timer} min</span>}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {recipe.tips?.length > 0 && (
                <div className="notice"><Icon name="lightbulb" /><div>{recipe.tips.map((t, i) => <p key={i}>{t}</p>)}</div></div>
              )}

              <div className="ai-result__actions">
                <button type="button" className="btn btn-primary btn-lg" onClick={saveAsMine}><Icon name="edit_note" />Edit & publish</button>
                <button type="button" className="btn btn-ghost btn-lg" onClick={generate}><Icon name="refresh" />Try another</button>
              </div>
              <p className="field__hint">AI recipes can make mistakes. Check quantities and cooking times before you cook.</p>
            </motion.article>
          )}
        </AnimatePresence>
      </div>
    </Page>
  );
}
