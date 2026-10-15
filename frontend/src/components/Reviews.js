import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import Icon from './Icon';
import Avatar from './Avatar';
import Spinner from './Spinner';
import StarRating from './StarRating';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

const PROMPTS = ['', 'Not for me', 'Could be better', 'Good', 'Really good', 'Loved it'];

export default function Reviews({ recipeId, isOwner, onSummary }) {
  const { user } = useAuth();
  const { toast } = useUI();
  const [data, setData] = useState(null);
  const [mine, setMine] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(() => api(`/ratings/recipe/${recipeId}`).then(setData).catch(() => setData({ avgRating: 0, ratingCount: 0, distribution: [0, 0, 0, 0, 0], reviews: [] })), [recipeId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user || isOwner) return;
    api(`/ratings/user/recipe/${recipeId}`).then((r) => {
      setMine(r);
      if (r) { setRating(r.rating); setComment(r.comment || ''); }
    }).catch(() => {});
  }, [user, isOwner, recipeId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return toast('Pick a star rating first.', 'info');
    setBusy(true);
    try {
      const res = await api('/ratings', { method: 'POST', body: { recipeId, rating, comment } });
      setMine(res.rating);
      setEditing(false);
      onSummary?.({ avgRating: res.avgRating, ratingCount: res.ratingCount });
      toast(mine ? 'Review updated' : 'Thanks for your review');
      load();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await api(`/ratings/recipe/${recipeId}`, { method: 'DELETE' });
      setMine(null);
      setRating(0);
      setComment('');
      onSummary?.(res);
      toast('Review removed');
      load();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const total = data?.ratingCount || 0;
  const showForm = user && !isOwner && (!mine || editing);

  return (
    <section className="reviews" aria-labelledby="reviews-title">
      <h2 id="reviews-title" className="section-title">Reviews</h2>

      {!data ? <Spinner /> : (
        <div className="reviews__layout">
          <div className="reviews__summary">
            <div className="reviews__score">{total ? data.avgRating.toFixed(1) : '–'}</div>
            <StarRating value={data.avgRating} size={20} />
            <div className="muted small">{total ? `${total} ${total === 1 ? 'rating' : 'ratings'}` : 'No ratings yet'}</div>
            <div className="reviews__bars">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = data.distribution[star - 1];
                return (
                  <div key={star} className="reviews__bar">
                    <span>{star}</span>
                    <div className="reviews__track"><div style={{ width: total ? `${(count / total) * 100}%` : 0 }} /></div>
                    <span className="muted">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="reviews__main">
            {!user && (
              <div className="notice"><Icon name="rate_review" /><span><Link to="/auth" className="link">Sign in</Link> to rate this recipe.</span></div>
            )}

            {user && !isOwner && mine && !editing && (
              <div className="review review--mine">
                <div className="review__head">
                  <strong>Your review</strong>
                  <StarRating value={mine.rating} size={16} />
                  <div className="review__tools">
                    <button className="btn btn-quiet btn-sm" onClick={() => setEditing(true)}><Icon name="edit" />Edit</button>
                    <button className="btn btn-quiet btn-sm" onClick={remove} disabled={busy}><Icon name="delete" />Remove</button>
                  </div>
                </div>
                {mine.comment && <p className="review__text">{mine.comment}</p>}
              </div>
            )}

            {showForm && (
              <form className="review-form" onSubmit={submit}>
                <div className="review-form__stars">
                  <StarRating value={rating} onChange={setRating} size={32} />
                  <span className="review-form__prompt">{PROMPTS[rating] || 'Tap to rate'}</span>
                </div>
                <textarea className="textarea" rows={3} maxLength={1000} placeholder="How did it turn out? Any tips for other cooks? (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
                <div className="row" style={{ justifyContent: 'flex-end' }}>
                  {editing && <button type="button" className="btn btn-ghost" onClick={() => { setEditing(false); setRating(mine.rating); setComment(mine.comment || ''); }}>Cancel</button>}
                  <button className="btn btn-primary" disabled={busy || !rating}>{busy ? <Spinner /> : mine ? 'Update review' : 'Post review'}</button>
                </div>
              </form>
            )}

            {isOwner && <p className="muted small">This is your recipe, so you can’t rate it. Reviews from other cooks show up here.</p>}

            <ul className="reviews__list">
              {data.reviews.filter((r) => !mine || String(r.userId) !== String(user?.userId)).map((r) => {
                const [first, ...rest] = (r.userName || 'Cook').split(' ');
                return (
                  <li key={r._id} className="review">
                    <div className="review__head">
                      <Avatar src={r.profilePhoto} firstName={first} lastName={rest.join(' ')} size={36} />
                      <div>
                        <Link to={`/cook/${r.userId}`} className="review__name">{r.userName}</Link>
                        <div className="review__date">{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</div>
                      </div>
                      <StarRating value={r.rating} size={15} className="review__stars" />
                    </div>
                    <p className="review__text">{r.comment}</p>
                  </li>
                );
              })}
            </ul>
            {total > 0 && !data.reviews.length && <p className="muted small">No written reviews yet.</p>}
          </div>
        </div>
      )}
    </section>
  );
}
