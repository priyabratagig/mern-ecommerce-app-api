const { ObjectId } = require('mongodb')
const LogicError = require("./LogicError.cjs")
const User = require('../models/User.model.cjs')

class OrderUtils {
    constructor(req, res, next = undefined) {
        this.req = req
        this.res = res
        this.next = next
    }

    static all_order_attritibutes_provided({ userid, products, address }) {
        if (!userid) throw new LogicError({ status: 400, message: "userid not provided" })
        if (!ObjectId.isValid(userid)) throw new LogicError({ status: 400, message: "userid is not valid" })
        if (!products) throw new LogicError({ status: 400, message: "products not provided" })
        if (!Array.isArray(products)) throw new LogicError({ status: 400, message: "products should be an array" })
        if (!products.length) throw new LogicError({ status: 400, message: "At least one product is required" })

        products.forEach((product) => {
            if (!product.productid) throw new LogicError({ status: 400, message: "productid not provided" })
            if (!product.variantname) throw new LogicError({ status: 400, message: "varientname not provided" })
            if (!product.size) throw new LogicError({ status: 400, message: "size not provided" })
            if (!product.quantity) throw new LogicError({ status: 400, message: "quantity not provided" })
            if (isNaN(product.quantity) || product.quantity <= 0) throw new LogicError({ status: 400, message: "quantity should be number greater than zero" })
            if (!products.available) throw new LogicError({ status: 400, message: "product not available" })
        })

        if (!products.price) throw new LogicError({ status: 400, message: "price not provided" })
        if (isNaN(products.price) || products.price <= 0) throw new LogicError({ status: 400, message: "price should be number greater than zero" })

        if (!address) throw new LogicError({ status: 400, message: "address not provided" })
        if (!address.address) throw new LogicError({ status: 400, message: "address.address not provided" })
        if (!address.city) throw new LogicError({ status: 400, message: "city not provided" })
        if (!address.state) throw new LogicError({ status: 400, message: "state not provided" })
        if (!address.country) throw new LogicError({ status: 400, message: "country not provided" })
        if (!address.pincode) throw new LogicError({ status: 400, message: "pincode not provided" })
    }

    static async userid_exists({ userid }) {
        if (!userid) throw new LogicError({ status: 400, message: "userid not provided" })
        if (!ObjectId.isValid(userid)) throw new LogicError({ status: 400, message: "userid is not valid" })

        const user = await User.findById({ _id: ObjectId.createFromHexString(String(userid)) })
        if (!user) throw new LogicError({ status: 404, message: "user not found" })

        return user.toJOSN()
    }
}

module.exports = OrderUtils