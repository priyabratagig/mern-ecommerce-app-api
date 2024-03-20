const mongoose = require("mongoose")
const { ObjectId } = require("mongodb")
const OrderUtils = require("../utils/Oder.util.cjs")
const LogicError = require("../utils/LogicError.cjs")

const ProductInOrderSchema = new mongoose.Schema({
    _id: false,
    productid: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Product", immutable: true },
    variantname: { type: String, required: true, immutable: true },
    size: { type: String, required: true, enum: ["XS", "S", "M", "L", "XL", "XXL"], immutable: true },
    quantity: { type: Number, default: 1, immutable: true },
    price: { type: Number, required: true, immutable: true },
})

const OrderSchema = new mongoose.Schema({
    userid: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User", immutable: true },
    products: { type: [ProductInOrderSchema], required: true, immutable: true },
    price: { type: Number, required: true, immutable: true },
    address: {
        address: { type: String, required: true, immutable: true, minlength: [10, "address must be at least 3 characters long"], maxlength: [100, "address must be at most 100 characters long"] },
        city: { type: String, required: true, immutable: true, minlength: [3, "city must be at least 3 characters long"], maxlength: [20, "city must be at most 50 characters long"], match: [/^[a-zA-Z]+$/, "city is invalid"] },
        state: { type: String, required: true, immutable: true, minlength: [2, "state must be at least 3 characters long"], maxlength: [20, "state must be at most 50 characters long"], match: [/^[a-zA-Z]+$/, "state is invalid"] },
        country: { type: String, required: true, immutable: true, minlength: [2, "country must be at least 3 characters long"], maxlength: [20, "country must be at most 50 characters long"], match: [/^[a-zA-Z]+$/, "country is invalid"] },
        pincode: { type: Number, required: true, immutable: true, match: [/^[1-9][0-9]{5}$/, "pincode is invalid"] },
    },
    status: { type: String, default: "pending", enum: ["pending", "processing", "shipped", "delivered", "cancelled"] },
}, {
    timestamps: true
})

OrderSchema.index({ 'userid': 1 }, { weights: { 'userid': 5 }, unique: false, name: 'userid' })

OrderSchema.static('createOrder', async function ({ userid, address }) {
    OrderUtils.all_create_order_attritibutes_provided({ userid, address })

    const OrderModel = mongoose.model("Order")
    const CartModel = mongoose.model("Cart")
    const ProductModel = mongoose.model("Product")

    let cart = await CartModel.findOne({ userid: { $eq: ObjectId.createFromHexString(String(userid)) } })

    if (!cart) throw new LogicError({ status: 400, message: "no items in cart" })
    if (cart.products.length === 0) throw new LogicError({ status: 400, message: "no items in cart" })
    cart = cart.toObject()

    products = cart.products.map(products => {
        return {
            productid: ObjectId.createFromHexString(String(products.productid)),
            variantname: products.variantname,
            size: products.size,
            quantity: products.quantity,
            price: products.price
        }
    })
    const price = products.reduce((acc, product) => acc + product.price, 0)

    const order = await OrderModel.create({ userid: ObjectId.createFromHexString(String(userid)), products: products, price, address }).then(async order => {
        if (!order) throw new LogicError({ status: 500, message: "could not create order" })

        await CartModel.deleteOne({ _id: ObjectId.createFromHexString(String(cart._id)) })

        return order
    })

    const order_details = order.toObject()

    for (let i = 0; i < order_details.products.length; i++) {
        const product = order_details.products[i]
        const { productid, variantname, size, price, quantity } = product

        const product_details = await ProductModel.aggregate([
            {
                $match: {
                    _id: ObjectId.createFromHexString(String(productid)),
                },
            },
            {
                $project: {
                    _id: 0,
                    productid: "$_id",
                    title: 1,
                    variants: {
                        $filter: {
                            input: "$variants",
                            as: "variant",
                            cond: {
                                $eq: ["$$variant.name", variantname],
                            },
                        },
                    },
                },
            },
            {
                $addFields: {
                    price: { $toDouble: price },
                    quantity: { $toInt: quantity },
                }
            },
            {
                $unwind: "$variants",
            },
            {
                $project: {
                    title: 1,
                    productid: 1,
                    variant: {
                        name: "$variants.name",
                        img: "$variants.img",
                        color: "$variants.color",
                        price: "$price",
                        quantity: "$quantity"
                    },
                    stocks: {
                        $filter: {
                            input: "$variants.stocks",
                            as: "stock",
                            cond: {
                                $eq: ["$$stock.size", size],
                            },
                        },
                    },
                },
            },
            {
                $unwind: "$stocks",
            },
            {
                $project: {
                    title: 1,
                    productid: 1,
                    variant: {
                        name: "$variant.name",
                        img: "$variant.img",
                        color: "$variant.color",
                        price: "$variant.price",
                        quantity: "$variant.quantity",
                        stock: {
                            size: "$stocks.size",
                        }
                    }
                },
            },
        ])

        if (product_details.length === 0) product_details[0] = { title: "Product deleted", variant: { name: variantname, img: "", color, stock: { size }, price: price, quantity: quantity } }
        order_details.products[i] = product_details[0]
    }

    return order_details
})

