const mongoose = require("mongoose")
const LogicError = require("../utils/LogicError.cjs")
const uniqueValidator = require("mongoose-unique-validator")
const CartUtils = require("../utils/Cart.util.cjs")

const ProductInCartSchema = new mongoose.Schema({
    _id: false,
    productid: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Product" },
    variantname: { type: String, required: true },
    size: { type: String, required: true, enum: ["XS", "S", "M", "L", "XL", "XXL"] },
    quantity: { type: Number, default: 1 },
    price: { type: Number, required: true },
})

const CartSchema = new mongoose.Schema({
    userid: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, ref: "User" },
    products: { type: [ProductInCartSchema] }
}, {
    timestamps: true
})

CartSchema.index({ 'userid': 1 }, { weights: { 'userid': 5 }, unique: true, name: 'userid' })

CartSchema.static("getCart", async function (userid, localCart) {
    const CartModle = mongoose.model("Cart")
    let cartInfo = {}

    if (userid && mongoose.Types.ObjectId.isValid(userid)) {
        const cart = await CartModle.findOne({ userid: { $eq: userid } }).then(async (cart) => {
            if (cart) return cart
            cart = await CartModle.create({ userid: userid })
            return cart
        })
        const { __v, createdAt, ...cartInfodb } = cart.toObject()

        cartInfo = cartInfodb
    }
    else cartInfo = localCart

    const ProductModel = mongoose.model("Product")

    for (let idx = 0; idx < cartInfo.products.length; idx++) {
        const product = cartInfo.products[idx]
        const { productid, variantname, size, quantity } = product

        const new_products = await ProductModel.aggregate([
            {
                $match: {
                    _id: mongoose.Types.ObjectId.createFromHexString(String(productid))
                }
            },
            {
                $unwind: "$variants"
            },
            {
                $match: {
                    "variants.name": variantname
                }
            },
            {
                $unwind: "$variants.stocks"
            },
            {
                $match: {
                    "variants.stocks.size": size
                }
            },
            {
                $addFields: {

                    "price": { $toDouble: "$variants.price" },
                    "quantity": { $toInt: quantity }
                }
            },
            {
                $project: {
                    _id: 0,
                    productid: "$_id",
                    title: 1,
                    variant: {
                        name: "$variants.name",
                        img: "$variants.img",
                        color: "$variants.color",
                        stock: {
                            size: "$variants.stocks.size",
                            available: "$variants.stocks.available"
                        },
                        price: { $multiply: ["$price", "$quantity"] },
                        quantity: "$quantity"
                    }
                }
            }
        ])

        if (new_products.length === 0) new_products[0] = { title: "Product not available", variant: { name: "", img: "", color: "", stock: { size: "", available: 0 }, price: 0 } }

        cartInfo.products[idx] = new_products[0]
    }

    return { ...cartInfo, userid: userid }
})

CartSchema.static('updateCart', async function (userid, products) {
    CartUtils.all_cart_attritibutes_provided({ userid, products })

    const ProductModel = mongoose.model("Product")

    for (let idx = 0; idx < products.length; idx++) {
        const product = products[idx]
        const { productid, variantname, size, quantity } = product

        const new_products = await ProductModel.aggregate([
            {
                $match: {
                    _id: mongoose.Types.ObjectId.createFromHexString(String(productid))
                }
            },
            {
                $unwind: "$variants"
            },
            {
                $match: {
                    "variants.name": variantname
                }
            },
            {
                $unwind: "$variants.stocks"
            },
            {
                $match: {
                    "variants.stocks.size": size
                }
            },
            {
                $addFields: {

                    "price": { $toDouble: "$variants.price" },
                    "quantity": { $toInt: quantity }
                }
            },
            {
                $project: {
                    _id: 0,
                    productid: "$_id",
                    variantname: "$variants.name",
                    size: "$variants.stocks.size",
                    quantity: "$quanity",
                    price: { $multiply: ["$price", "$quantity"] }
                }
            }
        ])

        if (!new_products.length) throw new LogicError({ status: 404, message: "Product not found" })

        products[idx] = { ...new_products[0], quantity }
    }

    const CartModel = mongoose.model("Cart")
    const cart = new CartModel({ userid: userid, products: products })

    const { _id, __v, userid: _, createdAt, updatedAt, ...cartInfo } = cart._doc

    if (!userid || !mongoose.Types.ObjectId.isValid(userid)) return cartInfo

    cartInfo.updatedAt = new Date().toISOString()

    const newCart = await CartModel.findOneAndUpdate({ userid: { $eq: userid } }, { $set: cartInfo }, { new: true }).then(async (cart) => {
        if (cart) return cart
        cart = await CartModel.create({ userid: userid, products: products })
        return cart
    })

    return newCart.toObject()
})

