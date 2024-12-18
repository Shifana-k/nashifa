const User = require("../models/userModel");
const Address = require("../models/userAddress");
const Products = require("../models/productModel");
const Order = require("../models/orderModel");


const renderProfile = async(req,res)=>{
    try {
        
        const userId = req.session.user_id;
        if(!userId){
            return res.redirect('/sign-in')
        }

        const userData = await User.findById({ _id: userId });
        if (!userData) {
            console.log("User not found");
            return res.render('profile', { userData: { name: 'Not Provided', email: 'Not Provided', mobile: 'Not Provided' } });
        }

        res.render('profile',{user: userData, userData});

    } catch (error) {
        console.log(error.message);
        
    }
}  


const renderEditProfile = async(req,res)=>{
    try {
        const userId = req.session.user_id;
        if(!userId){
            return res.redirect('/sign-in');
        }

        const userData = await User.findById({ _id: userId });
        if (!userData) {
            console.log("User not found");
            return res.render('profile', { userData: { name: 'Not Provided', email: 'Not Provided', mobile: 'Not Provided' } });
        }

        res.render('editprofile',{userData})
    } catch (error) {
        console.log(error.message);
        
    }
}


const updateProfile = async(req,res)=>{
    try {
        const userId = req.session.user_id;
        let { name = '', mobile = '' } = req.body;
  
        name = name.trim();
    
        mobile = mobile.trim();
    
        
        if (name === "" || mobile === "") {
          req.flash('error', 'All fields are required');
          return res.redirect('/edit-profile');
        }
    
  
        const nameRegex = /^[a-zA-Z ]+$/;
        if (!nameRegex.test(name)) {
          req.flash('error', 'Please enter a valid name ');
          return res.redirect('/edit-profile');
        }
    
      
        const mobileRegex = /^[6-9]\d{9}$/;
        if (!mobileRegex.test(mobile)) {
          req.flash('error', 'Please enter a valid number');
          return res.redirect('/edit-profile');
        }
    
  
        const updatedProfile = await User.findByIdAndUpdate(userId, { name,mobile }, { new: true });
    
        if (updatedProfile) {
          res.redirect("/profile");
        } else {
          req.flash('error', 'Failed to update profile');
          res.redirect('/edit-profile');
        }
      }  catch (error) {
        console.log(error.message);
    }
}

const renderAddress = async(req,res)=>{
    try {
        const userId = req.session.user_id;
        if(!userId){
            return res.redirect('/sign-in');
        }

        const userData = await User.findById(userId);
        if (!userData) {
            console.log("User not found");
            return res.render('profile', { userData: { name: 'Not Provided', email: 'Not Provided', mobile: 'Not Provided' } });
        }

        const addresses = await Address.find({userId});
        res.render('address',{userData,addresses,user:userData})
    } catch (error) {
        console.log(error.message);
    }
}

const renderAddNewAddress = async(req,res)=>{
    try {
        res.render('addnewaddress');
    } catch (error) {
        console.log(error.message);
    }
}

const insertNewAddress = async(req,res)=>{
    try {
        const userId = req.session.user_id;
        const { pincode, locality, address, city, state, addresstype } = req.body;
        const trimmedPincode = pincode.trim();
        const trimmedLocality = locality.trim();
        const trimmedAddress = address.trim();
        const trimmedCity = city.trim();
        const trimmedState = state.trim();
  
    
        if (!userId) {
          req.flash("error", "You must be logged in to perform this action");
          return res.redirect("/sign-in");
        }
        if (!trimmedPincode || !trimmedLocality || !trimmedAddress || !trimmedCity || !trimmedState) {
          req.flash("error", "All fields are required");
          return res.redirect("/add-address");
        }
       
    
        let numRegex = /^\d+$/
        const pincodeRegex = /^\d{6}$/;  
        if (!pincodeRegex.test(trimmedPincode)) {
          req.flash("error", "Enter a valid pincode");
          return res.redirect("/add-address");
        }
    
        const allFieldsAreSpaces = Object.values(req.body).every(
          (value) => value.trim() === ""
        );
        if (allFieldsAreSpaces) {
          req.flash("error", "All fields cannot be empty or contain only spaces");
          return res.redirect("/add-address");
        }
        if(numRegex.test(trimmedLocality||trimmedAddress||trimmedCity||trimmedCity)){
          req.flash("error", "Enter a valid address");
          return res.redirect("/add-address");
        }
      
        const newAddress = new Address({
          userId,
          pincode,
          locality,
          address,
          city,
          state,
          addresstype,
        });
    
        const userAddress = await newAddress.save();
    
        req.session.useraddress = userAddress;
        req.flash("success", "Address added successfully");
        res.redirect("/address");
      } catch (error) {
        console.log(error.message);
        req.flash("error", "Internal server error");
        res.redirect("/address");
    }
}

const renderEditAddress = async(req,res)=>{
    try {
        
        const userId = req.session.user_id;
        
        if (!userId) {
            return res.redirect("/sign-in");
        }

        const addressId = req.query.id;
        console.log(addressId);
        const address = await Address.findById(addressId);
        console.log(address);

        if (!address || address.userId !== userId) {
            return res.status(404).send("Address not found");
        }

        res.render("editaddress", { userData: [address] });
    } catch (error) {
        console.log(error.message);
    }
}

