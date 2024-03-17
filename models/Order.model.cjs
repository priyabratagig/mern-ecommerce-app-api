const mongoose = require("mongoose")
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
    userid: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, ref: "User", immutable: true },
    products: { type: [ProductInOrderSchema], required: true, immutable: true },
    price: { type: Number, required: true, immutable: true },
    address: {
        address: { type: String, required: true, immutable: true, minlength: [10, "address must be at least 3 characters long"], maxlength: [100, "address must be at most 50 characters long"] },
        city: { type: String, required: true, immutable: true, minlength: [3, "city must be at least 3 characters long"], maxlength: [20, "city must be at most 50 characters long"], match: [/^[a-zA-Z]+$/, "city is invalid"] },
        state: { type: String, required: true, immutable: true, minlength: [2, "state must be at least 3 characters long"], maxlength: [20, "state must be at most 50 characters long"], match: [/^[a-zA-Z]+$/, "state is invalid"] },
        country: { type: String, required: true, immutable: true, minlength: [2, "country must be at least 3 characters long"], maxlength: [20, "country must be at most 50 characters long"], match: [/^[a-zA-Z]+$/, "country is invalid"] },
        pincode: { type: Number, required: true, immutable: true, match: [/[0-9]{6}/, "pincode is invalid"] },
    },
    status: { type: String, default: "pending", enum: ["pending", "processing", "shipped", "delivered", "cancelled"] },
}, {
    timestamps: true
})

OrderSchema.index({ 'userid': 1 }, { weights: { 'userid': 5 }, unique: true, name: 'userid' })

OrderSchema.static('createOrder', async function ({ userid, products, address, cartid }) {
    OrderUtils.all_order_attritibutes_provided({ userid, products, address })

    const OrderModel = mongoose.model("Order")
    const CartModel = mongoose.model("Cart")

    const uniqueProducts = {}
    products.map(products => {
        const unqiueProduct = `${products.productid}-${products.variantname}-${products.size}`

        if (uniqueProducts[unqiueProduct]) throw new LogicError({ status: 400, message: "product should be unique" })
        uniqueProducts[unqiueProduct] = true

        return {
            productid: ObjectId.createFromHexString(String(products.productid)),
            variantname: products.variantname,
            size: products.size,
            quantity: products.quantity,
            price: products.price
        }
    })

    const price = products.reduce((acc, product) => acc + product.price, 0)

    OrderUtils.userid_exists({ userid })

    const order = await OrderModel.create({ userid: ObjectId.createFromHexString(String(userid)), products, products, price, address })
    await CartModel.deleteOne({ _id: ObjectId.createFromHexString(String(cartid)) })

    return order.toJOSN()
})

OrderSchema.static('updateOrderStatus', async function (orderid, status) {
    if (!orderid) throw new LogicError({ status: 400, message: "orderid not provided" })
    if (!ObjectId.isValid(orderid)) throw new LogicError({ status: 400, message: "orderid is not valid" })
    if (!status) throw new LogicError({ status: 400, message: "status not provided" })
    if (["pending", "processing", "shipped", "delivered", "cancelled"].indexOf(status) === -1) throw new LogicError({ status: 400, message: "invalid status provided" })

    const OrderModel = mongoose.model("Order")
    const order = await OrderModel.findOneAndUpdate({ _id: ObjectId.createFromHexString(String(orderid)) }, { $set: { status: status, updatedAt: new Date().toDateString() } }, { new: true })
    if (!order) throw new LogicError({ status: 404, message: "order not found" })
    return order.toJOSN()
})

OrderSchema.static('getOrderDetails', async function (orderid) {
    if (!orderid) throw new LogicError({ status: 400, message: "orderid not provided" })
    if (!ObjectId.isValid(orderid)) throw new LogicError({ status: 400, message: "orderid is not valid" })

    const OrderModel = mongoose.model("Order")
    const ProductModel = mongoose.model("Product")
    const order = await OrderModel.findOne({ _id: ObjectId.createFromHexString(String(orderid)) })
    if (!order) throw new LogicError({ status: 404, message: "order not found" })

    const order_details = order.toJOSN()

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

        if (product_details.length === 0) product_details[0] = { title: "Product deleted", variant: { name: variantname, img: "", color, stcock: { size }, price: price, quantity: quantity } }
        order_details.products[i] = product_details[0]
    }

    return order_details
})

OrderSchema.static('getAllUserOrderDetails', async function (userid, skip, limit) {
    if (!userid) throw new LogicError({ status: 400, message: "userid not provided" })
    if (!ObjectId.isValid(userid)) throw new LogicError({ status: 400, message: "userid is not valid" })

    const OrderModel = mongoose.model("Order")
    const ProductModel = mongoose.model("Product")

    const orders = await OrderModel.aggregate([
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

            if (product_details.length === 0) product_details[0] = { title: "Product deleted", variant: { name: variantname, img: "", color, stcock: { size }, price: price, quantity: quantity } }
            order_details.products[j] = product_details[0]
        }

        orders[i] = order_details
    }

    return orders
})

OrderSchema.static('getAllOrderDetails', async function (skip, limit) {
    if (!userid) throw new LogicError({ status: 400, message: "userid not provided" })
    if (!ObjectId.isValid(userid)) throw new LogicError({ status: 400, message: "userid is not valid" })

    const OrderModel = mongoose.model("Order")
    const ProductModel = mongoose.model("Product")

    const orders = await OrderModel.aggregate([
        {
            $match: {
                price: { $ge: 0 },
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

            if (product_details.length === 0) product_details[0] = { title: "Product deleted", variant: { name: variantname, img: "", color, stcock: { size }, price: price, quantity: quantity } }
            order_details.products[j] = product_details[0]
        }

        orders[i] = order_details
    }

    return orders
})

module.exports = mongoose.model("Order", OrderSchema)