CartSchema.static('addCart', async function (userid, product, localCart) {
    CartUtils.all_cart_attritibutes_provided({ userid, products: [product] })

    const ProductModel = mongoose.model("Product")
    const CartModel = mongoose.model("Cart")

    const { productid, variantname, size, quantity } = product
    const new_products = await ProductModel.aggregate([
        {
            $match: {
                _id: mongoose.Types.ObjectId.createFromHexString(String(productid))
            }
        },
        {
            $unwind: "$variants"
        },
        {
            $match: {
                "variants.name": variantname
            }
        },
        {
            $unwind: "$variants.stocks"
        },
        {
            $match: {
                "variants.stocks.size": size
            }
        },
        {
            $addFields: {

                "price": { $toDouble: "$variants.price" },
                "quantity": { $toInt: quantity }
            }
        },
        {
            $project: {
                _id: 0,
                productid: "$_id",
                variantname: "$variants.name",
                size: "$variants.stocks.size",
                quantity: "$quanity",
                price: { $multiply: ["$price", "$quantity"] }
            }
        }
    ])
    if (!new_products.length) throw new LogicError({ status: 404, message: "Product not found" })

    const previous_products = !userid || !mongoose.Types.ObjectId.isValid(userid) ?
        localCart :
        await CartModel.findOne({ userid: { $eq: userid } }).then(async (cart) => {
            if (cart) return cart
            return { _doc: { userid: userid, products: [] } }
        })

    const { _id, __v, userid: _, createdAt, ...cartInfo } = previous_products === localCart ? localCart : previous_products._doc

    const product_exists_in_cart = cartInfo.products.find(
        product => (
            String(product.productid) === String(new_products[0].productid) &&
            String(product.variantname) === String(new_products[0].variantname) &&
            String(product.size) === String(new_products[0].size)
        )
    )

    if (product_exists_in_cart) {
        product_exists_in_cart.quantity = product_exists_in_cart.quantity + quantity
        product_exists_in_cart.price = (new_products[0].price / quantity) * product_exists_in_cart.quantity
    }
    else cartInfo.products = [...cartInfo.products, { ...new_products[0], productid: mongoose.Types.ObjectId.createFromHexString(productid) }]

    const newCart = new CartModel({ userid, ...cartInfo })
    const { _id: _id_, __v: __, userid: ___, createdAt: ____, updatedAt, ...newCartInfo } = newCart.toObject()

    if (!userid || !mongoose.Types.ObjectId.isValid(userid)) return newCartInfo

    newCartInfo.updatedAt = new Date().toISOString()

    const newcart = await CartModel.findOneAndUpdate({ userid: { $eq: userid } }, { $set: newCartInfo }, { new: true }).then(async (cart) => {
        if (cart) return cart
        cart = await CartModel.create({ userid: userid, products: newCartInfo.products })
        return cart
    })

    return newcart.toObject()
})

CartSchema.post(['save', 'findOneAndUpdate'], function (error, doc, next) {
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

CartSchema.plugin(uniqueValidator, { message: '{PATH} already exists.' })

module.exports = mongoose.model("Cart", CartSchema)