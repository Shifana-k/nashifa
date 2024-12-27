const User = require('../models/userModel');
const CartItem = require('../models/cartModel');
const Address = require('../models/userAddress');
const Products = require('../models/productModel');
const Order = require('../models/orderModel');
const Wallet = require('../models/walletModel');
const crypto = require('crypto');
const Coupon = require('../models/couponModel');
const Wishlist = require('../models/wishlistModel')

const { razorpay_id, razorpay_secret } = process.env;

const Razorpay = require("razorpay");

const razorpayInstance = new Razorpay({
  key_id: razorpay_id,
  key_secret: razorpay_secret,
});

const addToCart = async (req, res) => {
    try {
       
        const userId = req.session.user_id;
        const { productId } = req.query;


        const product = await Products.findById(productId);
        if (!product) {
        return res.status(404).send("Product not found");
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

        await Wishlist.updateOne(
          { userId: userId },
          { $pull: { product: { productId: productId } } }
      );

        // Redirect to the cart page
        res.redirect("/cart");

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Internal server error." });
    }
};

const renderCart = async (req, res) => {
    try {
        const userId = req.session.user_id;
        if (!userId) {
            return res.redirect('/sign-in');
        }

        const userData = await User.findById(userId);
        const cartItems = await CartItem.find({ userId: userId }).populate(
            "product.productId"
        );

        res.render('cart', { cartItems: cartItems, userData: userData,user:userData });
    } catch (error) {
        console.log(error.message);
    }
};

const updateCartItem = async(req,res)=>{
    try {
        const userId = req.session.user_id;
        const { productId, quantityChange } = req.body;


    const cartItems = await CartItem.find({ userId }).populate(
      "product.productId"
    );

    if (!cartItems || cartItems.length === 0) {
      return res
        .status(404)
        .json({ message: "No cart items found for the user" });
    }


    const cartItemToUpdate = cartItems.find(
      (item) => item.product[0].productId.toString() === productId
    );

    if (!cartItemToUpdate) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    const product = cartItemToUpdate.product[0];
    const newQuantity = product.quantity + parseInt(quantityChange);

    if (newQuantity < 1) {
      return res
        .status(400)
        .json({ message: "Quantity cannot be less than 1" });
    }


    const currentProduct = await Products.findById(product.productId);
    if (quantityChange > 0 && newQuantity > currentProduct.quantity) {
      return res.status(400).json({ message: "Not enough stock available" });
    }


    const unitPrice = product.totalPrice / product.quantity; 
    const newTotalPrice = Math.round(unitPrice * newQuantity);

 
    await CartItem.findOneAndUpdate(
      { _id: cartItemToUpdate._id, "product.productId": product.productId },
      {
        $set: {
          "product.$.quantity": newQuantity,
          "product.$.totalPrice": newTotalPrice,
        },
      },
      { new: true }
    );


    const updatedCartItems = await CartItem.find({ userId }).populate(
      "product.productId"
    );

    res.status(200).json({
      message: "Cart items updated successfully",
      cartItems: updatedCartItems,
    });

    } catch (error) {
        console.log(error.message);
    }
}

const removeCartItem = async(req, res)=>{
    try {
        const userId = req.session.user_id;
        const { productId } = req.body;
        const cartItem = await CartItem.findOne({
            userId,
            "product.productId": productId,
            }).populate("product.productId");

        const product = cartItem.product[0];

        await CartItem.deleteOne({
            userId: userId,
            "product.productId": productId,
        });

        await Products.updateOne(
        { _id: product.productId },
        { $inc: { quantity: product.quantity } }
        );

        res.status(200).json({ success: true });
    } catch (error) {
        console.log(error.message);
    }
}

const loadCheckout = async(req,res)=>{
    try {
      const userId = req.session.user_id;

      if (!userId) {
        return res.redirect("/sign-in");
      }

      const cartItems = await CartItem.find({ userId }).populate("product.productId");
      const userData = await User.findById(userId)
      const addressData = await Address.find({ userId });

      const userCoupons = userData.availableCoupons;
      const allCoupons = await Coupon.find({ _id: { $in: userCoupons.map(coupon => coupon.couponId) } });
        

        const currentDate = new Date();
        const couponData = allCoupons.map(coupon => {
            const isExpired = new Date(coupon.validity) < currentDate;
            return {
                ...coupon.toObject(),
                isExpired,
            };
        });
      
      let subtotal = 0;
      let totalProductCount = 0;

      cartItems.forEach((cartItem) => {
        cartItem.product.forEach((product) => {
          subtotal += product.totalPrice ;
          totalProductCount += product.quantity;
        });
      });

    

    const total = subtotal;



    res.render("checkout", {
      user: userData,
      cartItems,
      subtotal,
      total,
      userData,
      addressData,
      couponData,
      razorpay_id: process.env.RAZORPAY_ID,
      totalProductCount,
    });
    
    
    } catch (error) {
        console.log(error.message);
    }
}
const addNewAddress = async(req,res)=>{
  try {
    const userId = req.session.user_id;
    if (!userId) {
      res.redirect("/sign-in");
    } else {
      const userData = await User.findById(userId);
      res.render("addCheckoutAddress", { userData });
    }
  } catch (error) {
    console.log(error.message);
  }
}

const insertCheckoutAddress = async(req,res)=>{
  try {
    const userId = req.session.user_id;
    const { pincode, locality, address, city, state, addresstype } = req.body;

    if (!userId) {
      req.flash("error", "You must be logged in to perform this action");
      return res.redirect("/sign-in");
    }


    const trimmedPincode = pincode.trim();
    const trimmedLocality = locality.trim();
    const trimmedAddress = address.trim();
    const trimmedCity = city.trim();
    const trimmedState = state.trim();
    const trimmedAddresstype = addresstype.trim();

    if (!trimmedPincode || !trimmedLocality || !trimmedAddress || !trimmedCity || !trimmedState || !trimmedAddresstype) {
      req.flash("error", "All fields are required");
      return res.redirect("/addNewAddress");
    }
   

    let numRegex = /^\d+$/
    const pincodeRegex = /^\d{6}$/;  
    if (!pincodeRegex.test(trimmedPincode)) {
      req.flash("error", "Pincode must contain exactly 6 digits");
      return res.redirect("/addNewAddress");
    }

    const allFieldsAreSpaces = Object.values(req.body).every(
      (value) => value.trim() === ""
    );
    if (allFieldsAreSpaces) {
      req.flash("error", "All fields cannot be empty or contain only spaces");
      return res.redirect("/addNewAddress");
    }
    if(numRegex.test(trimmedLocality||trimmedAddress||trimmedCity||trimmedCity)){
      req.flash("error", "Enter a valid address");
      return res.redirect("/addNewAddress");
    }

    const newAddress = new Address({
      userId,
      pincode: trimmedPincode,
      locality: trimmedLocality,
      address: trimmedAddress,
      city: trimmedCity,
      state: trimmedState,
      addresstype: trimmedAddresstype,
    });

    const userAddress = await newAddress.save();

    req.session.useraddress = userAddress;
    req.flash("success", "Address added successfully");
    res.redirect("/checkout");
  } catch (error) {
    console.log(error.message);
  }
}

const removeAddress = async(req,res)=>{
  try {
    const addressId = req.params.id;
    await Address.findByIdAndDelete(addressId);
    res.json({ success: true, message: "Address removed successfully" });
  } catch (error) {
    console.log(error.message);
  }
}

const applyCoupon = async(req,res)=>{
  try {
    const { couponCode } = req.body;
    const userId = req.session.user_id;
    const userData = await User.findById(userId);

    if (!userData) res.redirect("/sign-in");

    const coupon = await Coupon.findOne({ code: couponCode });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    const isCouponUsed = userData.usedCoupons.includes(coupon._id.toString());

    if (isCouponUsed) {
      return res.status(400).json({
        success: false,
        message: "Coupon has already been used",
      });
    }

    const cartItems = await CartItem.find({ userId }).populate(
      "product.productId"
    );

    let orderAmount = 0;
    cartItems.forEach((item) => {
      item.product.forEach((product) => {
        orderAmount += product.totalPrice;
      });
    });

    if (orderAmount <= coupon.minPurchaseAmount) {
      return res.status(400).json({
        success: false,
        message: `Order amount must be greater than ${coupon.minPurchaseAmount} to use this coupon`,
      });
    }

    let discount;
    if (coupon.discountType === "percentage") {
      discount = (coupon.discountValue / 100) * orderAmount;
    } else if (coupon.discountType === "fixed") {
      discount = coupon.discountValue;
    }

    const newTotal = orderAmount - discount;

    userData.usedCoupons.push(coupon._id);
    await userData.save();

    return res.status(200).json({
      success: true,
      newTotal: newTotal,
      discount: discount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}


const removeCoupon = async(req,res)=>{
  try {
    const userId = req.session.user_id;
    const userData = await User.findById(userId);

    if (!userData) res.redirect("/sign-in");

    const { couponCode } = req.body;
    const coupon = await Coupon.findOne({ code: couponCode });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    const isCouponUsed = userData.usedCoupons.includes(coupon._id.toString());

    if (!isCouponUsed) {
      return res.status(400).json({
        success: false,
        message: "Coupon has not been used",
      });
    }

    // Remove coupon from used coupons
    userData.usedCoupons = userData.usedCoupons.filter(
      (usedCoupon) => usedCoupon.toString() !== coupon._id.toString()
    );
    await userData.save();

    // Recalculate order total without coupon
    const cartItems = await CartItem.find({ userId }).populate(
      "product.productId"
    );

    let orderAmount = 0;
    cartItems.forEach((item) => {
      item.product.forEach((product) => {
        orderAmount += product.totalPrice;
      });
    });

    return res.status(200).json({
      success: true,
      newTotal: orderAmount,
      discount: 0,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
const placeOrder = async(req,res)=>{
    try {
        const userId = req.session.user_id;

        if (!userId) {
          return res.status(401).json({
            success: false,
            message: "Please login to place an order.",
          });
        }
    
        const { selectedAddress, paymentMethod, subtotal } = req.body;
    
        if (!selectedAddress) {
          return res.status(400).json({
            success: false,
            message: "Please select a delivery address.",
          });
        } else if (!paymentMethod) {
          return res.status(400).json({
            success: false,
            message: "Please select a payment method.",
          });
        }
    
        const cartItems = await CartItem.find({ userId }).populate("product.productId");
        const cartId = cartItems.map((item) => item._id);
    
        if (cartItems.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Your cart is empty.",
          });
        }
    
        const orderedItems = [];
        let orderSubtotal = 0;
    
        for (const cartItem of cartItems) {
          for (const productItem of cartItem.product) {
            const product = await Products.findById(productItem.productId).populate('category');
            if (!product) {
              return res.status(404).json({
                success: false,
                message: `Product not found with ID: ${productItem.productId}`,
              });
            }
            if (!product.is_listed) {
              return res.status(400).json({
                  success: false,
                  message: `The product '${product?.name || "unknown"}' is no longer available.`,
              });
          }
            if (product.quantity < productItem.quantity) {
              return res.status(400).json({
                success: false,
                message: `Insufficient stock for product: ${product.name}`,
              });
            }
    
            const itemTotal = product.price * productItem.quantity;
            orderSubtotal += itemTotal;
    
            orderedItems.push({
              productId: productItem.productId,
              quantity: productItem.quantity,
              priceAtPurchase: product.price,
              totalProductAmount: itemTotal,
              status: 'pending'
            });
    
            product.quantity -= productItem.quantity;
            await product.save();
          }
        }
    
        const orderAmount = orderSubtotal;
        if (paymentMethod === "wallet") {
          const userWallet = await Wallet.findOne({ userId });
    
          if (!userWallet) {
            return res.status(400).json({
              success: false,
              message: "Wallet not found for user.",
            });
          }
    
          if (userWallet.balance < orderAmount) {
            return res.status(400).json({
              success: false,
              message: "Insufficient balance in wallet.",
            });
          }
    
          userWallet.balance -= orderAmount;
          userWallet.transactions.push({
            amount: -orderAmount,
            transactionMethod: "Payment",
            date: Date.now(),
          });
    
          await userWallet.save();
        }
        
        const orderData = new Order({
          userId,
          cartId,
          orderedItem: orderedItems,
          orderAmount,
          orderDate: new Date(),
          deliveryAddress: selectedAddress,
          paymentMethod,
          paymentStatus: paymentMethod !== "razorpay",
        });
    
        await orderData.save();
    
        await CartItem.deleteMany({ _id: { $in: cartId } });

        const eligibleCoupons = await Coupon.find({
          minPurchaseAmount: { $lte: orderAmount },
          validity: { $gt: new Date() }
        });
    
        if (eligibleCoupons.length > 0) {
          const user = await User.findById(userId);
    
          const newCoupons = eligibleCoupons.filter(coupon =>
            !user.availableCoupons.some(availableCoupon =>
              availableCoupon.couponCode === coupon.code
            )
          );
    
          if (newCoupons.length > 0) {
            const couponUpdates = newCoupons.map(coupon => ({
              couponId: coupon._id,
              couponCode: coupon.code
            }));
    
            await User.findByIdAndUpdate(userId, {
              $push: { availableCoupons: { $each: couponUpdates } }
            });
          }
        }
    
        if (paymentMethod === "razorpay") {
          const options = {
            amount: orderAmount * 100, 
            currency: "INR",
            receipt: `order_${orderData._id}`,
          };
    
          razorpayInstance.orders.create(options, async (err, order) => {
            if (err) {
              console.error(err);
              return res.status(500).json({
                success: false,
                message: "Failed to create Razorpay order.",
              });
            }
    
            res.json({
              success: true,
              orderId: orderData._id,
              razorpayOrderId: order.id,
              amount: orderAmount * 100,
              currency: order.currency,
              key_id: razorpay_id,
            });
          });
        } else {
          res.json({
            success: true,
            message: "Order placed successfully",
          });
        } 
    } catch (error) {
        console.log(error.message);
        
    }
}

const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", razorpay_secret)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { paymentStatus: true },
        { new: true }
      );
      if (!updatedOrder) {
        return res.status(404).json({
          success: false,
          message: "Order not found.",
        });
      }

      const cartItems = await CartItem.find({ userId: updatedOrder.userId });
      const cartItemIds = cartItems.map((item) => item._id);
      await CartItem.deleteMany({ _id: { $in: cartItemIds } });

      res.json({
        success: true,
        message: "Payment verified successfully.",
        orderId: orderId,
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Payment verification failed. Invalid signature.",
      });
    }
  } catch (error) {
    console.error("Error in verifyRazorpayPayment:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while verifying payment.",
    });
  }
};

const renderOrderplaced = async(req,res)=>{
    try {
      const user = req.session.user_id;
        res.render('orderplaced',{user});
    } catch (error) {
        console.log(error.message);
    }
}
module.exports = {
    addToCart,
    renderCart,
    updateCartItem,
    removeCartItem,
    loadCheckout,
    addNewAddress,
    insertCheckoutAddress,
    removeAddress,
    applyCoupon,
    removeCoupon,
    placeOrder,
    verifyRazorpayPayment,
    renderOrderplaced,
};
