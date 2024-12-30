const User = require("../models/userModel");
const moment = require("moment");
const Order = require('../models/orderModel');

const renderLogin = async(req,res)=>{
    try {
        
        const message = {
            success: req.flash('success'),
            error: req.flash('error')
        };

        // Set cache-control header to prevent caching
        res.setHeader(
            "Cache-Control",
            "no-store, no-cache, must-revalidate, private"
        );

        res.render('login',{message})
    } catch (error) {
        console.log(error.message);
        
    }
}


const renderDashboard = async(req,res)=>{
    try {
        res.redirect('/admin/dashboard')
    } catch (error) {
        console.log(error.message);
    }
}
const loadDashboard = async(req,res)=>{
    try {
        const allOrders = await Order.find().populate({
            path: "orderedItem.productId",
            populate: {
              path: "category",
              model: "Category",
            },
          });
      
          let deliveredOrders = [];
          let returnedOrders = [];
          let cancelledOrders = [];
      
          let totalRevenue = 0;
          let currentMonthEarnings = 0;
      
          const productPurchaseCount = {};
          const categoryPurchaseCount = {};
      
          const now = new Date();
          const thisMonth = now.getMonth();
          const thisYear = now.getFullYear();
      
          allOrders.forEach((order) => {
            const orderDate = new Date(order.orderDate);
      
            order.orderedItem.forEach((item) => {
              const productId = item.productId._id.toString();
              const categoryName =
                (item.productId.category && item.productId.category.name) ||
                "Unknown";
      
              if (item.status === "delivered") {
                deliveredOrders.push(order);
              } else if (item.status === "Returned") {
                returnedOrders.push(order);
              } else if (item.status === "Cancelled") {
                cancelledOrders.push(order);
              }
      
              if (item.status !== "Cancelled" && item.status !== "Returned") {
                totalRevenue += item.priceAtPurchase * item.quantity;
                if (
                  orderDate.getMonth() === thisMonth &&
                  orderDate.getFullYear() === thisYear
                ) {
                  currentMonthEarnings += item.priceAtPurchase * item.quantity;
                }
      
                // Count product purchases
                if (!productPurchaseCount[productId]) {
                  productPurchaseCount[productId] = {
                    name: item.productId.name || "Unknown",
                    count: 0,
                  };
                }
                productPurchaseCount[productId].count += item.quantity;
      
                // Count category purchases
                if (!categoryPurchaseCount[categoryName]) {
                  categoryPurchaseCount[categoryName] = 0;
                }
                categoryPurchaseCount[categoryName] += item.quantity;
              }
            });
          });
      
          const totalOrders = allOrders.length;
          const totalReturns = returnedOrders.length;
          const totalCancellations = cancelledOrders.length;
      
          // Get top 10 products
          const topProducts = Object.values(productPurchaseCount)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
      
          // Get top 10 categories
          const topCategories = Object.entries(categoryPurchaseCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }));
      
          const chartData = {
            sales: {
              labels: ["Total Revenue"],
              data: [totalRevenue],
            },
            orders: {
              labels: ["Delivered", "Returned", "Cancelled"],
              data: [
                deliveredOrders.length,
                returnedOrders.length,
                cancelledOrders.length,
              ],
            },
            totalOrders: totalOrders,
          };
      
          res.render("dashboard", {
            deliveredOrders,
            totalOrders,
            totalRevenue,
            totalReturns,
            totalCancellations,
            monthlyEarning: currentMonthEarnings,
            chartData: JSON.stringify(chartData),
            topProducts,
            topCategories,
          });
    } catch (error) {
        console.log("Error in loadDashboard");
        
        console.log(error.message);
    }
}

const renderCustomer = async(req,res)=>{
    try {
        const userData = await User.find({ is_admin: 0 });
    const formattedUserData = userData.map((user) => {
      const joinedAtFormatted = moment(user.joinedAt).format("DD/MM/YYYY");
      return { ...user.toObject(), joinedAtFormatted };
    });
    return res.render("customers", { userData: formattedUserData });
    } catch (error) {
        console.log(error.message);
    }
}


