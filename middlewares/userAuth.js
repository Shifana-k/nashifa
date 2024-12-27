const User = require('../models/userModel');

const is_login = async (req, res, next) => {
    try {
        if (req.session.user_id) {
            next();
        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).send({ message: "Internal server error" });
    }
};

const is_logout = async (req, res, next) => {
    try {
        if (req.session.user_id) {
            res.redirect('/');
        } else {
            next();
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).send({ message: "Internal server error" });
    }
};



module.exports = {
    is_login,
    is_logout,

};