OrderSchema.static('updateOrderStatus', async function (orderid, status) {
    OrderUtils.all_update_order_attritibutes_provided({ orderid, status })

    const OrderModel = mongoose.model("Order")
    const ProductModel = mongoose.model("Product")

    const order = await OrderModel.findOneAndUpdate({ _id: { $eq: ObjectId.createFromHexString(String(orderid)) } }, { $set: { status: status, updatedAt: new Date().toDateString() } }, { new: true })
    if (!order) throw new LogicError({ status: 404, message: "order not found" })

    const order_details = order.toObject()

    for (let i = 0; i < order_details.products.length; i++) {
        const product = order_details.products[i]
        const { productid, variantname, size, price, quantity } = product

        const product_details = await ProductModel.aggregate([
            {
                $match: {
                    _id: ObjectId.createFromHexString(String(productid)),
                },
            },
            {
                $project: {
                    _id: 0,
                    productid: "$_id",
                    title: 1,
                    variants: {
                        $filter: {
                            input: "$variants",
                            as: "variant",
                            cond: {
                                $eq: ["$$variant.name", variantname],
                            },
                        },
                    },
                },
            },
            {
                $addFields: {
                    price: { $toDouble: price },
                    quantity: { $toInt: quantity },
                }
            },
            {
                $unwind: "$variants",
            },
            {
                $project: {
                    title: 1,
                    productid: 1,
                    variant: {
                        name: "$variants.name",
                        img: "$variants.img",
                        color: "$variants.color",
                        price: "$price",
                        quantity: "$quantity"
                    },
                    stocks: {
                        $filter: {
                            input: "$variants.stocks",
                            as: "stock",
                            cond: {
                                $eq: ["$$stock.size", size],
                            },
                        },
                    },
                },
            },
            {
                $unwind: "$stocks",
            },
            {
                $project: {
                    title: 1,
                    productid: 1,
                    variant: {
                        name: "$variant.name",
                        img: "$variant.img",
                        color: "$variant.color",
                        price: "$variant.price",
                        quantity: "$variant.quantity",
                        stock: {
                            size: "$stocks.size",
                        }
                    }
                },
            },
        ])

        if (product_details.length === 0) product_details[0] = { title: "Product deleted", variant: { name: variantname, img: "", color, stock: { size }, price: price, quantity: quantity } }
        order_details.products[i] = product_details[0]
    }

    return order_details
})

