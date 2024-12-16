const express = require('express')
const admin_route = express()


const adminController = require('../controllers/adminController')
const categoryController = require('../controllers/categoryController')
const productController = require('../controllers/productsController')
const orderController = require('../controllers/orderController')

const productsUpload = require('../middlewares/productConfig');


admin_route.set('views','./views/admin')

/*---------------------------------Home, Login, Dashboard--------------------------------------------*/
admin_route.get('/',adminController.renderLogin);

admin_route.post('/login',adminController.renderDashboard);
admin_route.get('/dashboard',adminController.loadDashboard);

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











module.exports = admin_route