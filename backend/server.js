require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { UPLOAD_DIR } = require('./config/uploads');
const migrateOldRatings = require('./utils/migrateOldRatings');

const REQUIRED_ENV = ['MONGO_URI', 'SECRET'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}. Copy backend/.env.example to backend/.env and fill it in.`);
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);

// Security headers. Images/videos may come from Cloudinary or Google, so allow cross-origin resources.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000').split(',').map((o) => o.trim());
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)),
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limits for the endpoints people (or bots) could abuse
const limiter = (windowMinutes, max, message) => rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: message }
});
app.use(['/api/login', '/api/google-signin'], limiter(15, 30, 'Too many sign-in attempts. Wait a few minutes and try again.'));
app.use('/api/otp', limiter(15, 20, 'Too many code requests. Wait a few minutes and try again.'));
app.use('/api/ai', limiter(10, 15, 'You are generating recipes very fast. Wait a few minutes and try again.'));
app.use('/api', limiter(1, 300, 'Too many requests. Slow down a little.'));

// Health check (useful for hosting platforms)
app.get('/api/health', (req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 }));

// API routes
app.use('/api', require('./routes/auth'));
app.use('/api/recipes', require('./routes/recipes'));
app.use('/api/users', require('./routes/users'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/otp', require('./routes/otp'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/ai', require('./routes/ai'));

// Local uploads (only used when Cloudinary isn't configured) and legacy local profile photos
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use('/profilePhotos', express.static(path.join(__dirname, 'profilePhotos'), { maxAge: '7d' }));

app.use('/api', (req, res) => res.status(404).json({ error: `No API route for ${req.method} ${req.originalUrl}` }));

// After `npm run build`, the API also serves the React app (one server to deploy)
const clientBuild = path.join(__dirname, '..', 'frontend', 'build');
if (process.env.SERVE_CLIENT !== 'false' && fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild, { maxAge: '1h', index: false }));
  app.get('*', (req, res) => res.sendFile(path.join(clientBuild, 'index.html')));
}

// One place that turns errors into friendly JSON
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'That file is too large. Images up to 8 MB, videos up to 50 MB.' : err.message;
    return res.status(400).json({ error: message });
  }
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'The request is too large.' });
  if (err.name === 'ValidationError') return res.status(400).json({ error: Object.values(err.errors)[0]?.message || 'Invalid data.' });
  if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid ID.' });
  if (err.code === 11000) return res.status(409).json({ error: 'That already exists.' });

  const status = err.status || 500;
  if (status >= 500) console.error(err);
  const showMessage = status < 500 || err.expose;
  res.status(status).json({ error: showMessage ? err.message : 'Something went wrong on our side. Try again.' });
});

const PORT = process.env.PORT || 4000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    await migrateOldRatings().catch((error) => console.error('Could not move old ratings:', error.message));
    app.listen(PORT, () => console.log(`CloudChef API ready on http://localhost:${PORT}`));
  })
  .catch((error) => {
    console.error('Could not connect to MongoDB:', error.message);
    process.exit(1);
  });

module.exports = app;
