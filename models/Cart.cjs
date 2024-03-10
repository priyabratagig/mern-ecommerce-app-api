const mongoose = require("mongoose")

const ProductInCartSchema = new mongoose.Schema({
    _id: false,
    productId: { type: String },
    quantity: { type: Number, default: 1 },
    size: { type: String },
    color: { type: String },
    price: { type: Number },
})

const CartSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    products: { type: [ProductInCartSchema], required: true },
    amount: { type: Number, required: true },
}, {
    timestamps: true
})

module.exports = mongoose.model("Cart", CartSchema)