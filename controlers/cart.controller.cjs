const router = require("express").Router()
const Cart = require("../models/Cart.model.cjs")
const { HTTPUtils, CartUtils, UserUtils } = require("../utils")

//GET
router.get("/getcart", async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    const cartUtils = new CartUtils(req, res)
    try {
        const loggedinUser = req.loggedinuser
        const localCart = cartUtils.get_from_cookies()

        const cart = await Cart.getCart(loggedinUser?.userid, localCart)
        const { _id, __v, createdAt, ...cartInfo } = cart

        cartInfo.userid = cartInfo.userid && UserUtils.id_encrypt(cartInfo.userid)
        cartInfo.cartid = cartInfo.userid && _id

        if (loggedinUser?.userid) cartUtils.delete_from_cookies()

        return httpUtils.send_json(200, cartInfo)
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

//UPDATE
router.post("/update", async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    const cartUtils = new CartUtils(req, res)
    try {
        CartUtils.all_cart_attritibutes_provided(req.body)
        const products = req.body.products
        const loggedinUser = req.loggedinuser
        const localCart = cartUtils.get_from_cookies()

        const updatedCart = await Cart.updateCart(loggedinUser?.userid, products, localCart)

        const { _id, __v, createdAt, ...cartInfo } = updatedCart
        cartInfo.userid = cartInfo.userid && UserUtils.id_encrypt(cartInfo.userid)
        cartInfo.cartid = cartInfo.userid && _id

        if (loggedinUser?.userid) cartUtils.delete_from_cookies()
        else cartUtils.set_to_cookies(cartInfo)

        return httpUtils.send_json(200, cartInfo)
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

//ADD
router.put("/add", async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    const cartUtils = new CartUtils(req, res)
    try {
        const product = req.body.product
        const loggedinUser = req.loggedinuser
        const localCart = cartUtils.get_from_cookies()
        CartUtils.all_cart_attritibutes_provided({ products: [product] })

        const updatedCart = await Cart.addCart(loggedinUser?.userid, product, localCart)

        const { _id, __v, createdAt, ...cartInfo } = updatedCart
        cartInfo.userid = cartInfo.userid && UserUtils.id_encrypt(cartInfo.userid)
        cartInfo.cartid = cartInfo.userid && _id

        if (loggedinUser?.userid) cartUtils.delete_from_cookies()
        else cartUtils.set_to_cookies(cartInfo)

        return httpUtils.send_json(200, cartInfo)
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

module.exports = router