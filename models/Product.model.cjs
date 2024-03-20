const mongoose = require('mongoose')
const imageSize = require('image-size')
const uniqueValidator = require('mongoose-unique-validator')
const LogicError = require('../utils/LogicError.cjs')

const AVAILABLE_CATEGORIES = ["women", "men", "kids", "unisex", "pant"]

const ProductStockSchema = new mongoose.Schema({
    _id: false,
    size: {
        type: String, enum: ["XS", "S", "M", "L", "XL", "XXL"], required: [true, "size is required"]
    },
    available: {
        type: Boolean, default: true, required: [true, "available is required"]
    }
})

const ProductVariantsSchema = new mongoose.Schema({
    _id: false,
    name: {
        type: String, required: [true, "name is required"], minlength: [3, "name must be at least 3 characters long"], maxlength: [20, "name must be at most 20 characters long"]
    },
    img: {
        type: String, required: [true, "img is required"]
    },
    color: {
        type: String, required: [true, "color is required"], match: [/^#[0-9A-Fa-f]{6}$/, "color is invalid"]
    },
    stocks: {
        type: [ProductStockSchema], required: [true, "Sizes is required"]
    },
    price: {
        type: Number, required: [true, "price is required"], min: [0, "price must be at least 0"]
    }
})

const ProductSchema = new mongoose.Schema({
    title: {
        type: String, required: [true, "title is required"], unique: [true, "title already exists"], index: { unique: true, name: 'title' },
        minlength: [20, "title must be at least 20 characters long"],
        maxlength: [100, "title must be at most 100 characters long"]
    },
    desc: {
        type: String, required: [true, "desc is required"],
        minlength: [20, "desc must be at least 20 characters long"],
        maxlength: [1000, "desc must be at most 1000 characters long"]
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

ProductSchema.index({ title: 'text', desc: 'text' }, { weights: { title: 5, desc: 1 }, name: 'title_desc' })

ProductVariantsSchema.path('img').validate(function (value) {
    const base64Regex = /^data:image\/.+;base64,/
    if (!base64Regex.test(value)) return false
}, "img need to be base64 string")

ProductVariantsSchema.path('img').validate(function (value) {
    const base64Regex = /^data:image\/(png|jpg|jpeg|gif|webp|avif);base64,/
    if (!base64Regex.test(value)) return false
}, "img format is invalid, must be png, jpg, jpeg, gif, webp or avif")

ProductVariantsSchema.path('img').validate(function (value) {
    try {
        const base64Regex = /^data:image\/(png|jpg|jpeg|gif|webp|avif);base64,/
        const base64Data = value.replace(base64Regex, '')
        const buffer = Buffer.from(base64Data, 'base64')

        const dimensions = imageSize(buffer)
        return dimensions && dimensions.width > 0 && dimensions.height > 0
    }
    catch (e) {
        return false
    }
}, 'not an image')

ProductVariantsSchema.path('stocks').validate(function (values) {
    if (!values || values.length < 1) return false
}, "At least one size is required")

ProductVariantsSchema.path('stocks').validate(function (values) {
    const stocks = {};

    for (const size of values) {
        if (stocks[size.size]) return false
        else stocks[size.size] = true
    }
}, "Variants stocks must be unique")

ProductSchema.path('categories').validate(function (values) {
    if (values.length < 1) return false
}, "At least one category is required")

ProductSchema.path('categories').validate(function (values) {
    this.categories = [...new Set(values)]
    return this.categories.every(category => AVAILABLE_CATEGORIES.includes(category))
}, "Invalid category provided")

ProductSchema.path('variants').validate(function (values) {
    if (!values || values.length < 1) return false
}, "At least one variant is required")

ProductSchema.path('variants').validate(function (values) {
    const name = {};
    const colors = {};

    for (const variant of values) {
        if (name[variant.name]) return false
        else name[variant.name] = true

        if (colors[variant.color]) return false
        else colors[variant.color] = true
    }
}, "Variants must have unique name, color")

ProductSchema.static('updateProducts', async function (products, attrs) {
    const ProductModel = mongoose.model('Product')
    const { _id, __v, createdAt, updatedAt, ...productsInfo } = products;

    ['title', 'desc', 'categories', 'variants'].forEach(attr => {
        if (attrs.hasOwnProperty(attr)) productsInfo[attr] = attrs[attr]
    })

    products.updatedAt = new Date().toISOString()

    return await ProductModel.findOneAndUpdate({ _id }, { $set: productsInfo }, { new: true, runValidators: true })
})

ProductSchema.static('findAllProducts', async function (skip = 0, limit = 10) {
    const ProductModel = mongoose.model('Product')

    const productsData = await ProductModel.aggregate([
        { $match: { title: { $exists: true } } },
        { $unwind: "$variants" },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                products: { $push: "$$ROOT" } // Collect all documents for further processing
            }
        },
        {
            $addFields: {
                products: {
                    $slice: ["$products", skip, limit]
                }
            }
        },
        {
            $project: {
                _id: 0,
                total: 1,
                count: { $size: "$products" },
                products: 1
            }
        },
        {
            $addFields: {
                products: {
                    $map: {
                        input: "$products",
                        as: "product",
                        in: {
                            _id: "$$product._id",
                            title: "$$product.title",
                            variant: {
                                name: "$$product.variants.name",
                                color: "$$product.variants.color",
                                price: "$$product.variants.price",
                                img: "$$product.variants.img"
                            }
                        }
                    }
                }
            }
        }
    ])

    return productsData[0]
})

ProductSchema.static('findByCategoryNames', async function (categories, skip = 0, limit = 10) {
    if (categories.length < 1) return null
    categories.forEach(category => {
        if (!AVAILABLE_CATEGORIES.includes(category)) throw new LogicError({ status: 400, message: `'${category}' is not a valid category` })
    })

    const ProductModel = mongoose.model('Product')
    const productsData = await ProductModel.aggregate([
        { $match: { categories: { $in: categories } } },
        { $unwind: "$variants" },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                products: { $push: "$$ROOT" } // Collect all documents for further processing
            }
        },
        {
            $addFields: {
                products: {
                    $slice: ["$products", skip, limit]
                }
            }
        },
        {
            $project: {
                _id: 0,
                total: 1,
                count: { $size: "$products" },
                products: 1
            }
        },
        {
            $addFields: {
                products: {
                    $map: {
                        input: "$products",
                        as: "product",
                        in: {
                            _id: "$$product._id",
                            title: "$$product.title",
                            variant: {
                                name: "$$product.variants.name",
                                color: "$$product.variants.color",
                                price: "$$product.variants.price",
                                img: "$$product.variants.img"
                            }
                        }
                    }
                }
            }
        }
    ])

    return productsData[0]
})