OrderSchema.static('getOrderDetails', async function (orderid, userid) {
    OrderUtils.all_get_order_attritibutes_provided({ userid, orderid })

    const OrderModel = mongoose.model("Order")
    const ProductModel = mongoose.model("Product")

    const order = await OrderModel.findOne({ _id: { $eq: ObjectId.createFromHexString(String(orderid)) }, userid: { $eq: ObjectId.createFromHexString(String(userid)) } })
    if (!order) throw new LogicError({ status: 404, message: "order not found" })

    const order_details = order.toObject()

    for (let i = 0; i < order_details.products.length; i++) {
        const product = order_details.products[i]
        const { productid, variantname, size, price, quantity } = product

        const product_details = await ProductModel.aggregate([
            {
                $match: {
                    _id: ObjectId.createFromHexString(String(productid)),
                },
            },
            {
                $project: {
                    _id: 0,
                    productid: "$_id",
                    title: 1,
                    variants: {
                        $filter: {
                            input: "$variants",
                            as: "variant",
                            cond: {
                                $eq: ["$$variant.name", variantname],
                            },
                        },
                    },
                },
            },
            {
                $addFields: {
                    price: { $toDouble: price },
                    quantity: { $toInt: quantity },
                }
            },
            {
                $unwind: "$variants",
            },
            {
                $project: {
                    title: 1,
                    productid: 1,
                    variant: {
                        name: "$variants.name",
                        img: "$variants.img",
                        color: "$variants.color",
                        price: "$price",
                        quantity: "$quantity"
                    },
                    stocks: {
                        $filter: {
                            input: "$variants.stocks",
                            as: "stock",
                            cond: {
                                $eq: ["$$stock.size", size],
                            },
                        },
                    },
                },
            },
            {
                $unwind: "$stocks",
            },
            {
                $project: {
                    title: 1,
                    productid: 1,
                    variant: {
                        name: "$variant.name",
                        img: "$variant.img",
                        color: "$variant.color",
                        price: "$variant.price",
                        quantity: "$variant.quantity",
                        stock: {
                            size: "$stocks.size",
                        }
                    }
                },
            },
        ])

        if (product_details.length === 0) product_details[0] = { title: "Product deleted", variant: { name: variantname, img: "", color, stock: { size }, price: price, quantity: quantity } }
        order_details.products[i] = product_details[0]
    }

    return order_details
})

OrderSchema.static('getAllOrderDetails', async function (skip, limit) {
    const OrderModel = mongoose.model("Order")
    const ProductModel = mongoose.model("Product")

    let orders = await OrderModel.aggregate([
        {
            $match: {
                price: { $gt: 0 },
            },
        },
        {
            $group: {
                _id: null,
                total: {
                    $sum: 1
                },
                orders: {
                    $push: "$$ROOT"
                }
            }
        },
        {
            $project: {
                total: 1,
                orders: {
                    $slice: ["$orders", skip, limit]
                }
            }
        },
        {
            $project: {
                total: 1,
                orders: 1,
                count: {
                    $size: "$orders"
                }
            }
        }
    ])

    if (orders.length === 0) throw new LogicError({ status: 404, message: "no order found" })

    const total = orders[0].total
    const count = orders[0].count
    orders = orders[0].orders

    for (let i = 0; i < orders.length; i++) {
        const order_details = orders[i]

        for (let j = 0; j < order_details.products.length; j++) {
            const product = order_details.products[j]
            const { productid, variantname, size, price, quantity } = product

            const product_details = await ProductModel.aggregate([
                {
                    $match: {
                        _id: ObjectId.createFromHexString(String(productid)),
                    },
                },
                {
                    $project: {
                        _id: 0,
                        productid: "$_id",
                        title: 1,
                        variants: {
                            $filter: {
                                input: "$variants",
                                as: "variant",
                                cond: {
                                    $eq: ["$$variant.name", variantname],
                                },
                            },
                        },
                    },
                },
                {
                    $addFields: {
                        price: { $toDouble: price },
                        quantity: { $toInt: quantity },
                    }
                },
                {
                    $unwind: "$variants",
                },
                {
                    $project: {
                        title: 1,
                        productid: 1,
                        variant: {
                            name: "$variants.name",
                            img: "$variants.img",
                            color: "$variants.color",
                            price: "$price",
                        },
                        stocks: {
                            $filter: {
                                input: "$variants.stocks",
                                as: "stock",
                                cond: {
                                    $eq: ["$$stock.size", size],
                                },
                            },
                        },
                    },
                },
                {
                    $unwind: "$stocks",
                },
                {
                    $project: {
                        title: 1,
                        productid: 1,
                        variant: {
                            name: "$variant.name",
                            img: "$variant.img",
                            color: "$variant.color",
                            price: "$variant.price",
                            stock: {
                                size: "$stocks.size",
                            }
                        }
                    },
                },
            ])

            if (product_details.length === 0) product_details[0] = { title: "Product deleted", variant: { name: variantname, img: "", color, stock: { size }, price: price, quantity: quantity } }
            order_details.products[j] = product_details[0]
        }

        orders[i] = order_details
    }

    return { orders: orders, total: total, count: count }
})

