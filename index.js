const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();
// Load environment variables from .env (if present)
require('dotenv').config();
const teamRoutes = require("./routes/teamRoutes");
const cors = require("cors");
app.use(cors());


// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/freefire_tournament';
mongoose.set('strictQuery', false);
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
    console.error('MongoDB connection error (continuing without DB):', err.message);
});

mongoose.connection.on('error', err => {
    console.error('MongoDB connection error:', err);
});

// Middleware to parse request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware with MongoDB store
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: MONGODB_URI,
        collectionName: 'sessions',
        ttl: 14 * 24 * 60 * 60
    })
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Models
const User = require('./models/User');

// Passport config
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'GOOGLE_CLIENT_ID',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'GOOGLE_CLIENT_SECRET',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = Array.isArray(profile.emails) && profile.emails.length ? profile.emails[0].value : undefined;
        const photo = Array.isArray(profile.photos) && profile.photos.length ? profile.photos[0].value : undefined;
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
            user = await User.create({
                googleId: profile.id,
                email,
                displayName: profile.displayName,
                photo,
                provider: 'google'
            });
        } else {
            const updates = {};
            if (email && user.email !== email) updates.email = email;
            if (photo && user.photo !== photo) updates.photo = photo;
            if (profile.displayName && user.displayName !== profile.displayName) updates.displayName = profile.displayName;
            if (Object.keys(updates).length) {
                await User.updateOne({ _id: user._id }, { $set: updates });
                user = await User.findById(user._id);
            }
        }
        return done(null, user);
    } catch (e) {
        return done(e);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id).lean();
        done(null, user);
    } catch (e) {
        done(e);
    }
});

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));


// Make auth info available to all views (safe values)
app.use((req, res, next) => {
  const u = req.user || null;
  res.locals.user = u;
  res.locals.isAuthenticated = !!u;
  res.locals.userEmail =
    u
      ? (u.email || (Array.isArray(u.emails) && u.emails[0] && u.emails[0].value) || '')
      : '';
      next();
    });

// Auth routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.use("/api/team", teamRoutes);

app.get('/auth/google/callback', (req, res, next) => {
    passport.authenticate('google', (err, user, info) => {
        if (err) {
            console.error('Google auth error:', err, info);
            return res.redirect('/auth/failure');
        }
        if (!user) {
            console.error('Google auth no user:', info);
            return res.redirect('/auth/failure');
        }
        req.logIn(user, (loginErr) => {
            if (loginErr) {
                console.error('Login session error:', loginErr);
                return res.redirect('/auth/failure');
            }
            return res.redirect('/');
        });
    })(req, res, next);
});

app.get('/auth/failure', (req, res) => {
    res.status(401).render('failure', { title: 'Authentication Failed', message: 'Google authentication failed. Please try again.' });
});

app.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

// Home route
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Freefire Tournament',
    message: 'Welcome to the tournament!',
    announcementText: 'Register now for the ultimate Free Fire Battle Royale Tournament! Exciting prizes await!',
    // Do not pass `user` here so we don't override res.locals.user with undefined
  });
});

// 404 handler (catch-all)
app.use((req, res) => {
    res.status(404).render('404', {
        title: 'Page Not Found',
        url: req.originalUrl
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).render('error', { title: 'Server Error', message: 'An unexpected error occurred.' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});