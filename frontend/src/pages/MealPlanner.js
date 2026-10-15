import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { addDays, addWeeks, format, isToday, startOfWeek } from 'date-fns';
import Page, { PageHeader } from '../components/Page';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import Spinner, { PageLoader } from '../components/Spinner';
import { api, assetUrl } from '../api/client';
import { useUI } from '../context/UIContext';
import { toDateKey } from '../lib/format';
import '../styles/pages/planner.css';

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const MEAL_ICONS = { Breakfast: 'egg_alt', Lunch: 'lunch_dining', Dinner: 'dinner_dining', Snack: 'cookie' };

function RecipePicker({ open, onClose, onPick, slot }) {
  const [recipes, setRecipes] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open && !recipes) api('/recipes').then(setRecipes).catch(() => setRecipes([]));
  }, [open, recipes]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (recipes || []).filter((r) => !q || r.title.toLowerCase().includes(q) || (r.tags || []).some((t) => t.toLowerCase().includes(q))).slice(0, 40);
  }, [recipes, query]);

  return (
    <Modal open={open} onClose={onClose} size="md" title={slot ? `${slot.meal} · ${format(new Date(`${slot.date}T12:00:00`), 'EEE d MMM')}` : 'Pick a recipe'}>
      <div className="input-group" style={{ marginBottom: 14 }}>
        <Icon name="search" />
        <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search recipes" autoFocus />
      </div>
      {!recipes ? <Spinner /> : list.length ? (
        <ul className="picker">
          {list.map((r) => (
            <li key={r._id}>
              <button type="button" className="picker__item" onClick={() => onPick(r)}>
                {r.mainImage ? <img src={assetUrl(r.mainImage)} alt="" /> : <span className="picker__ph"><Icon name="skillet" /></span>}
                <span className="picker__title">{r.title}</span>
                <Icon name="add_circle" />
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="muted">No recipes found.</p>}
    </Modal>
  );
}

export default function MealPlanner() {
  const { toast } = useUI();
  const [entries, setEntries] = useState(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [slot, setSlot] = useState(null);
  const [shopping, setShopping] = useState(false);

  useEffect(() => {
    api('/calendar').then(setEntries).catch((err) => { setEntries([]); toast(err.message, 'error'); });
  }, [toast]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const byDay = useMemo(() => {
    const map = {};
    (entries || []).forEach((e) => { (map[e.date] = map[e.date] || []).push(e); });
    return map;
  }, [entries]);
  const weekEntries = days.flatMap((d) => byDay[toDateKey(d)] || []);

  const add = async (recipe) => {
    const target = slot;
    setSlot(null);
    try {
      const data = await api('/calendar', { method: 'POST', body: { recipeId: recipe._id, date: target.date, mealTime: target.meal } });
      setEntries(data);
      toast(`${recipe.title} added`);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const remove = async (entry) => {
    const before = entries;
    setEntries((list) => list.filter((e) => e._id !== entry._id));
    try {
      setEntries(await api(`/calendar/${entry._id}`, { method: 'DELETE' }));
      toast('Removed from plan', 'success', {
        action: { label: 'Undo', onClick: () => api('/calendar', { method: 'POST', body: { recipeId: entry.recipe._id, date: entry.date, mealTime: entry.mealTime } }).then(setEntries) }
      });
    } catch (err) {
      setEntries(before);
      toast(err.message, 'error');
    }
  };

  const shopWeek = async () => {
    const ids = [...new Set(weekEntries.map((e) => e.recipe._id))];
    if (!ids.length) return;
    setShopping(true);
    try {
      const recipes = await Promise.all(ids.map((id) => api(`/recipes/${id}`).catch(() => null)));
      const ingredients = recipes.filter(Boolean).flatMap((r) => r.ingredients);
      await api('/cart/add-multiple', { method: 'POST', body: { ingredients } });
      toast(`Ingredients for ${ids.length} ${ids.length === 1 ? 'recipe' : 'recipes'} added to your list`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setShopping(false);
    }
  };

  // On phones the week is a long list, so jump to today
  useEffect(() => {
    if (!entries || window.innerWidth > 760) return;
    const t = setTimeout(() => document.getElementById('planner-today')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 300);
    return () => clearTimeout(t);
  }, [entries, weekStart]);

  if (!entries) return <PageLoader label="Loading your week…" />;

  const thisWeek = toDateKey(startOfWeek(new Date(), { weekStartsOn: 1 })) === toDateKey(weekStart);

  return (
    <Page title="Meal plan" wide className="planner">
      <PageHeader
        title="Meal plan"
        subtitle={`${format(days[0], 'd MMM')} – ${format(days[6], 'd MMM yyyy')} · ${weekEntries.length} ${weekEntries.length === 1 ? 'meal' : 'meals'} planned`}
        actions={(
          <>
            <div className="planner__weeknav">
              <button type="button" className="icon-btn" onClick={() => setWeekStart((w) => addWeeks(w, -1))} aria-label="Previous week"><Icon name="chevron_left" /></button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} disabled={thisWeek}>This week</button>
              <button type="button" className="icon-btn" onClick={() => setWeekStart((w) => addWeeks(w, 1))} aria-label="Next week"><Icon name="chevron_right" /></button>
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={shopWeek} disabled={!weekEntries.length || shopping}>
              {shopping ? <Spinner /> : <Icon name="add_shopping_cart" />}Shop this week
            </button>
          </>
        )}
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={toDateKey(weekStart)} className="week" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
          {days.map((day) => {
            const keyDate = toDateKey(day);
            const dayEntries = byDay[keyDate] || [];
            const past = day < new Date(new Date().toDateString());
            return (
              <section key={keyDate} id={isToday(day) ? 'planner-today' : undefined} className={`day ${isToday(day) ? 'is-today' : ''} ${past ? 'is-past' : ''}`}>
                <header className="day__head">
                  <span className="day__name">{isToday(day) ? 'Today' : <><span className="day__long">{format(day, 'EEEE')}</span><span className="day__short">{format(day, 'EEE')}</span></>}</span>
                  <span className="day__date">{format(day, 'd MMM')}</span>
                </header>
                <div className="day__meals">
                  {MEALS.map((meal) => {
                    const items = dayEntries.filter((e) => e.mealTime === meal);
                    if (!items.length && meal === 'Snack') return null;
                    return (
                      <div key={meal} className="meal">
                        <div className="meal__label"><Icon name={MEAL_ICONS[meal]} />{meal}</div>
                        {items.map((entry) => (
                          <div key={entry._id} className="meal__item">
                            <Link to={`/recipe/${entry.recipe._id}`} className="meal__link">
                              {entry.recipe.mainImage ? <img src={assetUrl(entry.recipe.mainImage)} alt="" /> : <span className="meal__ph"><Icon name="skillet" /></span>}
                              <span>{entry.recipe.title}</span>
                            </Link>
                            <button type="button" className="icon-btn" onClick={() => remove(entry)} aria-label={`Remove ${entry.recipe.title}`}><Icon name="close" /></button>
                          </div>
                        ))}
                        {!items.length && (
                          <button type="button" className="meal__add" onClick={() => setSlot({ date: keyDate, meal })} aria-label={`Add ${meal.toLowerCase()} on ${format(day, 'EEEE')}`}>
                            <Icon name="add" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <button type="button" className="day__more" onClick={() => setSlot({ date: keyDate, meal: 'Snack' })}><Icon name="add" />Add snack or extra</button>
                </div>
              </section>
            );
          })}
        </motion.div>
      </AnimatePresence>

      <RecipePicker open={Boolean(slot)} slot={slot} onClose={() => setSlot(null)} onPick={add} />
    </Page>
  );
}
