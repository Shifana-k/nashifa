const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    product: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Products'
        },
        quantity: {
            type: Number,
            default: 1
        },
        offerDiscount: {
            type: Number,
            default: 0
        },
        totalPrice: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            required: true
        }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Cart_Items', cartSchema);
