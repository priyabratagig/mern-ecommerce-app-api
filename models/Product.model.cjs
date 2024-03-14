const mongoose = require('mongoose')
const imageSize = require('image-size')
const uniqueValidator = require('mongoose-unique-validator')
const { LogicError } = require("../utils")

const categories = ["women", "men", "kids", "unisex"]

const ProductVariantsSchema = new mongoose.Schema({
    _id: false,
    name: {
        type: String,
        required: [true, "name is required"],
        minlength: [3, "name must be at least 3 characters long"],
        maxlength: [20, "name must be at most 20 characters long"]
    },
    img: {
        type: Buffer, required: [true, "img is required"]
    },
    color: {
        type: String, required: [true, "color is required"], match: [/^#[0-9A-Fa-f]{6}$/, "color is invalid"]
    },
    size: {
        type: String, enum: ["XS", "S", "M", "L", "XL", "XXL"], required: [true, "size is required"]
    },
    available: {
        type: Boolean, default: true, required: [true, "available is required"]
    },
    price: {
        type: Number, required: [true, "price is required"], min: [0, "price must be at least 0"]
    }
})

const ProductSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "title is required"],
        unique: [true, "title already exists"],
        minlength: [20, "title must be at least 20 characters long"],
        maxlength: [100, "title must be at most 100 characters long"],
        index: { unique: true, name: 'title' }
    },
    desc: {
        type: String,
        required: [true, "description is required"],
        minlength: [20, "description must be at least 20 characters long"],
        maxlength: [1000, "description must be at most 1000 characters long"]
    },
    categories: {
        type: [String], required: [true, "categories are required"]
    },
    variants: {
        type: [ProductVariantsSchema], required: [true, "variants are required"]
    }
}, {
    timestamps: true
})

ProductVariantsSchema.path('img').validate(function (value) {
    if (!Buffer.isBuffer(value)) return false
    const dimensions = imageSize(value)
    if (!dimensions && dimensions.width && dimensions.height) return false

    return true
}, "img is invalid")

ProductSchema.path('categories').validate(function (values) {
    this.categories = [...new Set(values)]
    return this.categories.every(category => categories.includes(category))
}, "Invalid category provided")

ProductSchema.path('variants').validate(function (values) {
    if (values.length < 1) return false

    const name = {};
    const colors = {};
    const sizes = {};

    for (const variant of values) {
        if (name[variant.name]) return false
        else name[variant.name] = true

        if (colors[variant.color]) return false
        else colors[variant.color] = true

        if (sizes[variant.size]) return false
        else sizes[variant.size] = true
    }
}, "At least one variant is required, each variant must have a unique name, color, and size")

ProductSchema.pre('save', function (next) {
    if (this.variants.length < 1) throw new LogicError({ status: 400, message: "At least one variant is required" })

    return next()
})

ProductSchema.static('updateProduct', async function (products, attrs) {
    const ProductModel = mongoose.model('Product')
    const { _id, __v, createdAt, updatedAt, ...productMeta } = products

    ['title', 'desc', 'categories', 'variants'].forEach(attr => {
        if (attrs.hasOwnProperty(attr)) productMeta[attr] = attrs[attr]
    })

    const updatedProducts = new ProductModel(productMeta)

    const { _id: _, __v: __, createdAt: ___, updatedAt: ____, ...updatedProductsInfo } = updatedProducts._doc

    return await ProductModel.findOneAndUpdate({ _id: products._id }, { $set: updatedProductsInfo }, { validateBeforeSave: true, new: true })
})

ProductSchema.post('update', async function (error, doc, next) {
    const ProductModel = mongoose.model('Product')
    if (doc.variants.length < 1) {
        await ProductModel.deleteOne({ _id: doc._id })
    }

    return next(error)
})

ProductSchema.post(['save', 'findOneAndUpdate'], function (error, doc, next) {
    if (error.name === 'ValidationError') {
        error.message = Object.values(error.errors).map(path => path.message).join('\n')
        return next(error)
    }
    if (error.codeName === 'DuplicateKey') {
        error.message = `${Object.keys(error.keyPattern).join(', ')} already exists`
        return next(error)
    }
    return next()
})

ProductSchema.plugin(uniqueValidator, { message: '{PATH} already exists.' })

module.exports = mongoose.model("Product", ProductSchema)