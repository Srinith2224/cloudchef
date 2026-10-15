import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Page from '../components/Page';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { RecipeGrid } from '../components/RecipeCard';
import { RecipeGridSkeleton } from '../components/Skeleton';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { TAG_GROUPS, totalMinutes } from '../lib/format';
import '../styles/pages/explore.css';

const TIME_FILTERS = [
  { id: 'u15', label: 'Under 15 min', test: (m) => m > 0 && m < 15 },
  { id: '15-30', label: '15–30 min', test: (m) => m >= 15 && m <= 30 },
  { id: '30-60', label: '30–60 min', test: (m) => m > 30 && m <= 60 },
  { id: 'o60', label: 'Over an hour', test: (m) => m > 60 }
];

const SORTS = {
  newest: { label: 'Newest', fn: (a, b) => new Date(b.createdAt) - new Date(a.createdAt) },
  rated: { label: 'Top rated', fn: (a, b) => (b.avgRating - a.avgRating) || (b.ratingCount - a.ratingCount) },
  quick: { label: 'Quickest', fn: (a, b) => (totalMinutes(a.totalTime) || 1e9) - (totalMinutes(b.totalTime) || 1e9) }
};

const QUICK_TAGS = ['Breakfast', 'Dinner', 'Vegetarian', 'Indian', 'Dessert', 'Easy'];

const greeting = () => {
  const h = new Date().getHours();
  if (h < 11) return 'What’s for breakfast?';
  if (h < 16) return 'What’s for lunch?';
  return 'What’s for dinner?';
};

