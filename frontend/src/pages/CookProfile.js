import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import Page from '../components/Page';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';
import Spinner, { PageLoader } from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import { RecipeGrid } from '../components/RecipeCard';
import { api, assetUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import '../styles/pages/profile.css';

export default function CookProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useUI();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [people, setPeople] = useState(null); // { title, list }

  useEffect(() => {
    setProfile(null);
    setError(null);
    api(`/users/profile/${id}`).then(setProfile).catch(setError);
  }, [id]);

  if (error) {
    return (
      <Page title="Cook not found">
        <EmptyState icon="person_off" title="This cook isn’t here" action={<Link to="/explore" className="btn btn-primary">Browse recipes</Link>}>
          The account may have been removed.
        </EmptyState>
      </Page>
    );
  }
  if (!profile) return <PageLoader />;

  const isMe = user && String(user.userId) === String(profile._id);
  const totalRatings = profile.recipes.reduce((s, r) => s + (r.ratingCount || 0), 0);

  const follow = async () => {
    if (!user) {
      navigate('/auth', { state: { from: `/cook/${id}` } });
      return;
    }
    setBusy(true);
    const wasFollowing = profile.isFollowing;
    setProfile((p) => ({ ...p, isFollowing: !wasFollowing, followerCount: p.followerCount + (wasFollowing ? -1 : 1) }));
    try {
      const res = await api(`/users/${wasFollowing ? 'unfollow' : 'follow'}/${id}`, { method: 'POST' });
      setProfile((p) => ({ ...p, isFollowing: res.isFollowing, followerCount: res.followerCount }));
    } catch (err) {
      setProfile((p) => ({ ...p, isFollowing: wasFollowing, followerCount: p.followerCount + (wasFollowing ? 1 : -1) }));
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const openPeople = async (kind) => {
    setPeople({ title: kind === 'followers' ? 'Followers' : 'Following', list: null });
    try {
      const list = await api(`/users/${id}/${kind}`);
      setPeople({ title: kind === 'followers' ? 'Followers' : 'Following', list });
    } catch (err) {
      toast(err.message, 'error');
      setPeople(null);
    }
  };

  const featured = profile.featuredRecipe;

  return (
    <Page title={`${profile.firstName} ${profile.lastName}`} wide className="profile">
      <header className="profile__head">
        <Avatar src={profile.profilePhoto} firstName={profile.firstName} lastName={profile.lastName} size={112} className="profile__avatar" />
        <div className="profile__info">
          <h1 className="profile__name">{profile.firstName} {profile.lastName}</h1>
          <div className="profile__meta">
            {profile.region && <span><Icon name="location_on" />{profile.region}</span>}
            {profile.createdAt && <span><Icon name="cake" />Cooking here since {format(new Date(profile.createdAt), 'MMM yyyy')}</span>}
          </div>
          {profile.about && <p className="profile__about">{profile.about}</p>}
          <div className="profile__stats">
            <div><strong>{profile.recipes.length}</strong><span>recipes</span></div>
            <button type="button" onClick={() => openPeople('followers')}><strong>{profile.followerCount}</strong><span>followers</span></button>
            <button type="button" onClick={() => openPeople('following')}><strong>{profile.followingCount}</strong><span>following</span></button>
            <div><strong>{totalRatings}</strong><span>ratings received</span></div>
          </div>
        </div>
        <div className="profile__cta">
          {isMe ? (
            <Link to="/settings" className="btn btn-ghost"><Icon name="edit" />Edit profile</Link>
          ) : (
            <button type="button" className={`btn ${profile.isFollowing ? 'btn-ghost' : 'btn-primary'}`} onClick={follow} disabled={busy} aria-pressed={profile.isFollowing}>
              <Icon name={profile.isFollowing ? 'how_to_reg' : 'person_add'} />{profile.isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
      </header>

      {featured && (
        <Link to={`/recipe/${featured._id}`} className="profile__featured">
          <div className="profile__featured-media">
            {featured.mainImage ? <img src={assetUrl(featured.mainImage)} alt="" /> : <div className="rcard__placeholder"><Icon name="skillet" /></div>}
          </div>
          <div className="profile__featured-body">
            <span className="badge badge--brand"><Icon name="workspace_premium" filled />Signature dish</span>
            <h2>{featured.title}</h2>
            <p className="muted">{featured.description}</p>
            <span className="link">Open recipe</span>
          </div>
        </Link>
      )}

      <h2 className="section-title profile__section">Recipes</h2>
      {profile.recipes.length ? (
        <RecipeGrid recipes={profile.recipes} />
      ) : (
        <EmptyState icon="menu_book" title={isMe ? 'You haven’t shared a recipe yet' : 'No recipes yet'} action={isMe && <Link to="/new-recipe" className="btn btn-primary"><Icon name="add" />Write one</Link>}>
          {isMe ? 'Your recipes will show up here for everyone to see.' : `${profile.firstName} hasn’t shared anything yet.`}
        </EmptyState>
      )}

      <Modal open={Boolean(people)} onClose={() => setPeople(null)} title={people?.title} size="sm">
        {!people?.list ? <Spinner /> : people.list.length ? (
          <ul className="people">
            {people.list.map((p) => (
              <li key={p._id}>
                <Link to={`/cook/${p._id}`} className="people__item" onClick={() => setPeople(null)}>
                  <Avatar src={p.profilePhoto} firstName={p.firstName} lastName={p.lastName} size={40} />
                  <span>{p.firstName} {p.lastName}</span>
                  <Icon name="chevron_right" />
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="muted">No one here yet.</p>}
      </Modal>
    </Page>
  );
}
