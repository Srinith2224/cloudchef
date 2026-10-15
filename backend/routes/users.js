const express = require('express');
const users = require('../controllers/userController');
const { requireAuth, optionalAuth } = require('../middleware/authMiddleware');
const { uploadProfilePhoto } = require('../config/cloudinaryConfig');

const router = express.Router();

// Public profile pages
router.get('/profile/:id', optionalAuth, users.getUserProfile);
router.get('/:id/followers', users.getFollowers);
router.get('/:id/following', users.getFollowing);

// Everything below needs a signed-in user
router.use(requireAuth);

router.get('/saved-ids', users.getSavedIds);
router.post('/save-recipe', users.saveRecipe);
router.delete('/delete-saved-recipe', users.deleteSavedRecipe);
router.post('/follow/:id', users.followUser);
router.post('/unfollow/:id', users.unfollowUser);
router.post('/set-featured-recipe', users.setFeaturedRecipe);
router.get('/:userId/saved-recipes', users.getSavedRecipes);
router.get('/:id', users.getUserById);
router.patch('/:id', uploadProfilePhoto.single('profilePhoto'), users.updateUserProfile);

module.exports = router;