export default function Explore() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [recipes, setRecipes] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState(params.get('q') || '');
  const [tags, setTags] = useState(() => (params.get('tags') ? params.get('tags').split(',') : []));
  const [time, setTime] = useState(params.get('time') || '');
  const [sort, setSort] = useState(params.get('sort') || 'newest');
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    api('/recipes')
      .then((data) => alive && setRecipes(data))
      .catch((err) => alive && setError(err.message));
    return () => { alive = false; };
  }, []);

  // Keep filters in the URL so they survive refresh and can be shared
  useEffect(() => {
    const next = {};
    if (query.trim()) next.q = query.trim();
    if (tags.length) next.tags = tags.join(',');
    if (time) next.time = time;
    if (sort !== 'newest') next.sort = sort;
    setParams(next, { replace: true });
  }, [query, tags, time, sort, setParams]);

  const toggleTag = (tag) => setTags((list) => (list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]));
  const clearAll = () => { setTags([]); setTime(''); setQuery(''); };

  const results = useMemo(() => {
    if (!recipes) return [];
    const q = query.trim().toLowerCase();
    const timeFilter = TIME_FILTERS.find((t) => t.id === time);
    const wanted = tags.map((t) => t.toLowerCase());

    // Tags from the same group are "any of", different groups are "all of"
    const groups = Object.values(TAG_GROUPS).map((group) => group.map((t) => t.toLowerCase()).filter((t) => wanted.includes(t))).filter((g) => g.length);
    const custom = wanted.filter((t) => !Object.values(TAG_GROUPS).flat().map((x) => x.toLowerCase()).includes(t));

    return recipes
      .filter((r) => {
        const rTags = (r.tags || []).map((t) => t.toLowerCase());
        if (q) {
          const hay = [r.title, r.description, ...(r.tags || []), ...(r.ingredients || []).map((i) => i.name), r.createdBy?.firstName].join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (groups.some((group) => !group.some((t) => rTags.includes(t)))) return false;
        if (custom.some((t) => !rTags.includes(t))) return false;
        if (timeFilter && !timeFilter.test(totalMinutes(r.totalTime))) return false;
        return true;
      })
      .sort(SORTS[sort]?.fn || SORTS.newest.fn);
  }, [recipes, query, tags, time, sort]);

  const activeCount = tags.length + (time ? 1 : 0);
  const timeLabel = TIME_FILTERS.find((t) => t.id === time)?.label;

  return (
    <Page title="Explore" wide className="explore">
      <section className="explore__head">
        <h1 className="explore__title">{user ? greeting() : 'Find something to cook'}</h1>
        <form className="explore__search" role="search" onSubmit={(e) => e.preventDefault()}>
          <Icon name="search" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dishes, ingredients or cooks"
            aria-label="Search recipes"
          />
          {query && (
            <button type="button" className="icon-btn" onClick={() => setQuery('')} aria-label="Clear search"><Icon name="close" /></button>
          )}
        </form>

        <div className="explore__bar">
          <div className="explore__chips" role="toolbar" aria-label="Quick filters">
            <button type="button" className={`chip ${activeCount ? 'is-active' : ''}`} onClick={() => setSheetOpen(true)}>
              <Icon name="tune" />Filters{activeCount > 0 && <span className="explore__count">{activeCount}</span>}
            </button>
            {QUICK_TAGS.map((tag) => (
              <button key={tag} type="button" className={`chip ${tags.includes(tag) ? 'is-active' : ''}`} aria-pressed={tags.includes(tag)} onClick={() => toggleTag(tag)}>
                {tag}
              </button>
            ))}
            {tags.filter((t) => !QUICK_TAGS.includes(t)).map((tag) => (
              <button key={tag} type="button" className="chip is-active" onClick={() => toggleTag(tag)}>
                {tag}<Icon name="close" />
              </button>
            ))}
            {timeLabel && (
              <button type="button" className="chip is-active" onClick={() => setTime('')}>
                {timeLabel}<Icon name="close" />
              </button>
            )}
          </div>
          <label className="explore__sort">
            <span className="visually-hidden">Sort by</span>
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
              {Object.entries(SORTS).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}
            </select>
          </label>
        </div>
      </section>

      {!user && (
        <div className="explore__guest">
          <Icon name="bookmark_add" />
          <p>Browsing as a guest. <Link to="/auth">Sign in</Link> to save recipes, rate them and plan your week.</p>
        </div>
      )}

      {error ? (
        <EmptyState icon="cloud_off" title="Recipes didn’t load" action={<button className="btn btn-primary" onClick={() => window.location.reload()}>Try again</button>}>
          {error}
        </EmptyState>
      ) : !recipes ? (
        <RecipeGridSkeleton count={12} />
      ) : results.length ? (
        <>
          <p className="explore__summary" aria-live="polite">
            {results.length} {results.length === 1 ? 'recipe' : 'recipes'}
            {activeCount || query ? <button type="button" className="explore__clear" onClick={clearAll}>Clear filters</button> : null}
          </p>
          <motion.div key={`${query}|${tags.join()}|${time}|${sort}`} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
            <RecipeGrid recipes={results} />
          </motion.div>
        </>
      ) : recipes.length ? (
        <EmptyState icon="search_off" title="No recipes match" action={<button className="btn btn-primary" onClick={clearAll}>Clear filters</button>}>
          Try fewer filters or a different word.
        </EmptyState>
      ) : (
        <EmptyState icon="restaurant" title="No recipes yet" action={user ? <Link className="btn btn-primary" to="/new-recipe"><Icon name="add" />Share the first one</Link> : <Link className="btn btn-primary" to="/auth?mode=signup">Create an account</Link>}>
          Be the first to share a recipe with the community.
        </EmptyState>
      )}

      <Modal open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filters" size="md"
        footer={(
          <>
            <button type="button" className="btn btn-quiet" onClick={() => { setTags([]); setTime(''); }}>Reset</button>
            <button type="button" className="btn btn-primary" onClick={() => setSheetOpen(false)}>
              Show {results.length} {results.length === 1 ? 'recipe' : 'recipes'}
            </button>
          </>
        )}
      >
        <div className="filters">
          <fieldset className="filters__group">
            <legend>Cooking time</legend>
            <div className="filters__chips">
              {TIME_FILTERS.map((t) => (
                <button key={t.id} type="button" className={`chip ${time === t.id ? 'is-active' : ''}`} aria-pressed={time === t.id} onClick={() => setTime(time === t.id ? '' : t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
          </fieldset>
          {Object.entries(TAG_GROUPS).map(([group, options]) => (
            <fieldset key={group} className="filters__group">
              <legend>{group}</legend>
              <div className="filters__chips">
                {options.map((tag) => (
                  <button key={tag} type="button" className={`chip ${tags.includes(tag) ? 'is-active' : ''}`} aria-pressed={tags.includes(tag)} onClick={() => toggleTag(tag)}>
                    {tag}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </Modal>
    </Page>
  );
}
