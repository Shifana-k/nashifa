const User = require('../models/userModel');
const CartItem = require('../models/cartModel');
const Address = require('../models/userAddress');
const Products = require('../models/productModel');
const Order = require('../models/orderModel');

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

        res.render('cart', { cartItems: cartItems, userData: userData });
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
    const userData = await User.findById(userId);
    const addressData = await Address.find({ userId });
    
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
    
        if (paymentMethod === "razorpay") {
            return res.status(400).json({
              success: false,
              message: "Razorpay payment method is not supported.",
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

const renderOrderplaced = async(req,res)=>{
    try {
        res.render('orderplaced');
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
    placeOrder,
    renderOrderplaced,
};
