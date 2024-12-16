const Products = require('../models/productModel');
const Order=require('../models/orderModel');


const renderOrders = async(req,res)=>{
    try {
        const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments();
    const totalPages = Math.ceil(totalOrders / limit);

    const orderData = await Order.find()
      .sort({createdAt:-1})
      .populate("orderedItem.productId")
      .populate('userId')
      .skip(skip)
      .limit(limit);

    res.render('order', {
      orderData,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
    });
    } catch (error) {
        console.log(error.message);
    }
}


const orderDetails = async(req,res)=>{
    

    try {
        const { productId, userId ,orderId} = req.query;
        const order = await Order.findOne({ _id:orderId, userId:userId})
            .populate('orderedItem.productId')
            .populate('userId')
            .populate('deliveryAddress')
            .populate('deliveryCharge')
            console.log(order);
            if (!order) {
                return res.status(404).send("Order not found");
            }
    
            const product = order.orderedItem.find(item => item.productId._id.toString() === productId);
            if (!product) {
                return res.status(404).send("Product not found in this order");
            }
        res.render('orderDetails',{ order, product });

    } catch (error) {
        console.log(error.message);
    }
}


const updateProductStatus = async(req,res)=>{
    const { orderId, productId, productStatus } = req.body;
    try {
        const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
  
      const product = order.orderedItem.find(item => item.productId.toString() === productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found in this order' });
      }
  
      product.status = productStatus;
      await order.save();
  
      res.status(200).json({ message: 'Product status updated successfully' });
    } catch (error) {
        console.log(error.message);
    }
}
module.exports={
    renderOrders,
    orderDetails,
    updateProductStatus,
}