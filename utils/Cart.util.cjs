const LogicError = require("./LogicError.cjs")
const { ObjectId } = require("mongodb")

class CartUtils {
    constructor(req, res, next = undefined) {
        this.req = req
        this.res = res
        this.next = next
    }

    static all_cart_attritibutes_provided({ userid, products }) {
        if (userid && !ObjectId.isValid(userid)) throw new LogicError({ status: 400, message: "userid is required" })
        if (!products) throw new LogicError({ status: 400, message: "products is required" })
        if (!Array.isArray(products)) throw new LogicError({ status: 400, message: "products should be an array" })

        products.forEach((product) => {
            if (!product.productid) throw new LogicError({ status: 400, message: "productid is required" })
            if (!product.variantname) throw new LogicError({ status: 400, message: "varientname is required" })
            if (!product.size) throw new LogicError({ status: 400, message: "size is required" })
            if (!product.quantity) throw new LogicError({ status: 400, message: "quantity is required" })
            if (isNaN(product.quantity) || product.quantity <= 0) throw new LogicError({ status: 400, message: "quantity should be number greater than zero" })
        })
    }

    get_from_cookies() {
        const cart = this.req.cookies.cart || '{"products":[]}'
        return JSON.parse(cart)
    }

    set_to_cookies(cart) {
        this.res.cookie("cart", JSON.stringify(cart) || '{"products":[]}', { maxAge: process.env.COOKIE_EXPIRY })
    }

    delete_from_cookies() {
        this.res.clearCookie("cart")
    }
}

module.exports = CartUtils