const blockUser = async(req,res)=>{
    try {
        
        const { userId } = req.body;
    
        const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: { isBlocked: true } },
        { new: true }
     );
    console.log(updatedUser);
    return res
      .status(200)
      .send({
        message: "User blocked successfully",
        redirect: "/admin/customers",
      });
    } catch (error) {
        console.log(error.message);
        
    }
}

const unblockUser = async(req,res)=>{
    try {
        
        const { userId } = req.body
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: { isBlocked:false } },
            { new: true }
        );
        console.log(updatedUser);
        return res.status(200)
        .send({
            message: "User unblocked successfully",
            redirect: "/admin/customers",
        })
        
    } catch (error) {
        console.log(error.message);
    }
}

const generateData = async(req,res)=>{
    const reportType = req.query.reportType;
    console.log("generateData called with reportType:", req.query.reportType);
    try {
        
        const totalOrders = await Order.countDocuments();
        const now = new Date();
        let labels = [];
        let salesData = [];
        let ordersData = [];

        switch (reportType) {
        case "daily":
            labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
            for (let i = 0; i < 24; i++) {
            const startHour = new Date(now);
            startHour.setHours(i, 0, 0, 0);
            const endHour = new Date(now);
            endHour.setHours(i + 1, 0, 0, 0);

            const orders = await Order.find({
                createdAt: { $gte: startHour, $lt: endHour },
            });

            ordersData.push(orders.length);
            salesData.push(
                orders.reduce((sum, order) => sum + order.orderAmount, 0)
            );
            }
            break;

        case "weekly":
            for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString("en-US", { weekday: "short" }));

            const startDay = new Date(date);
            startDay.setHours(0, 0, 0, 0);
            const endDay = new Date(date);
            endDay.setHours(23, 59, 59, 999);

            const orders = await Order.find({
                createdAt: { $gte: startDay, $lte: endDay },
            });

            ordersData.push(orders.length);
            salesData.push(
                orders.reduce((sum, order) => sum + order.orderAmount, 0)
            );
            }
            break;

        case "monthly":
            const daysInMonth = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0
            ).getDate();
            for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(now.getFullYear(), now.getMonth(), i);
            labels.push(i.toString());

            const startDay = new Date(date);
            startDay.setHours(0, 0, 0, 0);
            const endDay = new Date(date);
            endDay.setHours(23, 59, 59, 999);

            const orders = await Order.find({
                createdAt: { $gte: startDay, $lte: endDay },
            });

            ordersData.push(orders.length);
            salesData.push(
                orders.reduce((sum, order) => sum + order.orderAmount, 0)
            );
            }
            break;

        case "yearly":
            for (let i = 0; i < 12; i++) {
            const date = new Date(now.getFullYear(), i, 1);
            labels.push(date.toLocaleDateString("en-US", { month: "short" }));

            const startMonth = new Date(now.getFullYear(), i, 1);
            const endMonth = new Date(now.getFullYear(), i + 1, 0);

            const orders = await Order.find({
                createdAt: { $gte: startMonth, $lte: endMonth },
            });

            ordersData.push(orders.length);
            salesData.push(
                orders.reduce((sum, order) => sum + order.orderAmount, 0)
            );
            }
            break;

        default:
            break;
        }

        const data = {
        sales: { labels: labels, data: salesData },
        orders: { labels: labels, data: ordersData },
        totalOrders: totalOrders,
        };

        res.json(data);

    } catch (error) {
        console.log("Error in generateData");
        console.log(error.message);
    }
}
const loadLogout =async(req,res)=>{
    try {
        req.session.destroy()
        res.redirect("/admin");
    } catch (error) {
        return res.status(500).send({ error: "Internal server error" });
    }
}

module.exports = {
    renderLogin,
    renderDashboard,
    loadDashboard,
    renderCustomer,
    blockUser,
    unblockUser,
    generateData,
    loadLogout,
}