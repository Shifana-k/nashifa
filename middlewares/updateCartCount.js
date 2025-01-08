const CartItem = require('../models/cartModel');

const updateCartCount = async (req, res, next) => {
    try {
      if (req.session.user_id) {
        const userId = req.session.user_id;
        const cartItems = await CartItem.find({ userId });
  
        let totalProductCount = 0;
        cartItems.forEach((cartItem) => {
          cartItem.product.forEach((product) => {
            totalProductCount += product.quantity;
          });
        });
  
        res.locals.cartCount = totalProductCount; // Pass cart count to views
      } else {
        res.locals.cartCount = 0; // No items if not logged in
      }
      next();
    } catch (error) {
      console.error("Error updating cart count:", error.message);
      res.locals.cartCount = 0;
      next();
    }
  };

  
  module.exports = updateCartCount ;
  