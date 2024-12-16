const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
    },
    password: {
        type: String, 
        required: function() { return !this.isOAuth; } 
    },
    mobile: {
        type: String, 
        required: function() { return !this.isOAuth; } 
    },
    is_admin: {
        type: Boolean,
        required: function() { return this.is_verified !== undefined; } 
    }, 
    is_verified: { 
        type: Boolean, 
        default: false 
    },
    isOAuth: { 
        type: Boolean, 
        default: false 
    }, 
    isBlocked: { 
        type: Boolean, 
        default: false 
    },
    cart:[{
        type: mongoose.Schema.Types.ObjectId,
        ref:"Cart",
    }],
    wallet:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"Wishlist",
    },
    orderHistory:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Order"
    }],
    createdOn: {
        type:Date,
        default:Date.now,
    },
    referalCode:{
        type:String
    },
    redeemed:{
        type:Boolean
    },
    redeemedUsers:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }],
    searchHistory:[{
        category:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Category",
        },
        brand:{
            type:String
        },
        searchOn:{
            type:Date,
            default:Date.now
        }
    }],
    resetToken: String,
    resetTokenExpiry: Date,

},
{ timestamps: true }
)


module.exports = mongoose.model('User',userSchema)