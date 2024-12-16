const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  is_listed: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    required: true
  },
  mainImage: {
    type: String,
    required: true
  },
  screenshots: {
    type: [String],
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  discount: {
    type: Number
  }
}, { timestamps: true });

module.exports = mongoose.model("Products", productSchema);
