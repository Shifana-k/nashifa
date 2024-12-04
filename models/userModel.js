const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
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
})


module.exports = mongoose.model('User',userSchema)