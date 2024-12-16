const User = require('../models/userModel')

const isLogin = async (req,res,next) => {
    try {
        if(req.session.user_id){
        return next();
        }
        else{
            return res.redirect('/')
        }
    } catch (error) {
        console.log(error.message);
    }
}

const isLogout = async (req,res,next) => {
    try {
        if(req.session.user_id){
            return res.redirect('/home')
        }
        return next();  
    } catch (error) {
        console.log(error.message);
    }
}


const checkBlockedUser = async (req, res, next) => {
    try {
        if (req.session.user_id) {
            const user = await User.findById(req.session.user_id);
            if (user && user.isBlocked) {
                // Destroy the session and redirect to sign-in
                req.session.destroy(() => {
                    res.redirect('/sign-in');
                });
                return;
            }
            // Pass the user to the next middleware
            req.user = user;
        }
        next();
    } catch (error) {
        console.error("Error in blocked user middleware:", error.message);
        res.status(500).send("Server Error");
    }
};


module.exports = {
    isLogin,
    isLogout,
    checkBlockedUser
}