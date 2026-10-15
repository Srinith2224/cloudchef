import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { format } from 'date-fns';
import Page from '../components/Page';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import Spinner, { PageLoader } from '../components/Spinner';
import StarRating from '../components/StarRating';
import EmptyState from '../components/EmptyState';
import Reviews from '../components/Reviews';
import ScheduleDialog from '../components/ScheduleDialog';
import ReportDialog from '../components/ReportDialog';
import { api, assetUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { formatTime, scaleQuantity, unitLabel } from '../lib/format';
import '../styles/pages/recipe.css';

function MoreMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div className="more" ref={ref}>
      <button type="button" className="btn btn-ghost more__btn" aria-label="More actions" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Icon name="more_horiz" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="more__panel" role="menu" initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1 } }}>
            {items.map((item) => (
              <button key={item.label} type="button" role="menuitem" className={`more__item ${item.danger ? 'more__item--danger' : ''}`} onClick={() => { setOpen(false); item.onClick(); }}>
                <Icon name={item.icon} />{item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function RecipeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, savedIds, toggleSaved } = useAuth();
  const { toast, confirm } = useUI();

  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState(null);
  const [servings, setServings] = useState(2);
  const [checked, setChecked] = useState(() => new Set());
  const [addingAll, setAddingAll] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    setRecipe(null);
    setError(null);
    api(`/recipes/${id}`)
      .then((data) => {
        if (!alive) return;
        setRecipe(data);
        setServings(data.servings || 2);
      })
      .catch((err) => alive && setError(err));
    return () => { alive = false; };
  }, [id]);

  if (error) {
    return (
      <Page title="Recipe not found">
        <EmptyState icon="no_meals" title={error.status === 404 || error.status === 400 ? 'This recipe isn’t here' : 'Recipe didn’t load'} action={<Link to="/explore" className="btn btn-primary">Browse recipes</Link>}>
          {error.status === 404 || error.status === 400 ? 'It may have been deleted, or the link is wrong.' : error.message}
        </EmptyState>
      </Page>
    );
  }
  if (!recipe) return <PageLoader label="Getting the recipe…" />;

  const baseServings = recipe.servings || 2;
  const factor = servings / baseServings;
  const isOwner = user && String(recipe.createdBy?._id) === String(user.userId);
  const canEdit = isOwner || isAdmin;
  const saved = savedIds.has(recipe._id);
  const time = formatTime(recipe.totalTime);

  const requireUser = (action) => {
    if (!user) {
      toast('Sign in to do that', 'info', { action: { label: 'Sign in', onClick: () => navigate('/auth', { state: { from: `/recipe/${id}` } }) } });
      return false;
    }
    action();
    return true;
  };

  const onSave = () => requireUser(async () => {
    try {
      const nowSaved = await toggleSaved(recipe._id);
      toast(nowSaved ? 'Saved to your recipes' : 'Removed from saved');
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  const addToList = (items, label) => requireUser(async () => {
    setAddingAll(true);
    try {
      await api('/cart/add-multiple', { method: 'POST', body: { ingredients: items } });
      toast(label, 'success', { action: { label: 'Open list', onClick: () => navigate('/shopping-list') } });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setAddingAll(false);
    }
  });

  const scaledIngredients = recipe.ingredients.map((ing) => ({ ...ing, quantity: scaleQuantity(ing.quantity, factor) }));

  const onDelete = async () => {
    const ok = await confirm({ title: 'Delete this recipe?', message: `“${recipe.title}” will be removed for everyone, along with its reviews. This can’t be undone.`, confirmLabel: 'Delete recipe', danger: true });
    if (!ok) return;
    try {
      await api(`/recipes/${recipe._id}`, { method: 'DELETE' });
      toast('Recipe deleted');
      navigate('/my-recipes', { replace: true });
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const onShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: recipe.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast('Link copied');
      }
    } catch {
      /* share sheet closed */
    }
  };

  const toggleChecked = (i) => setChecked((set) => {
    const next = new Set(set);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    return next;
  });

  const menuItems = [
    { icon: 'ios_share', label: 'Share', onClick: onShare },
    ...(canEdit ? [{ icon: 'edit', label: 'Edit recipe', onClick: () => navigate(`/edit-recipe/${recipe._id}`) }] : []),
    ...(canEdit ? [{ icon: 'delete', label: 'Delete recipe', danger: true, onClick: onDelete }] : []),
    ...(user && !isOwner ? [{ icon: 'flag', label: 'Report', onClick: () => setReportOpen(true) }] : [])
  ];

  const n = recipe.nutrition || {};
  const perServing = (v) => Math.round((Number(v) || 0) / baseServings);

  return (
    <Page title={recipe.title} className="recipe">
      <button type="button" className="btn btn-quiet btn-sm recipe__back" onClick={() => (window.history.length > 2 ? navigate(-1) : navigate('/explore'))}>
        <Icon name="arrow_back" />Back
      </button>

      <section className="recipe__hero">
        <motion.div className="recipe__media" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
          {recipe.mainImage ? <img src={assetUrl(recipe.mainImage)} alt={recipe.title} /> : <div className="recipe__placeholder"><Icon name="skillet" /></div>}
        </motion.div>

        <div className="recipe__intro">
          {recipe.tags?.length > 0 && (
            <div className="recipe__tags">
              {recipe.tags.slice(0, 4).map((tag) => <Link key={tag} to={`/explore?tags=${encodeURIComponent(tag)}`} className="tag">{tag}</Link>)}
            </div>
          )}
          <h1 className="recipe__title">{recipe.title}</h1>

          <div className="recipe__byline">
            <Link to={`/cook/${recipe.createdBy._id}`} className="recipe__author">
              <Avatar src={recipe.createdBy.profilePhoto} firstName={recipe.createdBy.firstName} lastName={recipe.createdBy.lastName} size={34} />
              <span>{recipe.createdBy.firstName} {recipe.createdBy.lastName}</span>
            </Link>
            <a href="#reviews-title" className="recipe__rating">
              <StarRating value={recipe.avgRating || 0} size={16} />
              <span>{recipe.ratingCount ? `${recipe.avgRating.toFixed(1)} (${recipe.ratingCount})` : 'No ratings yet'}</span>
            </a>
          </div>

          <p className="recipe__desc">{recipe.description}</p>

          <dl className="recipe__facts">
            {time && <div><dt>Total time</dt><dd><Icon name="schedule" />{time}</dd></div>}
            <div><dt>Ingredients</dt><dd><Icon name="grocery" />{recipe.ingredients.length}</dd></div>
            <div><dt>Steps</dt><dd><Icon name="format_list_numbered" />{recipe.steps.length}</dd></div>
            <div><dt>Added</dt><dd><Icon name="event" />{format(new Date(recipe.createdAt), 'd MMM yyyy')}</dd></div>
          </dl>

          <div className="recipe__actions">
            <Link to={`/recipe/${recipe._id}/cook`} className="btn btn-primary btn-lg recipe__cook">
              <Icon name="play_arrow" filled />Start cooking
            </Link>
            {!isOwner && (
              <button type="button" className={`btn btn-ghost btn-lg ${saved ? 'is-saved' : ''}`} onClick={onSave} aria-pressed={saved}>
                <Icon name="bookmark" filled={saved} />{saved ? 'Saved' : 'Save'}
              </button>
            )}
            <button type="button" className="btn btn-ghost btn-lg" onClick={() => requireUser(() => setScheduleOpen(true))}>
              <Icon name="calendar_add_on" /><span className="hide-mobile">Plan</span>
            </button>
            <MoreMenu items={menuItems} />
          </div>
        </div>
      </section>

      <div className="recipe__body">
        <aside className="recipe__ingredients panel">
          <div className="ingredients__head">
            <h2 className="section-title">Ingredients</h2>
            <div className="servings" aria-label="Servings">
              <button type="button" className="icon-btn" onClick={() => setServings((s) => Math.max(1, s - 1))} disabled={servings <= 1} aria-label="Fewer servings"><Icon name="remove" /></button>
              <span><strong>{servings}</strong> {servings === 1 ? 'serving' : 'servings'}</span>
              <button type="button" className="icon-btn" onClick={() => setServings((s) => Math.min(50, s + 1))} aria-label="More servings"><Icon name="add" /></button>
            </div>
          </div>

          <ul className="ingredients__list">
            {scaledIngredients.map((ing, i) => (
              <li key={`${ing.name}-${i}`}>
                <label className={`ingredient ${checked.has(i) ? 'is-checked' : ''}`}>
                  <input type="checkbox" checked={checked.has(i)} onChange={() => toggleChecked(i)} />
                  <span className="ingredient__box"><Icon name="check" /></span>
                  <span className="ingredient__name">{ing.name}</span>
                  <span className="ingredient__qty">{ing.quantity} {unitLabel(ing.unit, ing.quantity)}</span>
                </label>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="btn btn-ghost btn-block"
            disabled={addingAll}
            onClick={() => {
              const missing = scaledIngredients.filter((_, i) => !checked.has(i));
              const list = missing.length ? missing : scaledIngredients;
              addToList(list, `${list.length} ${list.length === 1 ? 'item' : 'items'} added to your shopping list`);
            }}
          >
            {addingAll ? <Spinner /> : <><Icon name="add_shopping_cart" />{checked.size ? `Add ${recipe.ingredients.length - checked.size || recipe.ingredients.length} I don’t have` : 'Add all to shopping list'}</>}
          </button>
          <p className="field__hint ingredients__hint">Tick what you already have, then add the rest to your list.</p>

          {(n.calories > 0) && (
            <div className="nutrition">
              <h3>Nutrition per serving <span className="muted small">(estimate)</span></h3>
              <div className="nutrition__grid">
                <div><strong>{perServing(n.calories)}</strong><span>kcal</span></div>
                <div><strong>{perServing(n.protein)} g</strong><span>protein</span></div>
                <div><strong>{perServing(n.carbs)} g</strong><span>carbs</span></div>
                <div><strong>{perServing(n.fat)} g</strong><span>fat</span></div>
              </div>
            </div>
          )}
        </aside>

        <section className="recipe__method">
          <div className="method__head">
            <h2 className="section-title">Method</h2>
            <Link to={`/recipe/${recipe._id}/cook`} className="btn btn-quiet btn-sm"><Icon name="fullscreen" />Cook mode</Link>
          </div>
          <ol className="steps">
            {recipe.steps.map((step, i) => (
              <li key={step._id || i} className="step">
                <span className="step__num" aria-hidden>{i + 1}</span>
                <div className="step__content">
                  <p className="step__text">{step.text}</p>
                  {(step.ingredient || step.alternate || step.timer > 0) && (
                    <div className="step__meta">
                      {step.timer > 0 && <span className="badge badge--saffron"><Icon name="timer" />{step.timer} min</span>}
                      {step.ingredient && <span className="badge">{step.ingredient}{step.quantity ? ` · ${step.quantity}` : ''}</span>}
                      {step.alternate && <span className="badge badge--herb">Swap: {step.alternate}</span>}
                    </div>
                  )}
                  {step.video ? (
                    <video className="step__media" src={assetUrl(step.video)} poster={step.image ? assetUrl(step.image) : undefined} controls preload="metadata" />
                  ) : step.image ? (
                    <img className="step__media" src={assetUrl(step.image)} alt={`Step ${i + 1}`} loading="lazy" />
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <Reviews
        recipeId={recipe._id}
        isOwner={isOwner}
        onSummary={(s) => setRecipe((r) => ({ ...r, avgRating: s.avgRating, ratingCount: s.ratingCount }))}
      />

      <ScheduleDialog open={scheduleOpen} onClose={() => setScheduleOpen(false)} recipe={recipe} />
      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} recipe={recipe} />
    </Page>
  );
}
