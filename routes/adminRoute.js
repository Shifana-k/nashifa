const express = require('express')
const admin_route = express()

const adminAuth = require('../middlewares/adminAuth')

const adminController = require('../controllers/adminController')
const categoryController = require('../controllers/categoryController')
const productController = require('../controllers/productsController')
const orderController = require('../controllers/orderController')
const offerController = require('../controllers/offerContoller')
const salesReportController = require('../controllers/salesReportController')

const productsUpload = require('../middlewares/productConfig');


admin_route.set('views','./views/admin')

/*---------------------------------Home, Login, Dashboard--------------------------------------------*/
admin_route.get('/',adminController.renderLogin);

admin_route.post('/login',adminController.renderDashboard);
admin_route.get('/dashboard',adminController.loadDashboard);
admin_route.get('/logout',adminAuth.is_login,adminController.loadLogout);

/*---------------------------------Customer--------------------------------------------*/
admin_route.get('/customer',adminController.renderCustomer);
admin_route.post('/block',adminController.blockUser);
admin_route.post('/unblock',adminController.unblockUser);

/*---------------------------------Category--------------------------------------------*/
admin_route.get('/category',categoryController.renderCategory);
admin_route.get('/addcategory',categoryController.renderAddCategory);
admin_route.post('/insertCategory',categoryController.insertCategory);

admin_route.post('/listCategory',categoryController.listCategory);
admin_route.post('/unlistCategory',categoryController.unlistCategory);

admin_route.get('/editCategory',categoryController.renderEditCategory);
admin_route.put('/updateCategory/:id',categoryController.updateCategory);


/*---------------------------------Products--------------------------------------------*/
admin_route.get('/products',productController.renderProducts);
admin_route.get('/addProduct',productController.renderAddProducts);
admin_route.post('/insertProduct',productsUpload,productController.insertProducts);
admin_route.post('/listProduct',productController.listProduct)
admin_route.post('/unlistProduct',productController.unlistProduct)
admin_route.get('/editProduct',productController.renderEditProduct)
admin_route.put('/updateProduct/:id',productsUpload,productController.updateProduct)


/*---------------------------------Orders--------------------------------------------*/
admin_route.get('/orders',orderController.renderOrders);
admin_route.get('/orderDetails',orderController.orderDetails);
admin_route.post('/updateProductStatus',orderController.updateProductStatus);
admin_route.get('/return',orderController.renderReturnRequest);
admin_route.post('/acceptReturn',orderController.acceptReturn);


/*---------------------------------Coupon & Offers--------------------------------------------*/
admin_route.get('/coupons',offerController.renderCoupons);
admin_route.post('/addCoupon',offerController.addCoupons);
admin_route.delete('/removeCoupon/:couponId',offerController.removeCoupon);
admin_route.get('/product-offers',offerController.renderOffers);
admin_route.get('/addOffer',offerController.addOffer);
admin_route.post('/addProductOffer',offerController.addProductOffer);
admin_route.delete('/removeProductOffer/:offerId',offerController.removeProductOffer);
admin_route.get('/category-offers',offerController.renderCategoryOffer);
admin_route.get('/addCategoryOffer',offerController.renderAddCategoryOffer);
admin_route.post('/addCategoryOffer',offerController.AddCategoryOffer);
admin_route.delete('/removeCategoryOffer/:offerId',offerController.removeCategoryOffer);


/*---------------------------------Sales Report--------------------------------------------*/

admin_route.get('/sales-report',salesReportController.renderSalesReport);
admin_route.post('/sortReport',salesReportController.sortReport);
admin_route.get('/downloadsalesreport',salesReportController.downloadSalesReport);
admin_route.get('/downloadsalesexcel',salesReportController.downloadSalesExcel);







module.exports = admin_route