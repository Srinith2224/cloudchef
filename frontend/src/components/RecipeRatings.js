import React, { useState, useEffect } from 'react';
import { useRecipesContext } from '../hooks/useRecipesContext';
import { formatDistanceToNow } from 'date-fns';
import StarRating from './StarRating'; // Import the standalone component
import './RecipeRatings.css';

const RecipeRatings = ({ recipeId, creatorId }) => {
    const [ratings, setRatings] = useState({ ratingsWithComments: [], ratingCounts: [], avgRating: 0 });
    const [userRating, setUserRating] = useState(null);
    const [newRating, setNewRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [error, setError] = useState('');
    const { user } = useRecipesContext();

    // Fetch ratings for this recipe
    useEffect(() => {
        const fetchRatings = async () => {
            try {
                const response = await fetch(`/api/ratings/recipe/${recipeId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setRatings(data);
                }
            } catch (error) {
                console.error('Error fetching ratings:', error);
            }
        };

        if (recipeId) {
            fetchRatings();
        }
    }, [recipeId, submitSuccess]);

    // Check if current user has already rated this recipe
    useEffect(() => {
        const checkUserRating = async () => {
            if (!user || !recipeId) return;
            
            try {
                const response = await fetch(`/api/ratings/user/recipe/${recipeId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setUserRating(data);
                    setNewRating(data.rating);
                    setComment(data.comment || "");
                }
            } catch (error) {
                console.error('Error checking user rating:', error);
            }
        };

        checkUserRating();
    }, [recipeId, user]);

    const handleSubmitRating = async (e) => {
        e.preventDefault();
        
        if (!user) {
            setError('Please log in to rate recipes');
            return;
        }
        
        if (user.userId === creatorId) {
            setError('You cannot rate your own recipe');
            return;
        }
        
        if (newRating < 1) {
            setError('Please select a star rating');
            return;
        }
        
        setSubmitting(true);
        setError('');
        
        try {
            const response = await fetch('/api/ratings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    recipeId,
                    rating: newRating,
                    comment
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                setSubmitSuccess(true);
                setUserRating({
                    ...userRating,
                    rating: newRating,
                    comment
                });
                
                // Reset the success message after 3 seconds
                setTimeout(() => {
                    setSubmitSuccess(false);
                }, 3000);
            } else {
                setError(data.error || 'Failed to submit rating');
            }
        } catch (error) {
            setError('There was a problem submitting your rating');
            console.error('Error submitting rating:', error);
        } finally {
            setSubmitting(false);
        }
    };

    // Group ratings without comments by star count
    const renderRatingBreakdown = () => {
        // Create an array to hold counts for stars 5 down to 1
        const countByRating = Array(5).fill(0);
        
        // Fill in the counts from the API response
        ratings.ratingCounts.forEach(item => {
            if (item && item._id) {
                countByRating[item._id - 1] = item.count;
            }
        });
        
        // Calculate total ratings for percentage
        const totalRatings = ratings.ratingsWithComments.length + 
            countByRating.reduce((a, b) => a + b, 0);
            
        if (totalRatings === 0) return null;
        
        return (
            <div className="rating-breakdown">
                <h4>Rating Breakdown</h4>
                <div className="overall-rating">
                    <div className="big-rating">{ratings.avgRating.toFixed(1)}</div>
                    <StarRating rating={ratings.avgRating} size="medium" />
                    <div className="rating-count">({totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'})</div>
                </div>
                {[5, 4, 3, 2, 1].map(stars => (
                    <div key={stars} className="rating-bar">
                        <span className="stars-label">{stars} {stars === 1 ? 'star' : 'stars'}</span>
                        <div className="progress-bar-container">
                            <div 
                                className="progress-bar" 
                                style={{ 
                                    width: `${totalRatings > 0 ? (countByRating[stars - 1] / totalRatings * 100) : 0}%` 
                                }}
                            ></div>
                        </div>
                        <span className="count-label">{countByRating[stars - 1]}</span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="recipe-ratings-container">
            <h3>Ratings & Reviews</h3>
            
            {user && user.userId !== creatorId && (
                <div className="rating-form-container">
                    <h4>{userRating ? 'Update Your Rating' : 'Rate This Recipe'}</h4>
                    
                    <form onSubmit={handleSubmitRating} className="rating-form">
                        <div className="rating-stars-input">
                            <label>Your Rating:</label>
                            <StarRating 
                                rating={newRating} 
                                size="large" 
                                interactive={true} 
                                onChange={setNewRating} 
                            />
                        </div>
                        
                        <div className="rating-comment-input">
                            <label>Your Review (Optional):</label>
                            <textarea 
                                value={comment} 
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Share your experience with this recipe..."
                            ></textarea>
                        </div>
                        
                        {error && <div className="error-message">{error}</div>}
                        {submitSuccess && <div className="success-message">Rating submitted successfully!</div>}
                        
                        <button 
                            type="submit" 
                            className="submit-rating-btn"
                            disabled={submitting}
                        >
                            {submitting ? 'Submitting...' : (userRating ? 'Update Rating' : 'Submit Rating')}
                        </button>
                    </form>
                </div>
            )}
            
            <div className="ratings-summary">
                {renderRatingBreakdown()}
            </div>
            
            {ratings.ratingsWithComments.length > 0 && (
                <div className="ratings-comments-list">
                    <h4>Reviews</h4>
                    
                    {ratings.ratingsWithComments.map((rating) => (
                        <div key={rating._id} className="rating-comment-item">
                            <div className="rating-header">
                                <StarRating rating={rating.rating} size="small" />
                                <div className="rating-meta">
                                    <span className="rating-author">{rating.userName}</span>
                                    <span className="rating-date">
                                        {formatDistanceToNow(new Date(rating.createdAt), { addSuffix: true })}
                                    </span>
                                </div>
                            </div>
                            <p className="rating-comment-text">{rating.comment}</p>
                        </div>
                    ))}
                </div>
            )}
            
            {ratings.ratingsWithComments.length === 0 && 
             !ratings.ratingCounts.length && (
                <p className="no-ratings-message">Be the first to rate this recipe!</p>
            )}
        </div>
    );
};

export default RecipeRatings;