const updateAddress = async(req,res)=>{
    try {
        const userId = req.session.user_id;

        if (!userId) {
            req.flash("error", "You must be logged in to perform this action");
            return res.redirect("/sign-in");
        }

        const addressId = req.body.addressId;
        const { pincode, locality, address, city, state, addresstype } = req.body;

        const pincodeRegex = /^\d+$/;
        if (!pincodeRegex.test(pincode)) {
            req.flash("error", "Pincode must contain only numbers");
            return res.redirect("/edit-address");
        }
        const existingAddress = await Address.findOne({ _id: addressId, userId });

        if (!existingAddress) {
            req.flash("error", "Address not found or does not belong to the user");
            return res.status(404).send("Address not found or does not belong to the user");
        }

        const updatedAddress = await Address.findByIdAndUpdate(
            addressId,
            { pincode, locality, address, city, state, addresstype },
            { new: true }
        );

        if (updatedAddress) {
            req.flash("success", "Address updated successfully");
            return res.redirect("/address");
        } else {
            req.flash("error", "Failed to update address");
            return res.status(500).send("Failed to update address");
        }
    } catch (error) {
        console.log(error.message);
        req.flash("error", "Internal server error");
        return res.redirect("/edit-address");
    }
}

const deleteAddress = async(req,res)=>{
    try {
        const userId = req.session.user_id;
        const addressId = req.params.id;

        if (!userId) {
            req.flash("error", "You must be authorised to perform this action");
            return res.redirect("/sign-in");
        }
        const address = await Address.findOne({_id:addressId,userId});

        if (!address) {
            console.log("Address not found or does not belong to the user");
            return res.json({ error: "Address not found or does not belong to the user" });
        }

        await Address.findByIdAndDelete(addressId);

        res.status(200).json({ message: "Address deleted successfully" });
    } catch (error) {
        console.log(error.message);
    }
}

const renderMyOrder = async(req,res)=>{
    try {
        if (req.session.user_id) {
            const userId = req.session.user_id;
            const user = await User.findById(userId);
            const orderData = await Order.find({ userId })
              .sort({createdAt:-1})
              .populate('orderedItem.productId')
              .populate('deliveryAddress');
            
            res.render('myorders', { orderData, userData: user,user });
          } else {
            res.redirect('/sign-in');
          }
    } catch (error) {
        console.log(error.message);
    }
}

const renderOrderDetails = async(req,res)=>{
    try {
        
        const userId = req.session.user_id;
        const { productId, orderItemId } = req.query;

        const userData = await User.findById(userId);

        const orderData = await Order.findOne({
            userId: userId,
            'orderedItem.productId': productId,
            'orderedItem._id': orderItemId
        })
        .populate('orderedItem.productId')
        .populate('userId')
        .populate('deliveryAddress');

        if (!orderData) {
            return res.render("orderdetails", { message: "Order details not found." });
        }

        const specificProduct = orderData.orderedItem.find(item => item._id.toString() === orderItemId);

        res.render("orderdetails", { orderData, specificProduct, userData });
    } catch (error) {
        console.log(error.message);
    }
}

const cancelOrder = async(req,res)=>{
    try {
        const userId = req.session.user_id;
        const { orderItemId, cancelReason } = req.body;

if (!userId) {
    console.log("Unauthorized: No user ID found in session");
    return res.status(401).json({ error: "Unauthorized" });
}

const order = await Order.findOne({ 'orderedItem._id': orderItemId, userId }).populate("orderedItem.productId");

if (!order) {
    console.log("Order not found or does not belong to the user");
    return res.status(404).json({ error: "Order not found or does not belong to the user" });
}

const orderedItem = order.orderedItem.find(item => item._id.toString() === orderItemId);

if (!orderedItem) {
    console.log("Ordered item not found");
    return res.status(404).json({ error: "Ordered item not found" });
}

if (orderedItem.status === "Cancelled") {
    console.log("Product is already cancelled");
    return res.status(400).json({ error: "Product is already cancelled" });
}

const refundAmount = order.deliveryCharge ? orderedItem.totalProductAmount * orderedItem.quantity + order.deliveryCharge : orderedItem.totalProductAmount * orderedItem.quantity;

orderedItem.status = "Cancelled";
orderedItem.reason = cancelReason;
await order.save();

if (order.paymentMethod !== "cashOnDelivery") {
    const userWallet = await Wallet.findOne({ userId });
    if (!userWallet) {
        console.log("Wallet not found for user");
        return res.status(404).json({ error: "Wallet not found" });
    }

    userWallet.balance += refundAmount;
    userWallet.transactions.push({
        amount: refundAmount,
        transactionMethod: "Refund",
        date: new Date(),
    });
    await userWallet.save();
}

const product = await Products.findById(orderedItem.productId._id);
if (!product) {
    console.log("Product not found");
    return res.status(404).json({ error: "Product not found" });
}

product.quantity += orderedItem.quantity;
await product.save();

res.status(200).json({ success: "Order cancelled successfully", refundAmount: order.paymentMethod !== "cashOnDelivery" ? refundAmount : 0 });

    } catch (error) {
        console.log(error.message);
    }
}



module.exports = {
    renderProfile,
    renderEditProfile,
    updateProfile,
    renderAddress,
    renderAddNewAddress,
    insertNewAddress,
    renderEditAddress,
    updateAddress,
    deleteAddress,
    renderMyOrder,
    renderOrderDetails,
    cancelOrder,
}