const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userModel');
const Wallet = require('../models/walletModel');

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: 'https://www.nashifa.store/auth/google/callback',
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Check if user already exists
                let user = await User.findOne({ email: profile.emails[0].value });

                if (!user) {
                    // Create a new user if not found
                    const newUser = new User({
                        name: profile.displayName,
                        email: profile.emails[0].value,
                        is_verified: true,
                        is_admin: false,
                        isOAuth: true,
                    });

                    user = await newUser.save();

                    // Create a wallet for the new user
                    const wallet = new Wallet({
                        userId: user._id,
                        balance: 0,
                        transactions: [],
                    });

                    await wallet.save();
                } else {
                    // If user exists but wallet doesn't, ensure wallet creation
                    const walletExists = await Wallet.findOne({ userId: user._id });
                    if (!walletExists) {
                        const wallet = new Wallet({
                            userId: user._id,
                            balance: 0,
                            transactions: [],
                        });

                        await wallet.save();
                    }
                }

                done(null, user);
            } catch (error) {
                done(error, null);
            }
        }
    )
);

// Serialize and deserialize user for session support
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});
