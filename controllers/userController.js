const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto')
const Category = require('../models/categoryModel');
const Products = require('../models/productModel');



function generateOtp(){
    return String(Math.floor(1000+Math.random()*9000))
}

const sendVerifyMail = async(name,email,user_id,otp)=>{
    try{
        const transporter = nodemailer.createTransport({
            host:"smtp.gmail.com",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODE_USER,
                pass:process.env.NODE_PASS
            }
        })
        const mailOptions = {
        from: process.env.NODE_USER,
        to: email,
        subject: "Your Nashifa Account Verification OTP",
        html: `
              <p>Dear ${name},</p>
              <p>Welcome to Nashifa, your fashion destination!</p>
              <p>To complete your registration and ensure the security of your account, please use the following One-Time Password (OTP):</p>
              <h2>OTP: ${otp}</h2>
              <p>Please enter this code within 1 minute. If you didn't request this OTP, kindly disregard this email.</p>
              <p>Need help? Reach out to us at nashifa4u@gmail.com or call us at 8281142958.</p>
              <p>Best regards,<br>Nashifa Team</p>
              `,
        }
        transporter.sendMail(mailOptions,function(err,info){
            if (err) {
                console.log(err);
            }else{
                console.log(`generated Otp: ${otp}`);
                
            }
        })
    }catch(error){
        console.log(error.message);
    }
}

const securePassword = async(password)=>{
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        console.log(error.message);
        
    }
}

const renderHome = async (req,res) => {
    try {
        // check user is logged and get user data
        const user = req.session.user_id ? await User.findById(req.session.user_id) : req.user || null;
        res.render('home',{user})
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Server Error")
    }
}



const renderSignIn = async (req,res) => {
    try {
        const user = req.session.user_id ? await User.findById(req.session.user_id) : null;
        // check if user is already logged in
        if (req.session.user_id) {
            return res.redirect('/'); 
        }
        
        const message = {
            success: req.flash('success'),
            error: req.flash('error')
        };

        res.setHeader(
            "Cache-Control",
            "no-store, no-cache, must-revalidate, private"
        );

        res.render('sign-in', { message ,user})

    } catch (error) {
        console.log(error.message);
    }
}



const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const userData = await User.findOne({ email: email });

        if (!userData) {
            // Respond with JSON if user is not found
            return res.json({ success: false, message: 'User not found' });
        }

        if (userData.isBlocked) {
            // Respond with JSON if user is blocked
            return res.json({ success: false, message: 'You are not authorized to login' });
        }

        const isMatch = await bcrypt.compare(password, userData.password);

        if (!isMatch) {
            // Respond with JSON if password is incorrect
            return res.json({ success: false, message: 'Invalid email or password' });
        }

        if (!userData.is_verified) {
            // Respond with JSON if user is not verified
            return res.json({ success: false, message: 'Please verify your account' });
        }

        // Set session
        req.session.user_id = userData._id;

        // Respond with JSON on successful login
        return res.json({ success: true, message: 'Login successful', redirect: '/' }); // Send redirect URL if needed

    } catch (error) {
        console.error(error.message);
        return res.json({ success: false, message: 'An error occurred. Please try again later.' });
    }
};


const renderForgotPassword = async(req,res)=>{
    try {
        res.render('forgotPassword');
    } catch (error) {
        console.log(error.message);
    }
}

// Send password reset email
const sendPasswordResetEmail = async (email, token) => {
    try {
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: process.env.NODE_USER,
                pass: process.env.NODE_PASS,
            },
        });

        const mailOptions = {
            from: process.env.NODE_USER,
            to: email,
            subject: "Password Reset Request",
            html: `
                <p>Dear User,</p>
                <p>You have requested to reset your password. Click the link below to reset it:</p>
                <a href="${process.env.BASE_URL}/resetPassword?token=${token}">Reset Password</a>
                <p>If you did not request this, please ignore this email.</p>
            `,
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error("Error sending password reset email:", error);
    }
};

// Handle forgot password request
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            req.flash('error', 'User with this email does not exist.');
            return res.redirect('/forgotPassword');
        }

        const token = crypto.randomBytes(32).toString('hex');
        user.resetToken = token;
        user.resetTokenExpiry = Date.now() + 3600000; // 1 hour expiry
        await user.save();

        await sendPasswordResetEmail(email, token);

        req.flash('success', 'Password reset link has been sent to your email.');
        res.redirect('/forgotPassword');
    } catch (error) {
        console.error(error.message);
        req.flash('error', 'Server error. Please try again later.');
        res.redirect('/forgotPassword');
    }
};

// Render password reset form
const renderResetPassword = async (req, res) => {
    try {
        const { token } = req.query;
        const user = await User.findOne({ resetToken: token, resetTokenExpiry: { $gt: Date.now() } });

        if (!user) {
            req.flash('error', 'Invalid or expired reset token.');
            return res.redirect('/resetPassword');
        }

        res.render('resetPassword', { token });
    } catch (error) {
        console.error(error.message);
        req.flash('error', 'Server error occurred.');
        return res.render('resetPassword');
}
}

// Handle password reset submission
const resetPassword = async (req, res) => {
    
    try {

        const { token, password, confirmPassword } = req.body;

        if (!token) {
            req.flash('error', 'Reset token is missing.');
            return res.status(400).json({
                success: false,

            });
        }

        if (!password || !confirmPassword) {
            req.flash('error', 'Please provide both password and confirmation.');
            return res.status(400).json({
                success: false,
            });
        }

        if (password !== confirmPassword) {
            req.flash('error', 'Passwords do not match.');
            return res.status(400).json({
                success: false,
            });
        }

        const user = await User.findOne({ resetToken: token, resetTokenExpiry: { $gt: Date.now() } });

        if (!user) {
            req.flash('error', 'Invalid or expired reset token.');
            return res.status(400).json({
                success: false,
            });
        }


        const hashedPassword = await bcrypt.hash(password, 10);

        user.password = hashedPassword;
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();

        return res.json({ 
            success: true, 
            message: 'Password has been reset successfully.' 
        });
        
    } catch (error) {
        console.error('Error in resetPassword:', error);
        
        return res.status(500).json({ 
            success: false, 
            message: 'An unexpected error occurred. Please try again.',
            errorDetails: error.message 
        });
    }
};

const renderSignUp = async(req,res)=>{
    try {
        res.render('sign-up')
    } catch (error) {
    console.log(error.message);
    }
}

// const insertUser = async (req,res) => {
//     try {


//         const { name, email, password, cpassword, mobile } = req.body;

//         // check empty fields
//         if (!name || !email || !password || !cpassword || !mobile) {
//             return res.render("sign-up", {
//                 message: "All fields are required.",
//             });
//         }

//         // check whitespace
//         if (/\s/.test(name) || /\s/.test(email) || /\s/.test(password) || /\s/.test(mobile)) {
//             return res.render("sign-up", {
//                 message: "Whitespace is not allowed in any field.",
//             });
//         }

//         // Validate name 
//         if (name.length < 3 || /[^a-zA-Z\s]/.test(name)) {
//             return res.render("sign-up", {
//                 message: "Name must be at least 3 characters long and contain only letters.",
//             });
//         }

//         // Check if the email is already registered
//         const existingUser = await User.findOne({ email: email });
//         if (existingUser) {
//             return res.render("sign-up", {
//                 message: "Email is already registered.",
//             });
//         }


//         // Validate email format
//         if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
//             return res.render("sign-up", {
//                 message: "Please enter a valid email address.",
//             });
//         }

//         // Check email ends with "@gmail.com"
//         if (!email.endsWith("@gmail.com")) {
//             return res.render("sign-up", {
//                 message: "Please use a valid Gmail address",
//             });
//         }

//         // Validate mobile number
//         if (!/^[6-9]\d{9}$/.test(mobile)) {
//             return res.render("sign-up", {
//                 message: "Please enter a valid mobile number.",
//             });
//         }

//         // Check if the mobile number is already registered
//         const existingMobile = await User.findOne({ mobile: mobile });
//         if (existingMobile) {
//             return res.render("sign-up", {
//                 message: "Mobile number is already registered.",
//             });
//         }


//         if (password !== cpassword) {
//             return res.render("sign-up", {
//                 message: "Password and Confirm Password do not match",
//             });
//         }

//         if (password.length < 6) {
//             return res.render("sign-up", {
//                 message: "Password must be at least 6 characters long",
//             });
//         }

        

//         const spassword = await securePassword(password);

//         // Create and save the new user temporary
//         const tempUserData = {
//             name: name.trim(),
//             email: email.trim(),
//             password: spassword,
//             mobile: mobile.trim(),
//             is_admin: false,
//             is_verified: false,

//         };

        
//         const otp = generateOtp()
//         // const userData = await user.save()
//         await sendVerifyMail(name,email,null,otp)
//         req.session.tempUser = {
//             tempUserData,
//             email,
//             otp,
//             expiresAt: Date.now() + 1 * 60 * 1000
//         }

        


//         // if(userData){
//         //     res.render('login',{message:"Your registration has been successfull."})
//         // }
//         // if (userData) {
//         //     req.session.message = "Your registration has been successful."; // Set message in session
//         //     return res.redirect('/sign-in'); // Use redirect
//         // }
//         // else{
//         //     res.render('sign-up',{message:"Your registration has been failed"})
//         // }
//         res.redirect('/verify-otp');
//     } catch (error) {
//         console.log(error.message);
//         res.render("sign-up", { message: "Something went wrong. Please try again later." });
//     }
// }

const insertUser = async (req, res) => {
    try {
        const { name, email, mobile, password, cpassword } = req.body;

        // Server-side Validation (Ensure fields are not empty)
        if (!name || !email || !password || !cpassword || !mobile) {
            return res.json({ success: false, message: "All fields are required." });
        }

        // Validate if password matches
        if (password !== cpassword) {
            return res.json({ success: false, message: "Passwords do not match." });
        }

        // Email and Mobile uniqueness check
        const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
        if (existingUser) {
            return res.json({ success: false, message: "Email or Mobile already exists." });
        }

        // Secure the password
        const spassword = await securePassword(password);

        // Generate OTP for verification
        const otp = generateOtp();

        // Create user object
        const tempUserData = {
            name: name.trim(),
            email: email.trim(),
            password: spassword,
            mobile: mobile.trim(),
            is_admin: false,
            is_verified: false,
        };

        // Send verification OTP email
        await sendVerifyMail(name, email,null, otp);

        // Store temp user session for OTP verification
        req.session.tempUser = {
            tempUserData,
            email,
            otp,
            expiresAt: Date.now() + 1 * 60 * 1000, // OTP valid for 1 minute
        };

        // Send success response with redirect
        req.session.registrationMessage = "Registration successful! Please verify the OTP sent to your email.";
        return res.json({ success: true, message: "Registration successful! Please verify OTP.", redirect: '/verify-otp' });
    } catch (error) {
        console.error(error);
        return res.json({ success: false, message: "An error occurred during registration." });
    }
};

const renderOtpVerification = async (req, res) => {
    try {
        
        const message = {
            success: req.session.registrationMessage || req.flash('success'),
            error: req.flash('error')
        };

        delete req.session.registrationMessage;

        res.render("verify-otp", { message });
    } catch (error) {
        console.log(error.message);
        res.redirect('/sign-up');
    }
}

const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;

        // Check if session data exists
        if (!req.session.tempUser) {
            
            req.flash('error', 'Session expired. Please register again.');
            return res.redirect('/verify-otp');
        }

        const { tempUserData, otp: storedOtp, expiresAt } = req.session.tempUser;

        // Validate OTP
        if (Date.now() > expiresAt) {
            
            req.flash('error', 'OTP expired. Please resend the OTP.');
            return res.redirect('/verify-otp');
        }
        if (otp !== storedOtp) {
            
            req.flash('error', 'Invalid OTP. Please try again.');
            return res.redirect('/verify-otp');
        }

        // Save user to the database
        const newUser = new User(tempUserData);
        await newUser.save();

        await User.updateOne({ email: tempUserData.email }, { is_verified: true });
        
        // Clear session and redirect to login
        req.session.tempUser = null;
        // req.session.message = "OTP verified successfully. Please log in to continue.";
        req.flash('success', 'OTP verified successfully. Please log in to continue.');
        res.redirect('/sign-in');
    } catch (error) {
        console.log(error.message);
        // res.render("verify-otp", { message: "Something went wrong. Please try again later." });
        req.flash('error', 'Something went wrong. Please try again later.');
        res.redirect('/verify-otp');
    }
}

const resendOtp = async (req, res) => {
    try {
        if (!req.session.tempUser) {
            return res.status(400).json({ success: false, message: "Session expired. Please register again." });
        }

        const { tempUserData } = req.session.tempUser;

        // Generate new OTP and expiry
        const newOtp = generateOtp();
        const expiresAt = Date.now() + 60 * 1000; // 

        // Update session
        req.session.tempUser = { tempUserData, otp: newOtp, expiresAt };

        //send new OTP 
        await sendVerifyMail(tempUserData.name, tempUserData.email, null, newOtp);

        res.json({ success: true, message: "New OTP sent successfully." });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: "Something went wrong. Please try again later." });
    }
}


// const renderShop = async (req,res) => {
//     try {
//         const user = req.session.user_id ? await User.findById(req.session.user_id) : null;
//         const categories = await Category.find( { is_listed:true } )
//         const unblockedCategoryIds = categories.map((Category)=>Category._id);

//         // Capture query params for search and sorting
//         const { sortBy, search } = req.query;

//         let sortOptions = {};
//         let searchCondition = {};

//         if (search) {
//             searchCondition = {
//                 name: { $regex: search, $options: 'i' }  // Case-insensitive search by product name
//             };
//         }

//         // Sorting logic
//         switch (sortBy) {
//             case 'popularity':
//                 sortOptions = { popularity: -1 };  // Sort by popularity (descending)
//                 break;
//             case 'price_low_to_high':
//                 sortOptions = { price: 1 };  // Sort by price (ascending)
//                 break;
//             case 'price_high_to_low':
//                 sortOptions = { price: -1 };  // Sort by price (descending)
//                 break;
//             case 'average_ratings':
//                 sortOptions = { average_rating: -1 };  // Sort by ratings (descending)
//                 break;
//             case 'featured':
//                 sortOptions = { featured: -1 };  // Featured products first (descending)
//                 break;
//             case 'new_arrivals':
//                 sortOptions = { createdAt: -1 };  // Sort by creation date (newest first)
//                 break;
//             case 'a_to_z':
//                 sortOptions = { name: 1 };  // Sort alphabetically (A-Z)
//                 break;
//             case 'z_to_a':
//                 sortOptions = { name: -1 };  // Sort alphabetically (Z-A)
//                 break;
//             default:
//                 sortOptions = {};  // Default no sorting
//         }

//         const productData = await Products.find( { is_listed:true, category:{$in:unblockedCategoryIds}, ...searchCondition } ).sort(sortOptions);
//         const renderData = {productData,categories,search }
//         res.render('shop',{user,renderData,sortBy})
//     } catch (error) {
//         console.log(error.message);
//     }
// }


