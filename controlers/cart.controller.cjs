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
        updatedCart.userid = UserUtils.id_encrypt(updatedCart.userid)
        const { _id, __v, createdAt, ...cartInfo } = updatedCart

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
        CartUtils.all_cart_attritibutes_provided({ products: [req.body.product] })
        const product = req.body.product
        const loggedinUser = req.loggedinuser
        const localCart = cartUtils.get_from_cookies()

        const updatedCart = await Cart.addCart(loggedinUser?.userid, product, localCart)
        updatedCart.userid = UserUtils.id_encrypt(updatedCart.userid)
        const { _id, __v, createdAt, ...cartInfo } = updatedCart

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