const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto')
const Category = require('../models/categoryModel');
const Products = require('../models/productModel');
const Wallet = require('../models/walletModel');
const WishlistItem = require('../models/wishlistModel');
const ProductOffer = require('../models/productOffer');
const CategoryOffer = require('../models/categoryOffer');
const CartItem = require('../models/cartModel');


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

        // const userData = tempUserData;
        // const wallet = new Wallet({
        //     userId: userData._id,
        //     balance: 0,
        //     transactions: [],
        //   });
        //   await wallet.save();
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


const generateProductFilter = async (search, category, unblockedCategoryIds, filters) => {
    let filter = { is_listed: true, category: { $in: unblockedCategoryIds } };


    if (search) {
      filter.name = { $regex: search, $options: "i" }; // Case-insensitive search
    }
  
    if (category && category !== "all") {
        try {

            const foundCategory = await Category.findOne({ name: { $regex: new RegExp(`^${category}$`, 'i') }, is_listed: true });
            if (foundCategory) {
                filter.category = foundCategory._id;
            } else {
                // If no category found, log it and keep the original filter
                console.log(`No category found for name: ${category}`);
            }

        } catch (error) {
            console.error("Error finding category:", error);
        }
    }
    if (filters.branding && filters.branding.length > 0) {
        filter.branding = { $in: filters.branding };
    }

    if (filters.priceRange) {
        
        // Handle different price range formats
        const priceRangeParts = filters.priceRange.split('-').map(p => p.replace(/[^\d.]/g, ''));
        

        if (priceRangeParts.length === 2) {
            const minPrice = parseFloat(priceRangeParts[0]);
            const maxPrice = priceRangeParts[1] === '' || priceRangeParts[1] === '+' 
                ? null 
                : parseFloat(priceRangeParts[1]);


            if (maxPrice !== null) {
                filter.price = {
                    $gte: minPrice,
                    $lte: maxPrice
                };
            } else {
                filter.price = {
                    $gte: minPrice // Only minimum price for open-ended ranges
                };
            }
        } else if (priceRangeParts.length === 1) {
            // If it's just a single price (e.g., '5000+')
            const minPrice = parseFloat(priceRangeParts[0]);
    
    
            filter.price = {
                $gte: minPrice // Only minimum price for open-ended ranges
            };
        }
    }

    if (filters.size && filters.size.length > 0) {
        filter.size = { $in: filters.size };
    }

    if (filters.colors && filters.colors.length > 0) {
        filter.color = { $in: filters.colors };
    }

    if (filters.tags && filters.tags.length > 0) {
        filter.tags = { $all: filters.tags }; // Match all specified tags
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
    const currentOffers = await ProductOffer.find();
    const currentCategoryOffers = await CategoryOffer.find();

    const enhancedProducts = productData.map((product) => {
      const daysSinceCreation = Math.floor(
        (today - new Date(product.createdAt)) / (1000 * 60 * 60 * 24)
      );
      const isNew = daysSinceCreation <= newLabelCountdownDays && product.quantity > 0;
      let discountedPrice = product.price;
      let appliedDiscount = 0;


      const productOffer = currentOffers.find(
        (offer) => offer.productId.toString() === product._id.toString()
      );
      if (productOffer) {
        appliedDiscount = Math.max(appliedDiscount, productOffer.discountValue);
      }

      const categoryOffer = currentCategoryOffers.find(
        (offer) => offer.categoryId.toString() === product.category.toString()
      );
      if (categoryOffer) {
        appliedDiscount = Math.max(appliedDiscount, categoryOffer.discountValue);
      }

      if (appliedDiscount > 0) {
        discountedPrice = Math.ceil(
          product.price - (product.price * appliedDiscount) / 100
        );
      }

      return {
        ...product.toObject(),
        outOfStock: product.quantity === 0,
        isNew,
        discountedPrice,
        discountPercentage: appliedDiscount,
      };
    });
  
    return { enhancedProducts, totalProducts };
  };
  
const renderShop = async (req, res) => {
    try {
      const user = req.session.user_id ? await User.findById(req.session.user_id) : null;
      const { sortBy, search, category, page = 1, branding, priceRange, size, colors, tags } = req.query;
      const limit = 9; // Number of products per page
  
      const categories = await Category.find({ is_listed: true });

      for (const category of categories) {
        const productCount = await Products.countDocuments({ 
            category: category._id, 
        is_listed: true // Count only listed products
        });
        category.productCount = productCount; // Attach the product count to the category
    }
      const unblockedCategoryIds = categories.map((cat) => cat._id);

      const currentProductOffers = await ProductOffer.find();
      const currentCategoryOffers = await CategoryOffer.find();

  
      // Parse filters from query parameters
      const filters = {
        branding: branding ? branding.split(",") : [],
        priceRange,
        size: size ? size.split(",") : [],
        colors: colors ? colors.split(",") : [],
        tags: tags ? tags.split(",") : [],
    };

      // Generate filter for product search
      const filter = await generateProductFilter(search, category, unblockedCategoryIds, filters);
  
      // Fetch and enhance product data
      const { enhancedProducts, totalProducts } = await fetchAndEnhanceProducts(
        filter,
        sortBy,
        page,
        limit
      );
  
      const totalPages = Math.ceil(totalProducts / limit);


      const calculateDiscountedPrice = (productPrice, discountPercent) => {
        let discountedPrice =
          productPrice - (productPrice * discountPercent) / 100;
        return Math.round(discountedPrice);
      };
  
      const modifiedProductData = await Promise.all(
        enhancedProducts.map(async (product) => {
        
        const originalProduct = await Products.findById(product._id);

        if (!originalProduct) {
            console.error(`Product with ID ${product._id} not found in the database.`);
            return null; // Skip if the product isn't found
        }

          const productOffer = currentProductOffers.find(
            (offer) => offer.productId.toString() === product._id.toString()
          );
  
          let discountedPrice = originalProduct.price;
          let discountPercent = 0;
  
          if (productOffer) {
            discountPercent = productOffer.discountValue;
            discountedPrice = calculateDiscountedPrice(
              originalProduct.price,
              discountPercent
            );
          }


          const categoryOffer = currentCategoryOffers.find(
            (offer) => offer.categoryId.toString() === originalProduct.category.toString()
        );
        
        if (categoryOffer) {
            // Take the higher discount between product and category offers
            discountPercent = Math.max(
                discountPercent,
                categoryOffer.discountValue
            );
            discountedPrice = calculateDiscountedPrice(
                originalProduct.price,
                discountPercent
            );
        }
  
          originalProduct.discount = discountPercent;
          await originalProduct.save();
  
          return {
            ...originalProduct.toObject(),
            discountedPrice,
            outOfStock: originalProduct.quantity === 0,

          };
        })
      );
  
      const renderData = {
        productData: modifiedProductData,
        categories,
        search,
        currentPage: parseInt(page),
        totalPages,
        filters,
        totalProducts,
        limit, 
        selectedSize: size || 'all',
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
        const productOffer = await ProductOffer.findOne({ productId: product._id });

        const categoryOffer = await CategoryOffer.findOne({
          categoryId: product.category,
        });
    
        let discountedPrice = null;
        if (productOffer) {
          discountedPrice =
            product.price - (product.price * productOffer.discountValue) / 100;
          discountedPrice = Math.round(discountedPrice);
        }
    
        if (categoryOffer) {
          let categoryDiscountedPrice =
            product.price - (product.price * categoryOffer.discountValue) / 100;
          categoryDiscountedPrice = Math.round(categoryDiscountedPrice);
    
          if (!discountedPrice || categoryDiscountedPrice < discountedPrice) {
            discountedPrice = categoryDiscountedPrice;
          }
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
            discountedPrice,
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


const calculateDiscountedPrice = async (product) => {
    const currentProductOffers = await ProductOffer.find();
    const currentCategoryOffers = await CategoryOffer.find();
    const categories = await Category.find({ is_listed: true });
  
    let discountedPrice = product.price;
    let discountPercent = 0;
  
    const productOffer = currentProductOffers.find(
      (offer) => offer.productId.toString() === product._id.toString()
    );
  
    if (productOffer) {
      discountPercent = productOffer.discountValue;
      discountedPrice = product.price - (product.price * discountPercent) / 100;
    }
  
    const category = categories.find(
      (cat) => cat._id.toString() === product.category.toString()
    );
    if (category) {
      const categoryOffer = currentCategoryOffers.find(
        (offer) => offer.categoryId.toString() === category._id.toString()
      );
      if (categoryOffer) {
        discountPercent = Math.max(discountPercent, categoryOffer.discountValue);
        discountedPrice = product.price - (product.price * discountPercent) / 100;
      }
    }
  
    return {
      discountedPrice: Math.round(discountedPrice),
      discountPercent
    };
  };

const renderWishlist = async(req,res)=>{
    try {
        if (!req.session.user_id) {
            return res.redirect("/sign-in");
        }

        const userData = await User.findById(req.session.user_id);
        const wishlistItems = await WishlistItem.find({ userId: req.session.user_id })
            .populate({
                path: 'product.productId',
                model: 'Products',
                select: 'name price mainImage status category' 
            });

            if (!wishlistItems || wishlistItems.length === 0) {
                console.log("No wishlist items found.");
                return res.render("wishlist", { wishlistItems: [], userData , user:userData });
            }

            for (let item of wishlistItems) {
                const product = item.product[0]?.productId;

                if (!product) {
                    console.error(`Product not found for wishlist item: ${item._id}`);
                    continue; // Skip this item
                }
                const { discountedPrice, discountPercent } = await calculateDiscountedPrice(item.product[0].productId);
                item.product[0].discountedPrice = discountedPrice;
                item.product[0].discountPercent = discountPercent;
                await item.save();
      }

        res.render("wishlist", {
            wishlistItems,
            userData,
            user: userData
        });
    } catch (error) {
        console.log(error.message);
    }
}

const addToWishlist = async(req,res)=>{
    try {
        const userId = req.session.user_id;
        const { productId } = req.query;
        
        const product = await Products.findById(productId);
    
        if (!product) {
            console.log("Product not found");
            return res.status(404).send("Product not found");
        }

        const { discountedPrice, discountPercent } = await calculateDiscountedPrice(product);

        let wishlistItem = await WishlistItem.findOne({
        userId: userId,
        "product.productId": productId,
        });
        
        if (!wishlistItem) {
            
            wishlistItem = new WishlistItem({
                userId: userId,
                product: [{
                productId: productId,
                discountedPrice: discountedPrice,
                discountPercent: discountPercent
                }],
            });
            } else {
                wishlistItem.product[0].discountedPrice = discountedPrice;
                wishlistItem.product[0].discountPercent = discountPercent;
              }
        
        await wishlistItem.save();
        
        res.redirect("/wishlist");
    } catch (error) {
        console.log(error.message);
    }
}

const RemoveFromWishlist = async(req,res)=>{
    try {
        const { productId } = req.query;
        if (req.session.user_id) {
        await WishlistItem.findOneAndDelete({
            userId: req.session.user_id,
            "product.productId": productId,
        });
        res.status(200).json({ message: "Item removed from wishlist" });
        } else {
        res.status(401).json({ message: "Unauthorized" });
        }
    } catch (error) {
        console.log(error.message);
    }
}


const moveToCart = async(req,res)=>{
    try {      
        const userId = req.session.user_id;
        const { productId } = req.query;


        const product = await Products.findById(productId);
        if (!product) {
        return res.status(404).send("Product not found");
        }

        if (!product.is_listed) {
            return res.status(400).json({
                success: false,
                message: `The product '${product?.name || "unknown"}' is no longer available.`,
            });
        }
        if (product.quantity==0) {
            return res.status(404).json({
                success: false,
                message:"Insuufficient Stock for product"
            });
        }
        const price = product.price;

        
        let cartItem = await CartItem.findOne({
        userId: userId,
        "product.productId": productId,
        });

        if (!cartItem) {
        // If the product is not in the cart, create a new cart item
        cartItem = new CartItem({
            userId: userId,
            product: [
            {
                productId: productId,
                quantity: 1,
                totalPrice: price, 
                price: price,      // Set price as the regular price
            },
            ],
        });
        } else {
        // If the product is already in the cart, check if it exists in the product array
        const existingProductIndex = cartItem.product.findIndex(
            (item) => item.productId.toString() === productId
        );

        if (existingProductIndex !== -1) {
            // If the product is already in the cart, redirect to the cart page
            return res.redirect("/cart");
        } else {
            // Add the new product to the cart
            cartItem.product.push({
            productId: productId,
            quantity: 1,
            totalPrice: price, // Use the regular price
            price: price,      // Set price as the regular price
            });
        }
        }

        // Save the cart item
        await cartItem.save();

        await WishlistItem.findOneAndDelete({
            userId: userId,
            "product.productId": productId,
        });

        // Redirect to the cart page
        res.redirect("/wishlist");
        
            
    } catch (error) {
        console.log(error.message);
    }
}
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
    renderWishlist,
    addToWishlist,
    RemoveFromWishlist,
    moveToCart,
    logout,
}