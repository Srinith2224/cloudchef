require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
// Import your routes
const recipeRoutes = require('./routes/recipes');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const calendarRoutes = require('./routes/calendar');
const cartRoutes = require('./routes/cart');
const reportRoutes = require('./routes/reports');
const recipeImageGenerationRoutes = require('./routes/recipeImageGeneration');
const otpRoutes = require('./routes/otpRoutes');
const adminRoutes = require('./routes/admin');
const ratingRoutes = require('./routes/ratings');
const Recipe = require('./models/RecipeModel');
const app = express();

// Enable CORS for production with specific origin
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'https://cloudchef.srinithreddys.tech/' 
    : 'http://localhost:3000',
  credentials: true
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json());

// Static files serving
app.use('/profilePhotos', express.static(path.join(__dirname, 'profilePhotos')));
app.use('/recipeImages', express.static(path.join(__dirname, 'recipeImages')));
app.use('/recipeStepsImages', express.static(path.join(__dirname, 'recipeStepsImages')));
app.use('/recipeStepsVideos', express.static(path.join(__dirname, 'recipeStepsVideos')));

// Create directories if they don't exist
const directories = [
  'profilePhotos', 'recipeImages', 'recipeStepsImages', 
  'recipeStepsVideos', 'uploads', 'uploadedImages'
];

directories.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
});

// API Routes
app.use('/api/recipes', recipeRoutes);
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/recipe-image-generation', recipeImageGenerationRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ratings', ratingRoutes);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Serve frontend static files
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// Automated cleanup function
async function cleanupUnusedFiles() {
    try {
        const recipes = await Recipe.find({});
        const referencedPaths = new Set();

        recipes.forEach(recipe => {
            if (recipe.mainImage) referencedPaths.add(recipe.mainImage);
            recipe.steps.forEach(step => {
                if (step.image) referencedPaths.add(step.image);
                if (step.video) referencedPaths.add(step.video);
            });
        });

        const directoriesToClean = [
            path.join(__dirname, 'recipeImages'),
            path.join(__dirname, 'recipeStepsImages'),
            path.join(__dirname, 'recipeStepsVideos'),
            path.join(__dirname, 'uploads'),
            path.join(__dirname, 'uploadedImages')
        ];

        // Clean up each directory
        for (const directoryPath of directoriesToClean) {
            if (!fs.existsSync(directoryPath)) {
                console.log(`Directory ${directoryPath} does not exist, skipping...`);
                continue;
            }
            
            const files = fs.readdirSync(directoryPath);
            
            for (const file of files) {
                const filePath = path.join(directoryPath, file);
                const relativePath = `/${path.relative(__dirname, filePath).replace(/\\/g, '/')}`;

                if (!referencedPaths.has(relativePath)) {
                    fs.unlink(filePath, err => {
                        if (err) {
                            console.error('Error deleting file:', filePath, err);
                        } else {
                            console.log('Deleted unused file:', filePath);
                        }
                    });
                }
            }
        }
        
        
    } catch (error) {
        console.error('Error during automatic cleanup:', error);
    }
}

// Connect to DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    // Listen for requests
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      
      // Run cleanup once when server starts
      cleanupUnusedFiles();
      
      // Schedule cleanup to run every day (86400000 ms = 24 hours)
      setInterval(cleanupUnusedFiles, 86400000);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });