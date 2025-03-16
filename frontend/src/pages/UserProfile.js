import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useRecipesContext } from '../hooks/useRecipesContext';
import RecipeCard from '../components/RecipeCard';
import './UserProfile.css';

const UserProfile = () => {
    const { id } = useParams();
    const { user } = useRecipesContext();
    const [profile, setProfile] = useState(null);
    const [recipes, setRecipes] = useState([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showFollowersModal, setShowFollowersModal] = useState(false);
    const [showFollowingModal, setShowFollowingModal] = useState(false);
    const [followers, setFollowers] = useState([]);
    const [following, setFollowing] = useState([]);
    const [successMessage, setSuccessMessage] = useState('');
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('recipes');
    
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const response = await fetch(`/api/users/profile/${id}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Failed to fetch user profile');
                }
                
                const data = await response.json();
                setProfile(data);
                setRecipes(data.recipes || []);
                setIsFollowing(data.isFollowing);
                setLoading(false);
            } catch (error) {
                setError(error.message);
                setLoading(false);
            }
        };
        
        fetchUserProfile();
    }, [id]);
    
    const handleFollow = async () => {
        if (!user) {
            navigate('/auth');
            return;
        }
        
        try {
            const endpoint = isFollowing ? `/api/users/unfollow/${id}` : `/api/users/follow/${id}`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to ${isFollowing ? 'unfollow' : 'follow'} user`);
            }
            
            setIsFollowing(!isFollowing);
            
            // Update follower count
            const newProfile = {...profile};
            if (isFollowing) {
                newProfile.followerCount = Math.max(0, newProfile.followerCount - 1);
            } else {
                newProfile.followerCount = (newProfile.followerCount || 0) + 1;
            }
            setProfile(newProfile);
            
            setSuccessMessage(isFollowing ? 'Unfollowed successfully' : 'Following now!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setError(error.message);
        }
    };
    
    const fetchFollowers = async () => {
        try {
            const response = await fetch(`/api/users/${id}/followers`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch followers');
            }
            
            const data = await response.json();
            setFollowers(data);
            setShowFollowersModal(true);
        } catch (error) {
            setError(error.message);
        }
    };
    
    const fetchFollowing = async () => {
        try {
            const response = await fetch(`/api/users/${id}/following`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch following');
            }
            
            const data = await response.json();
            setFollowing(data);
            setShowFollowingModal(true);
        } catch (error) {
            setError(error.message);
        }
    };
    
    const navigateToProfile = (userId) => {
        setShowFollowersModal(false);
        setShowFollowingModal(false);
        navigate(`/user/${userId}`);
    };
    
    if (loading) {
        return <div className="loading">Loading profile...</div>;
    }
    
    if (error) {
        return <div className="error-message">{error}</div>;
    }
    
    if (!profile) {
        return <div className="not-found">User not found</div>;
    }
    
    return (
        <div className="user-profile-container">
            <div className="profile-header">
                <div className="profile-image-container">
                    {profile.profilePhoto ? (
                        <img 
                            src={profile.profilePhoto.startsWith('http') ? 
                                profile.profilePhoto : 
                                `http://localhost:4000${profile.profilePhoto}`}
                            alt={`${profile.firstName}'s profile`}
                            className="profile-image"
                        />
                    ) : (
                        <div className="profile-placeholder">
                            <span className="material-icons">account_circle</span>
                        </div>
                    )}
                </div>
                
                <div className="profile-info">
                    <div className="profile-name-section">
                        <h1>{profile.firstName} {profile.lastName}</h1>
                        
                        {user && user.userId !== id && (
                            <button 
                                className={`follow-button ${isFollowing ? 'following' : ''}`}
                                onClick={handleFollow}
                            >
                                {isFollowing ? 'Following' : 'Follow'}
                            </button>
                        )}
                        
                        {user && user.userId === id && (
                            <Link to="/profile" className="edit-profile-button">
                                Edit Profile
                            </Link>
                        )}
                    </div>
                    
                    <div className="stats-container">
                        <div className="stat">
                            <span className="stat-value">{recipes.length}</span>
                            <span className="stat-label">Recipes</span>
                        </div>
                        
                        <div className="stat clickable" onClick={fetchFollowers}>
                            <span className="stat-value">{profile.followerCount || 0}</span>
                            <span className="stat-label">Followers</span>
                        </div>
                        
                        <div className="stat clickable" onClick={fetchFollowing}>
                            <span className="stat-value">{profile.followingCount || 0}</span>
                            <span className="stat-label">Following</span>
                        </div>
                    </div>
                    
                    {profile.region && (
                        <div className="profile-location">
                            <span className="material-icons">location_on</span>
                            {profile.region}
                        </div>
                    )}
                    
                    {profile.about && (
                        <p className="profile-bio">{profile.about}</p>
                    )}
                </div>
            </div>
            
            {profile.featuredRecipe && (
                <div className="featured-recipe">
                    <h3>Featured Recipe</h3>
                    <div className="featured-recipe-card" onClick={() => navigate(`/recipe/${profile.featuredRecipe._id}`)}>
                        {profile.featuredRecipe.mainImage ? (
                            <img 
                                src={`http://localhost:4000${profile.featuredRecipe.mainImage}`}
                                alt={profile.featuredRecipe.title}
                            />
                        ) : (
                            <div className="recipe-placeholder">
                                <span className="material-icons">restaurant_menu</span>
                            </div>
                        )}
                        <div className="featured-recipe-info">
                            <h4>{profile.featuredRecipe.title}</h4>
                            <p>{profile.featuredRecipe.description}</p>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="profile-content">
                <div className="profile-tabs">
                    <div 
                        className={`profile-tab ${activeTab === 'recipes' ? 'active' : ''}`}
                        onClick={() => setActiveTab('recipes')}
                    >
                        <span className="material-icons">restaurant_menu</span>
                        Recipes
                    </div>
                </div>
                
                {activeTab === 'recipes' && (
                    <>
                        {recipes.length > 0 ? (
                            <div className="recipes-grid">
                                {recipes.map(recipe => (
                                    <RecipeCard key={recipe._id} recipe={recipe} />
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <span className="material-icons">restaurant_menu</span>
                                <p>No recipes yet</p>
                            </div>
                        )}
                    </>
                )}
            </div>
            
            {showFollowersModal && (
                <div className="modal">
                    <div className="modal-content follow-modal">
                        <div className="modal-header">
                            <h3>Followers</h3>
                            <button className="close-modal" onClick={() => setShowFollowersModal(false)}>
                                <span className="material-icons">close</span>
                            </button>
                        </div>
                        
                        <div className="follow-list">
                            {followers.length > 0 ? (
                                followers.map(follower => (
                                    <div 
                                        key={follower._id} 
                                        className="follow-item"
                                        onClick={() => navigateToProfile(follower._id)}
                                    >
                                        {follower.profilePhoto ? (
                                            <img 
                                                src={follower.profilePhoto.startsWith('http') ? 
                                                    follower.profilePhoto : 
                                                    `http://localhost:4000${follower.profilePhoto}`}
                                                alt={`${follower.firstName}'s profile`}
                                                className="follow-avatar"
                                            />
                                        ) : (
                                            <div className="follow-avatar-placeholder">
                                                <span className="material-icons">account_circle</span>
                                            </div>
                                        )}
                                        <div className="follow-info">
                                            <p className="follow-name">{follower.firstName} {follower.lastName}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="empty-follow-list">
                                    <p>No followers yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {showFollowingModal && (
                <div className="modal">
                    <div className="modal-content follow-modal">
                        <div className="modal-header">
                            <h3>Following</h3>
                            <button className="close-modal" onClick={() => setShowFollowingModal(false)}>
                                <span className="material-icons">close</span>
                            </button>
                        </div>
                        
                        <div className="follow-list">
                            {following.length > 0 ? (
                                following.map(followedUser => (
                                    <div 
                                        key={followedUser._id} 
                                        className="follow-item"
                                        onClick={() => navigateToProfile(followedUser._id)}
                                    >
                                        {followedUser.profilePhoto ? (
                                            <img 
                                                src={followedUser.profilePhoto.startsWith('http') ? 
                                                    followedUser.profilePhoto : 
                                                    `http://localhost:4000${followedUser.profilePhoto}`}
                                                alt={`${followedUser.firstName}'s profile`}
                                                className="follow-avatar"
                                            />
                                        ) : (
                                            <div className="follow-avatar-placeholder">
                                                <span className="material-icons">account_circle</span>
                                            </div>
                                        )}
                                        <div className="follow-info">
                                            <p className="follow-name">{followedUser.firstName} {followedUser.lastName}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="empty-follow-list">
                                    <p>Not following anyone yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {successMessage && (
                <div className="success-toast">{successMessage}</div>
            )}
        </div>
    );
};

export default UserProfile;