const generateProductFilter = (search, category, unblockedCategoryIds) => {
    let filter = { is_listed: true, category: { $in: unblockedCategoryIds } };
  
    if (search) {
      filter.name = { $regex: search, $options: "i" }; // Case-insensitive search
    }
  
    if (category && category !== "all") {
      filter.category = category;
    }
  
    return filter;
  };
  

  const generateSortOptions = (sortBy) => {
    switch (sortBy) {
      case "price_low_to_high":
        return { price: 1 };
      case "price_high_to_low":
        return { price: -1 };
      case "new_arrivals":
        return { createdAt: -1 };
      case "name_az":
        return { name: 1 };
      case "name_za":
        return { name: -1 };
      default:
        return {}; // Default no sorting
    }
  };
  

  const fetchAndEnhanceProducts = async (filter, sortBy, page, limit) => {
    const sortOptions = generateSortOptions(sortBy);
    const totalProducts = await Products.countDocuments(filter);
  
    const productData = await Products.find(filter)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit);
  
    const newLabelCountdownDays = 3;
    const today = new Date();
  
    const enhancedProducts = productData.map((product) => {
      const daysSinceCreation = Math.floor(
        (today - new Date(product.createdAt)) / (1000 * 60 * 60 * 24)
      );
      const isNew = daysSinceCreation <= newLabelCountdownDays && product.quantity > 0;
  
      return {
        ...product.toObject(),
        outOfStock: product.quantity === 0,
        isNew,
      };
    });
  
    return { enhancedProducts, totalProducts };
  };
  
const renderShop = async (req, res) => {
    try {
      const user = req.session.user_id ? await User.findById(req.session.user_id) : null;
      const { sortBy, search, category, page = 1 } = req.query;
      const limit = 9; // Number of products per page
  
      const categories = await Category.find({ is_listed: true });
      const unblockedCategoryIds = categories.map((cat) => cat._id);
  
      // Generate filter for product search
      const filter = generateProductFilter(search, category, unblockedCategoryIds);
  
      // Fetch and enhance product data
      const { enhancedProducts, totalProducts } = await fetchAndEnhanceProducts(
        filter,
        sortBy,
        page,
        limit
      );
  
      const totalPages = Math.ceil(totalProducts / limit);
  
      const renderData = {
        productData: enhancedProducts,
        categories,
        search,
        currentPage: parseInt(page),
        totalPages,
      };
  
      res.render("shop", { user, renderData, sortBy });
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal server error");
    }
  };
  

const renderProductDetails = async (req, res) => {
    try {
        const user = req.session.user_id ? await User.findById(req.session.user_id) : null;
        const productId = req.params.productId;
        
        // Fetch product details
        const product = await Products.findById(productId).populate('category');
        if (!product) {
            return res.render("productDetails", { product: null, relatedProducts: [], user: null });
        }

        // Fetch related products (same category, excluding current product)
        const relatedProducts = await Products.find({
            category: product.category._id, 
            _id: { $ne: productId },
            is_listed: true
        }).limit(4);

        const outOfStock = product.quantity === 0;
        // Prepare data to pass to the view
        const renderData = {
            product,
            relatedProducts,
            user,
            outOfStock 
        };

        // Render product details page
        return res.render("productDetails", renderData);
    } catch (error) {
        console.error("Error rendering product details:", error.message);
        return res.status(500).render("error", { error: "Failed to load product details" });
    }
};

  const logout = async(req,res)=>{
    
        try {
            req.session.destroy((err) => {
                if (err) {
                    console.error("Error during session destruction:", err);
                    return res.status(500).send("Failed to logout. Please try again.");
                }
                res.redirect('/sign-in'); 
            });
        } catch (error) {
            console.error("Error in logout controller:", error.message);
            res.status(500).send("Something went wrong.");
        }
    
    
  }




module.exports = {
    renderHome,
    renderSignIn,
    login,
    renderForgotPassword,
    forgotPassword,
    renderResetPassword,
    resetPassword,
    insertUser,
    renderSignUp,
    verifyOtp,
    renderOtpVerification,
    resendOtp,
    renderShop,
    renderProductDetails,
    logout,
}