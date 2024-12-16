const User = require("../models/userModel");
const moment = require("moment");

const renderLogin = async(req,res)=>{
    try {
        
        const message = {
            success: req.flash('success'),
            error: req.flash('error')
        };

        // Set cache-control header to prevent caching
        res.setHeader(
            "Cache-Control",
            "no-store, no-cache, must-revalidate, private"
        );

        res.render('login',{message})
    } catch (error) {
        console.log(error.message);
        
    }
}


const renderDashboard = async(req,res)=>{
    try {
        res.redirect('/admin/dashboard')
    } catch (error) {
        console.log(error.message);
    }
}
const loadDashboard = async(req,res)=>{
    try {
        res.render('dashboard')
    } catch (error) {
        console.log(error.message);
    }
}

const renderCustomer = async(req,res)=>{
    try {
        const userData = await User.find({ is_admin: 0 });
    const formattedUserData = userData.map((user) => {
      const joinedAtFormatted = moment(user.joinedAt).format("DD/MM/YYYY");
      return { ...user.toObject(), joinedAtFormatted };
    });
    return res.render("customers", { userData: formattedUserData });
    } catch (error) {
        console.log(error.message);
    }
}


const blockUser = async(req,res)=>{
    try {
        
        const { userId } = req.body;
    
        const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: { isBlocked: true } },
        { new: true }
     );
    console.log(updatedUser);
    return res
      .status(200)
      .send({
        message: "User blocked successfully",
        redirect: "/admin/customers",
      });
    } catch (error) {
        console.log(error.message);
        
    }
}

const unblockUser = async(req,res)=>{
    try {
        
        const { userId } = req.body
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: { isBlocked:false } },
            { new: true }
        );
        console.log(updatedUser);
        return res.status(200)
        .send({
            message: "User unblocked successfully",
            redirect: "/admin/customers",
        })
        
    } catch (error) {
        console.log(error.message);
    }
}



module.exports = {
    renderLogin,
    renderDashboard,
    loadDashboard,
    renderCustomer,
    blockUser,
    unblockUser,
}