const express = require('express')
const session = require('express-session');
const auth = require('../middlewares/auth')
const passport = require('passport')



const user_route = express();
const userController = require('../controllers/userController');
const profileController = require('../controllers/userProfileController');
const cartController = require('../controllers/cartController');



user_route.use(
    session({
      secret: 'sessionSecret',
      saveUninitialized: true,
      resave: false,
      cookie: { maxAge: 5 * 60 * 1000 }
    })
  );

  user_route.use((req, res, next) => {
    if (req.isAuthenticated()) {
        res.locals.user = req.user; 
    } else {
        res.locals.user = null; 
    }
    next();
});


user_route.set('views','./views/users')

user_route.use(express.json());
user_route.use(express.urlencoded({ extended: true }));

/*--------------------------------Sign-in, Sign-up, Otp, Logout--------------------------------*/ 

user_route.get('/sign-in',userController.renderSignIn);
user_route.post('/sign-in',userController.login);
user_route.get('/forgotPassword',userController.renderForgotPassword);
user_route.post('/forgotPassword',userController.forgotPassword);
user_route.get('/resetPassword',userController.renderResetPassword);
user_route.post('/resetPassword',userController.resetPassword);

user_route.get('/sign-up',userController.renderSignUp);
user_route.post('/sign-up',userController.insertUser);

user_route.get('/verify-otp', userController.renderOtpVerification);
user_route.post('/verify-otp', userController.verifyOtp);
user_route.post('/resend-otp', userController.resendOtp);

user_route.get('/logout',userController.logout)



user_route.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }) );

user_route.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/sign-in', }),(req, res) => {
  req.session.user_id = req.user.id; 
  res.redirect('/'); 
});

/*---------------------------------Home, Shop------------------------------------------*/
user_route.get('/',auth.checkBlockedUser,userController.renderHome)
user_route.get('/shop',auth.checkBlockedUser,userController.renderShop)

/*---------------------------------Products--------------------------------------------*/

user_route.get('/productDetails/:productId',auth.checkBlockedUser,userController.renderProductDetails);

/*---------------------------------Profile--------------------------------------------*/

user_route.get('/profile',profileController.renderProfile);
user_route.get('/edit-profile',profileController.renderEditProfile);
user_route.post('/edit-profile',profileController.updateProfile);
user_route.get('/address',profileController.renderAddress);
user_route.get('/add-address',profileController.renderAddNewAddress);
user_route.post('/add-address',profileController.insertNewAddress);
user_route.get('/edit-address',profileController.renderEditAddress);
user_route.post('/update-address',profileController.updateAddress);
user_route.delete('/delete-address/:id',profileController.deleteAddress)

/*---------------------------------Cart--------------------------------------------*/
user_route.get('/cart',cartController.renderCart);
user_route.get('/addToCart',cartController.addToCart);
user_route.post('/updateCartItem',cartController.updateCartItem);
user_route.post('/removeCartItem',cartController.removeCartItem);
user_route.get('/checkout',cartController.loadCheckout);
user_route.get('/addNewAddress',cartController.addNewAddress);
user_route.post('/addCheckoutAddress',cartController.insertCheckoutAddress);
user_route.delete('/removeAddress/:id',cartController.removeAddress);

user_route.post('/placeOrder',cartController.placeOrder);
user_route.get('/orderplaced',cartController.renderOrderplaced);



/*---------------------------------Orders--------------------------------------------*/

user_route.get('/myOrders',profileController.renderMyOrder);
user_route.get('/orderDetails',profileController.renderOrderDetails);
user_route.post('/cancelOrder',profileController.cancelOrder);


module.exports = user_route