const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userModel');

// Google OAuth Strategy
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: `${process.env.BASE_URL}/auth/google/callback`, // Dynamically uses BASE_URL
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Check if user already exists
                const existingUser = await User.findOne({ email: profile.emails[0].value });
                if (existingUser) {
                    return done(null, existingUser);
                }

                // Create new user
                const newUser = new User({
                    name: profile.displayName,
                    email: profile.emails[0].value,
                    is_verified: true, // Automatically verified since OAuth is used
                    is_admin: false,
                    isOAuth: true,
                });

                await newUser.save();
                done(null, newUser);
            } catch (error) {
                done(error, null);
            }
        }
    )
);

// Serialize user for session
passport.serializeUser((user, done) => done(null, user.id));

// Deserialize user
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;
