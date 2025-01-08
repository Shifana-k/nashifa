const express = require('express')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
dotenv.config()

const session = require('express-session');
const flash = require('express-flash');

const passport = require('passport');
require('./middlewares/passport-config'); 

const db = require("./config/db");
db();
// mongoose.connect(process.env.mongo_url)


const updateCartCount = require('./middlewares/updateCartCount');
const app = express()
app.use(
    session({
        secret: 'sessionSecret', 
        resave: false, 
        saveUninitialized: false, 
    })
);

app.use(passport.initialize());
app.use(passport.session());


app.use(flash());


app.use(express.json());
app.use(express.urlencoded({extended:true}))

app.set('view engine','ejs')
app.use(express.static(__dirname+'/public'))

app.use(updateCartCount);
//for user routes
const userRoute = require('./routes/userRoute')
app.use('/',userRoute)

//for admin routes
const adminRoute = require('./routes/adminRoute')
app.use('/admin',adminRoute)


app.listen(3000,()=>{
console.log(`Server is running on port http://localhost:3000`);
})