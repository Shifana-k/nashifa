const express = require('express')
const session = require('express-session');
const auth = require('../middlewares/auth')
const passport = require('passport')



const user_route = express()
const userController = require('../controllers/userController')

user_route.use(
    session({
      secret: 'sessionSecret',
      saveUninitialized: true,
      resave: false,
      cookie: { maxAge: 5 * 60 * 1000 }
    })
  );

user_route.set('views','./Views/users')

user_route.use(express.json());
user_route.use(express.urlencoded({ extended: true }));

user_route.get('/',auth.isLogout,userController.renderHome)
user_route.get('/shop',userController.renderShop)

user_route.get('/sign-in',auth.isLogout,userController.renderSignIn)
user_route.post('/login',userController.login)

user_route.get('/sign-up',auth.isLogout,userController.renderSignUp)
user_route.post('/sign-up',userController.insertUser)

user_route.get('/verify-otp', userController.renderOtpVerification);
user_route.post('/verify-otp', userController.verifyOtp);
user_route.post('/resend-otp', userController.resendOtp);



user_route.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }) );

user_route.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/sign-in', successRedirect: '/', }));




module.exports = user_route