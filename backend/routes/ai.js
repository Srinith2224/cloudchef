const express = require('express');
const ai = require('../controllers/aiController');
const { requireAuth } = require('../middleware/authMiddleware');
const { uploadAiImage } = require('../config/uploads');

const router = express.Router();

router.get('/status', ai.getStatus);
router.post('/recipe-from-text', requireAuth, ai.recipeFromText);
router.post('/recipe-from-image', requireAuth, uploadAiImage.single('image'), ai.recipeFromImage);

module.exports = router;
