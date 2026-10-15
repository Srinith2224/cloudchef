import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Page, { PageHeader } from '../components/Page';
import Icon from '../components/Icon';
import { RecipeGrid } from '../components/RecipeCard';
import EmptyState from '../components/EmptyState';
import { RecipeGridSkeleton } from '../components/Skeleton';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function SavedRecipes() {
  const { user, savedIds } = useAuth();
  const [recipes, setRecipes] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/users/${user.userId}/saved-recipes`).then(setRecipes).catch((err) => setError(err.message));
  }, [user.userId]);

  // Unsaving from a card removes it from this page straight away
  const previous = useRef(savedIds);
  useEffect(() => {
    const removed = [...previous.current].filter((rid) => !savedIds.has(rid));
    if (removed.length) setRecipes((list) => list && list.filter((r) => !removed.includes(r._id)));
    previous.current = savedIds;
  }, [savedIds]);
  const shown = recipes || [];

  return (
    <Page title="Saved recipes" wide>
      <PageHeader title="Saved recipes" subtitle="Recipes you bookmarked to cook later." />
      {error ? (
        <EmptyState icon="cloud_off" title="Couldn’t load saved recipes">{error}</EmptyState>
      ) : !recipes ? (
        <RecipeGridSkeleton count={4} />
      ) : shown.length ? (
        <RecipeGrid recipes={shown} />
      ) : (
        <EmptyState icon="bookmark" title="Nothing saved yet" action={<Link to="/explore" className="btn btn-primary"><Icon name="travel_explore" />Find recipes</Link>}>
          Tap the bookmark on any recipe to keep it here.
        </EmptyState>
      )}
    </Page>
  );
}
