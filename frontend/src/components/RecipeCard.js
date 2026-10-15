import React from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { assetUrl } from '../api/client';
import { formatTime } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

export default function RecipeCard({ recipe, actions, showSave = true }) {
  const { user, savedIds, toggleSaved } = useAuth();
  const { toast } = useUI();
  const isOwn = user && String(recipe.createdBy?._id) === String(user.userId);
  const saved = savedIds.has(recipe._id);
  const time = formatTime(recipe.totalTime);

  const onSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const nowSaved = await toggleSaved(recipe._id);
      toast(nowSaved ? 'Saved to your recipes' : 'Removed from saved');
    } catch (error) {
      toast(error.message, 'error');
    }
  };

  return (
    <article className="rcard">
      <Link to={`/recipe/${recipe._id}`} className="rcard__link" aria-label={recipe.title}>
        <div className="rcard__media">
          {recipe.mainImage ? (
            <img src={assetUrl(recipe.mainImage)} alt="" loading="lazy" />
          ) : (
            <div className="rcard__placeholder"><Icon name="skillet" /></div>
          )}
          {time && (
            <span className="rcard__time"><Icon name="schedule" />{time}</span>
          )}
        </div>
        <div className="rcard__body">
          <h3 className="rcard__title">{recipe.title}</h3>
          <div className="rcard__meta">
            <span className="rcard__author">{recipe.createdBy?.firstName} {recipe.createdBy?.lastName}</span>
            {recipe.ratingCount > 0 ? (
              <span className="rcard__rating" aria-label={`Rated ${recipe.avgRating} from ${recipe.ratingCount} cooks`}>
                <Icon name="star" filled />{recipe.avgRating.toFixed(1)}
                <span className="rcard__count">({recipe.ratingCount})</span>
              </span>
            ) : (
              <span className="rcard__new">New</span>
            )}
          </div>
        </div>
      </Link>

      {showSave && user && !isOwn && (
        <button
          type="button"
          className={`rcard__save ${saved ? 'is-saved' : ''}`}
          onClick={onSave}
          aria-pressed={saved}
          aria-label={saved ? 'Remove from saved' : 'Save recipe'}
        >
          <Icon name="bookmark" filled={saved} />
        </button>
      )}
      {actions && <div className="rcard__actions">{actions}</div>}
    </article>
  );
}

export const RecipeGrid = ({ recipes, renderActions }) => (
  <div className="recipe-grid">
    {recipes.map((recipe) => (
      <RecipeCard key={recipe._id} recipe={recipe} actions={renderActions?.(recipe)} />
    ))}
  </div>
);
