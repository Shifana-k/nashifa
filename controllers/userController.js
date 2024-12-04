const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto')


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
        res.render('home')
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Server Error")
    }
}

const renderShop = async (req,res) => {
    try {
        res.render('shop')
    } catch (error) {
        console.log(error.message);
    }
}

const renderSignIn = async (req,res) => {
    try {

        // Check if user is already logged in
        if (req.session.user_id) {
            return res.redirect('/'); // Redirect if already logged in
        }
        const message = req.session.message || ""; 
        req.session.message = null; 

        // Set cache-control header to prevent caching
        res.setHeader(
            "Cache-Control",
            "no-store, no-cache, must-revalidate, private"
        );

        res.render('sign-in', { message })

    } catch (error) {
        console.log(error.message);
    }
}

const login = async (req,res) => {
    try {
        const { email, password } = req.body;
    // Add login logic here
    res.redirect('/shop'); // Redirect to shop after successful login
    } catch (error) {
        console.log(error.message);
    }
}


const renderSignUp = async(req,res)=>{
    try {
        res.render('sign-up')
    } catch (error) {
    console.log(error.message);
    }
}

const insertUser = async (req,res) => {
    try {


        const { name, email, password, cpassword, mobile } = req.body;

        // Check for empty fields
        if (!name || !email || !password || !cpassword || !mobile) {
            return res.render("sign-up", {
                message: "All fields are required.",
            });
        }

        // Check for whitespace
        if (/\s/.test(name) || /\s/.test(email) || /\s/.test(password) || /\s/.test(mobile)) {
            return res.render("sign-up", {
                message: "Whitespace is not allowed in any field.",
            });
        }

        // Validate name 
        if (name.length < 3 || /[^a-zA-Z\s]/.test(name)) {
            return res.render("sign-up", {
                message: "Name must be at least 3 characters long and contain only letters.",
            });
        }

        // Check if the email is already registered
        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
            return res.render("sign-up", {
                message: "Email is already registered.",
            });
        }


        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.render("sign-up", {
                message: "Please enter a valid email address.",
            });
        }

        // Check email ends with "@gmail.com"
        if (!email.endsWith("@gmail.com")) {
            return res.render("sign-up", {
                message: "Please use a valid Gmail address",
            });
        }

        // Validate mobile number
        if (!/^[6-9]\d{9}$/.test(mobile)) {
            return res.render("sign-up", {
                message: "Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.",
            });
        }

        // Check if the mobile number is already registered
        const existingMobile = await User.findOne({ mobile: mobile });
        if (existingMobile) {
            return res.render("sign-up", {
                message: "Mobile number is already registered.",
            });
        }


        if (password !== cpassword) {
            return res.render("sign-up", {
                message: "Password and Confirm Password do not match",
            });
        }

        if (password.length < 6) {
            return res.render("sign-up", {
                message: "Password must be at least 6 characters long",
            });
        }

        

        const spassword = await securePassword(password);

        // Create and save the new user
        const tempUserData = {
            name: name.trim(),
            email: email.trim(),
            password: spassword,
            mobile: mobile.trim(),
            is_admin: false,
            is_verified: false,

        };

        
        const otp = generateOtp()
        // const userData = await user.save()
        await sendVerifyMail(name,email,null,otp)
        req.session.tempUser = {
            tempUserData,
            email,
            otp,
            expiresAt: Date.now() + 1 * 60 * 1000
        }

        // req.session.otpExpiration = Date.now()+5*60*1000
        // res.re


        // if(userData){
        //     res.render('login',{message:"Your registration has been successfull."})
        // }
        // if (userData) {
        //     req.session.message = "Your registration has been successful."; // Set message in session
        //     return res.redirect('/sign-in'); // Use redirect
        // }
        // else{
        //     res.render('sign-up',{message:"Your registration has been failed"})
        // }
        res.redirect('/verify-otp');
    } catch (error) {
        console.log(error.message);
        res.render("sign-up", { message: "Something went wrong. Please try again later." });
    }
}

const renderOtpVerification = async (req, res) => {
    try {
        const message = req.session.otpMessage || ""; // Use session for persistent messages
        req.session.otpMessage = null; // Clear the message after use
        res.render("verify-otp", { message }); // Pass message to the view
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
            return res.render("verify-otp", { message: "Session expired. Please register again." });
        }

        const { tempUserData, otp: storedOtp, expiresAt } = req.session.tempUser;

        // Validate OTP
        if (Date.now() > expiresAt) {
            return res.render("verify-otp", { message: "OTP expired. Please resend the OTP." });
        }
        if (otp !== storedOtp) {
            return res.render("verify-otp", { message: "Invalid OTP. Please try again." });
        }

        // Save user to the database
        const newUser = new User(tempUserData);
        await newUser.save();

        await User.updateOne({ email: tempUserData.email }, { is_verified: true });
        
        // Clear session and redirect to login
        req.session.tempUser = null;
        req.session.message = "OTP verified successfully. Please log in to continue.";
        res.redirect('/sign-in');
    } catch (error) {
        console.log(error.message);
        res.render("verify-otp", { message: "Something went wrong. Please try again later." });
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





module.exports = {
    renderHome,
    renderShop,
    renderSignIn,
    login,
    insertUser,
    renderSignUp,
    verifyOtp,
    renderOtpVerification,
    resendOtp
}