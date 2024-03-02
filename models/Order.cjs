const mongoose = require("mongoose");

const ProductInOrderSchema = new mongoose.Schema(
    {
        productId: { type: String },
        quantity: { type: Number, default: 1 },
        size: { type: String },
        color: { type: String },
        price: { type: Number },
    }
)

const OrderSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },
        products: { type: [ProductInOrderSchema], required: true },
        amount: { type: Number, required: true },
        address: { type: Object, required: true },
        status: { type: String, default: "pending" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);