require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const recipeRoutes = require('./routes/recipes');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const calendarRoutes = require('./routes/calendar');
const cartRoutes = require('./routes/cart');
const reportRoutes = require('./routes/reports');
const recipeImageGenerationRoutes = require('./routes/recipeImageGeneration');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/profilePhotos', express.static(path.join(__dirname, 'profilePhotos')));
app.use('/uploadedImages', express.static(path.join(__dirname, 'uploadedImages')));

// Routers
app.use('/api/recipes', recipeRoutes);
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/recipe-image-generation', recipeImageGenerationRoutes);

// Serve static files from recipeImages
app.use('/recipeImages', express.static('recipeImages'));

// Connect to DB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        // Listen for requests
        app.listen(process.env.PORT, () => {
            console.log('Connected to DB & listening on port', process.env.PORT);
        });
    })
    .catch((error) => {
        console.log(error);
    });
