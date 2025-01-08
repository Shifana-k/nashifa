const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userModel');

// Configure Passport with Google OAuth Strategy
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.NODE_ENV === 'production' 
                ? 'https://www.nashifa.store/auth/google/callback' 
                : 'http://localhost:3000/auth/google/callback',
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Check if the user already exists in the database
                const existingUser = await User.findOne({ email: profile.emails[0].value });
                if (existingUser) {
                    return done(null, existingUser);
                }

                // Create a new user if not found
                const newUser = new User({
                    name: profile.displayName,
                    email: profile.emails[0].value,
                    is_verified: true, // Automatically verify OAuth users
                    is_admin: false,
                    isOAuth: true,
                });
                await newUser.save();
                return done(null, newUser);
            } catch (error) {
                console.error('Error during Google OAuth:', error);
                return done(error, null);
            }
        }
    )
);

// Serialize user to store data in the session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user to retrieve data from the session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        console.error('Error deserializing user:', error);
        done(error, null);
    }
});

module.exports = passport;