OrderSchema.static('getAllUserOrderDetails', async function (userid, skip, limit) {
    if (!userid) throw new LogicError({ status: 400, message: "userid not provided" })
    if (!ObjectId.isValid(userid)) throw new LogicError({ status: 400, message: "userid is not valid" })

    const OrderModel = mongoose.model("Order")
    const ProductModel = mongoose.model("Product")

    let orders = await OrderModel.aggregate([
        {
            $match: {
                userid: { $eq: ObjectId.createFromHexString(String(userid)) },
            },
        },
        {
            $group: {
                _id: null,
                total: {
                    $sum: 1
                },
                orders: {
                    $push: "$$ROOT"
                }
            }
        },
        {
            $project: {
                total: 1,
                orders: {
                    $slice: ["$orders", skip, limit]
                }
            }
        },
        {
            $project: {
                total: 1,
                orders: 1,
                count: {
                    $size: "$orders"
                }
            }
        }
    ])

    if (orders.length === 0) throw new LogicError({ status: 404, message: "no order found" })

    const total = orders[0].total
    const count = orders[0].count
    orders = orders[0].orders

    for (let i = 0; i < orders.length; i++) {
        const order = orders[i]
        const products = []

        for (let j = 0; j < order.products.length; j++) {
            const product = order.products[j]
            const { productid, variantname, size, price, quantity } = product

            const product_details = await ProductModel.aggregate([
                {
                    $match: {
                        _id: ObjectId.createFromHexString(String(productid)),
                    },
                },
                {
                    $project: {
                        _id: 0,
                        productid: "$_id",
                        title: 1,
                        variants: {
                            $filter: {
                                input: "$variants",
                                as: "variant",
                                cond: {
                                    $eq: ["$$variant.name", variantname],
                                },
                            },
                        },
                    },
                },
                {
                    $addFields: {
                        price: { $toDouble: price },
                        quantity: { $toInt: quantity },
                    }
                },
                {
                    $unwind: "$variants",
                },
                {
                    $project: {
                        title: 1,
                        productid: 1,
                        variant: {
                            name: "$variants.name",
                            img: "$variants.img",
                            color: "$variants.color",
                            price: "$price",
                        },
                        stocks: {
                            $filter: {
                                input: "$variants.stocks",
                                as: "stock",
                                cond: {
                                    $eq: ["$$stock.size", size],
                                },
                            },
                        },
                    },
                },
                {
                    $unwind: "$stocks",
                },
                {
                    $project: {
                        title: 1,
                        productid: 1,
                        variant: {
                            name: "$variant.name",
                            img: "$variant.img",
                            color: "$variant.color",
                            price: "$variant.price",
                            stock: {
                                size: "$stocks.size",
                            }
                        }
                    },
                },
            ])

            if (product_details.length === 0) product_details[0] = { title: "Product deleted", variant: { name: variantname, img: "", color, stock: { size }, price: price, quantity: quantity } }

            products.push(product_details[0])
        }

        orders[i] = {
            _id: order._id,
            orderid: order.orderid,
            address: order.address,
            products: products,
            price: order.price,
            status: order.status,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt
        }
    }

    return { orders: orders, total, count, userid }
})

OrderSchema.post(['save', 'findOneAndUpdate'], function (error, doc, next) {
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

module.exports = mongoose.model("Order", OrderSchema)