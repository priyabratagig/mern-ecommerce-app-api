const router = require("express").Router()
const Order = require("../models/Order.model")
const { OrderUtils, HTTPUtils } = require("../utils")

//CREATE
router.post('/create', async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        OrderUtils.all_order_attritibutes_provided(req.body)
        const loggedinUser = req.loggedinuser

        const newOrder = await Order.createOrder(loggedinUser.userid, req.body)
        newOrder.userid = UserUtils.id_encrypt(newOrder.userid)

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
        const orders = await Order.getOrders(loggedinUser.userid)
        const orderid = req.body.orderid

        const ordersInfo = await Order.getOrderDetails(orderid)

        return httpUtils.send_json(200, ordersInfo)
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

        return httpUtils.send_json(200, orders)
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

        return httpUtils.send_json(200, orders)
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

        return httpUtils.send_json(200, order)
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

module.exports = router