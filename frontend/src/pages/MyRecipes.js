import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Page, { PageHeader } from '../components/Page';
import Icon from '../components/Icon';
import RecipeCard from '../components/RecipeCard';
import EmptyState from '../components/EmptyState';
import { RecipeGridSkeleton } from '../components/Skeleton';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

export default function MyRecipes() {
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const [recipes, setRecipes] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/recipes/user/${user.userId}`).then(setRecipes).catch((err) => setError(err.message));
  }, [user.userId]);

  const remove = async (recipe) => {
    const ok = await confirm({ title: 'Delete this recipe?', message: `“${recipe.title}” and its reviews will be removed for everyone.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await api(`/recipes/${recipe._id}`, { method: 'DELETE' });
      setRecipes((list) => list.filter((r) => r._id !== recipe._id));
      toast('Recipe deleted');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const totalReviews = recipes?.reduce((sum, r) => sum + (r.ratingCount || 0), 0) || 0;

  return (
    <Page title="My recipes" wide>
      <PageHeader
        title="My recipes"
        subtitle={recipes?.length ? `${recipes.length} ${recipes.length === 1 ? 'recipe' : 'recipes'} shared, ${totalReviews} ${totalReviews === 1 ? 'review' : 'reviews'} from other cooks.` : 'Everything you have shared with the community.'}
        actions={<Link to="/new-recipe" className="btn btn-primary"><Icon name="add" />New recipe</Link>}
      />
      {error ? (
        <EmptyState icon="cloud_off" title="Couldn’t load your recipes">{error}</EmptyState>
      ) : !recipes ? (
        <RecipeGridSkeleton count={4} />
      ) : recipes.length ? (
        <div className="recipe-grid">
          <AnimatePresence initial={false}>
            {recipes.map((recipe) => (
              <motion.div key={recipe._id} layout exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.18 } }}>
                <RecipeCard
                  recipe={recipe}
                  showSave={false}
                  actions={(
                    <>
                      <Link to={`/edit-recipe/${recipe._id}`} className="btn btn-ghost btn-sm"><Icon name="edit" />Edit</Link>
                      <button type="button" className="btn btn-quiet btn-sm" onClick={() => remove(recipe)}><Icon name="delete" />Delete</button>
                    </>
                  )}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <EmptyState icon="menu_book" title="You haven’t shared a recipe yet" action={<><Link to="/new-recipe" className="btn btn-primary"><Icon name="add" />Write a recipe</Link><Link to="/ai-chef" className="btn btn-ghost"><Icon name="auto_awesome" />Get one from the AI chef</Link></>}>
          Start with the dish people always ask you to make.
        </EmptyState>
      )}
    </Page>
  );
}
