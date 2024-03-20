const router = require("express").Router()
const Order = require("../models/Order.model.cjs")
const { ObjectId } = require("mongodb")
const Product = require("../models/Product.model.cjs")
const { HTTPUtils, LogicError, UserUtils } = require("../utils")

//CREATE
router.post('/create', async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const args = {
            userid: req.loggedinuser?.userid,
            address: req.body.address
        }

        const newOrder = await Order.createOrder(args)
        const { _id, __v, userid, ...orderInfo } = newOrder

        orderInfo.userid = UserUtils.id_encrypt(userid)
        orderInfo.orderid = _id

        return httpUtils.send_json(200, orderInfo)
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

//GET
router.get('/get', async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const orderid = req.body.orderid
        const userid = req.body.userid

        const ordersInfo = await Order.getOrderDetails(orderid, userid)
        if (!ordersInfo) throw new LogicError({ status: 404, message: "order not found" })
        const { _id, __v, ...orderInfo } = ordersInfo

        orderInfo.userid = UserUtils.id_encrypt(orderInfo.userid)
        orderInfo.orderid = _id

        return httpUtils.send_json(200, orderInfo)
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

//GET ALL BY USER
router.get('/get-by-user', async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const userid = req.body.userid
        const pageno = req.body?.pageno || 1
        const pagesize = req.body?.pagesize || 10
        const skip = pagesize * (pageno - 1)
        const limit = pagesize

        const orders = await Order.getAllUserOrderDetails(userid, skip, limit)
        if (!orders) throw new LogicError({ status: 404, message: "orders not found" })
        const { userid: _userid, ...ordersInfo } = orders

        ordersInfo.orders = ordersInfo.orders.map(order => {
            const { _id, __v, ...orderInfo } = order

            orderInfo.orderid = _id

            return orderInfo
        })
        ordersInfo.userid = UserUtils.id_encrypt(_userid)

        return httpUtils.send_json(200, ordersInfo)
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

//GET ALL
router.get('/get-all', async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const pageno = req.body?.pageno || 1
        const pagesize = req.body?.pagesize || 10
        const skip = pagesize * (pageno - 1)
        const limit = pagesize

        const orders = await Order.getAllOrderDetails(skip, limit)

        orders.orders = orders.orders.map(order => {
            const { _id, __v, userid, ...orderInfo } = order
            orderInfo.userid = UserUtils.id_encrypt(userid)
            orderInfo.orderid = _id

            return orderInfo
        })

        return httpUtils.send_json(200, orders)
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

// GET STATS
router.get('/get-stats', async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const fromdate = req.body.fromdate
        const pageno = req.body?.pageno || 1
        const pagesize = req.body?.pagesize || 10
        const skip = pagesize * (pageno - 1)
        const limit = pagesize

        let stats = await Order.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(fromdate),
                    },
                },
            },
            {
                $facet: {
                    products: [
                        {
                            $group: {
                                _id: {
                                    $year: "$createdAt",
                                },
                                orders: {
                                    $push: "$$ROOT",
                                },
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                orders: 1,
                            },
                        },
                        {
                            $unwind: "$orders",
                        },
                        {
                            $project: {
                                products: "$orders.products",
                            },
                        },
                        {
                            $unwind: "$products",
                        },
                        {
                            $project: {
                                productid: "$products.productid",
                                variantname: "$products.variantname",
                            },
                        },
                        {
                            $group: {
                                _id: {
                                    productid: "$productid",
                                    variantname: "$variantname",
                                },
                                count: {
                                    $sum: 1,
                                },
                            },
                        },
                        {
                            $group: {
                                _id: null,
                                products: {
                                    $push: {
                                        productid: "$_id.productid",
                                        variantname: "$_id.variantname",
                                        count: "$count",
                                    },
                                },
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                products: 1,
                            },
                        },
                    ],
                    metadata: [
                        {
                            $group: {
                                _id: {
                                    $year: "$createdAt",
                                },
                                total: {
                                    $sum: 1,
                                },
                                income: {
                                    $sum: "$price",
                                },
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                            },
                        },
                    ],
                },
            },
            {
                $unwind: "$metadata",
            },
            {
                $unwind: "$products",
            },
            {
                $project: {
                    products: "$products.products",
                    total: "$metadata.total",
                    income: "$metadata.income",
                },
            },
        ])

        if (!stats.length === 0) throw new LogicError({ status: 404, message: "stats not found" })

        stats = stats[0]
        let { total, income, products } = stats

        products = products.sort((a, b) => b.count - a.count)
        products = products.slice(skip, skip + limit)

        const product_details = []

        for (let i = 0; i < products.length; i++) {
            let product = await Product.aggregate([
                {
                    $match: {
                        _id: { $eq: ObjectId.createFromHexString(String(products[i].productid)) }
                    }
                },
                {
                    $unwind: "$variants"
                },
                {
                    $match: {
                        "variants.name": products[i].variantname
                    }
                },
                {
                    $addFields: {
                        count: { $toInt: products[i].count },
                        "productid": "$_id",
                    }
                },
                {
                    $project: {
                        _id: 0,
                        productid: 1,
                        title: 1,
                        categories: 1,
                        count: 1,
                        variant: {
                            name: "$variants.name",
                            img: "$variants.img"
                        }
                    }
                }
            ])

            if (product.length !== 0) product_details.push(product[0])
        }

        const categoires = {}

        product_details.forEach(product => {
            product.categories.forEach(category => {
                if (!categoires[category]) categoires[category] = 0
                categoires[category] += product.count
            })

            delete product.categories
        })

        return httpUtils.send_json(200, {
            total,
            income,
            products: product_details,
            categories: categoires
        })
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

//STATS

//UPDATE
router.patch('/update', async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const orderid = req.body.orderid
        const status = req.body.status

        const order = await Order.updateOrderStatus(orderid, status)
        if (!order) throw new LogicError({ status: 404, message: "order not found" })
        const { _id, __v, userid, ...orderInfo } = order

        orderInfo.userid = UserUtils.id_encrypt(userid)
        orderInfo.orderid = _id

        return httpUtils.send_json(200, orderInfo)
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

module.exports = router