ProductSchema.static('searchProducts', async function (searchString, skip = 0, limit = 10) {
    if (!searchString || searchString.length < 1) return null

    const ProductModel = mongoose.model('Product')

    const regex = new RegExp(searchString, 'i')

    const productsData = await ProductModel.aggregate([
        {
            $match: {
                $or: [
                    { title: { $regex: regex } },
                    { desc: { $regex: regex } }
                ]
            }
        },
        { $unwind: "$variants" },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                products: { $push: "$$ROOT" } // Collect all documents for further processing
            }
        },
        {
            $addFields: {
                products: {
                    $slice: ["$products", skip, limit]
                }
            }
        },
        {
            $project: {
                _id: 0,
                total: 1,
                count: { $size: "$products" },
                products: 1
            }
        },
        {
            $addFields: {
                products: {
                    $map: {
                        input: "$products",
                        as: "product",
                        in: {
                            _id: "$$product._id",
                            title: "$$product.title",
                            variant: {
                                name: "$$product.variants.name",
                                color: "$$product.variants.color",
                                price: "$$product.variants.price",
                                img: "$$product.variants.img"
                            }
                        }
                    }
                }
            }
        }
    ])

    return productsData[0]
})

ProductSchema.post('update', async function (error, doc, next) {
    const ProductModel = mongoose.model('Product')
    if (doc.variants.length < 1) {
        await ProductModel.deleteOne({ _id: doc._id })
    }

    return next(error)
})

ProductSchema.post(['save', 'findOneAndUpdate'], function (error, doc, next) {
    if (error.name == 'ValidationError') {
        Object.keys(error.errors).forEach(key => {
            if (['Number', 'Boolean', 'enum'].includes(error.errors[key].kind)) error.errors[key].message = `'${error.errors[key].value}' is not vaid as ${error.errors[key].path}`
        })

        error.message = Object.values(error.errors).map(path => path.message).join('\n')
        return next(error)
    }
    if (error.code == '11000') {
        error.message = `${Object.keys(error.keyPattern).join(', ')} already exists`
        return next(error)
    }
    if (error.name == 'CastError') {
        const constructMessage = (error, path) => {
            if (error.reason?.name === 'AssertionError') return `'${error.value}' is not valid as ${error.path}`
            if (error.reason) return constructMessage(error.reason, error.path)
            return `'${error.value}' is not valid as ${path}`
        }
        error.message = constructMessage(error)
        return next(error)
    }
    return next(error)
})

ProductSchema.plugin(uniqueValidator, { message: '{PATH} already exists.' })

module.exports = mongoose.model("Product", ProductSchema)