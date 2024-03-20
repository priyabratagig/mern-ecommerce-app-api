const { ObjectId } = require('mongodb')
const LogicError = require("./LogicError.cjs")
const mongoose = require('mongoose')
const { ProductUtils } = require('.')

class OrderUtils {
    constructor(req, res, next = undefined) {
        this.req = req
        this.res = res
        this.next = next
    }

    static async order_exists({ orderid }) {
        if (!orderid) throw new LogicError({ status: 400, message: "orderid not provided" })
        if (!ObjectId.isValid(orderid)) throw new LogicError({ status: 400, message: "orderid is not valid" })

        const Order = mongoose.model('Order')

        const order = await Order.findById({ _id: ObjectId.createFromHexString(String(orderid)) })
        if (!order) throw new LogicError({ status: 404, message: "order not found" })

        return order.toObject()
    }

    static all_create_order_attritibutes_provided({ address }) {
        if (!address) throw new LogicError({ status: 400, message: "address not provided" })
        if (!address.address) throw new LogicError({ status: 400, message: "address.address not provided" })
        if (!/.{10,100}/.test(address.address)) throw new LogicError({ status: 400, message: "address.address should be 10 to 100 characters" })
        if (!address.city) throw new LogicError({ status: 400, message: "city not provided" })
        if (!/^[a-zA-Z]{3,20}$/.test(address.city)) throw new LogicError({ status: 400, message: "city should be 3 to 20 characters only with alphabets" })
        if (!address.state) throw new LogicError({ status: 400, message: "state not provided" })
        if (!/^[a-zA-Z]{3,20}$/.test(address.state)) throw new LogicError({ status: 400, message: "state should be 3 to 20 characters only with alphabets" })
        if (!address.country) throw new LogicError({ status: 400, message: "country not provided" })
        if (!/^[a-zA-Z]{2,20}$/.test(address.country)) throw new LogicError({ status: 400, message: "country should be 2 to 20 characters only with alphabets" })
        if (!address.pincode) throw new LogicError({ status: 400, message: "pincode not provided" })
        if (!/^[1-9][0-9]{5}$/.test(address.pincode)) throw new LogicError({ status: 400, message: "pincode should be 6 digit number starts wtih 1 to 9" })
    }

    static all_update_order_attritibutes_provided({ orderid, status }) {
        if (!orderid) throw new LogicError({ status: 400, message: "orderid not provided" })
        if (!ObjectId.isValid(orderid)) throw new LogicError({ status: 400, message: "orderid is not valid" })

        if (!status) throw new LogicError({ status: 400, message: "status not provided" })
        if (["pending", "processing", "shipped", "delivered", "cancelled"].indexOf(status) === -1) throw new LogicError({ status: 400, message: "invalid status provided" })
    }

    static all_get_order_attritibutes_provided({ userid, orderid }) {
        if (!userid) throw new LogicError({ status: 400, message: "userid not provided" })
        if (!ObjectId.isValid(userid)) throw new LogicError({ status: 400, message: "userid is not valid" })

        if (!orderid) throw new LogicError({ status: 400, message: "orderid not provided" })
        if (!ObjectId.isValid(orderid)) throw new LogicError({ status: 400, message: "orderid is not valid" })
    }

    static all_get_order_by_user_attritibutes_provided({ userid }) {
        if (!userid) throw new LogicError({ status: 400, message: "userid not provided" })
        if (!ObjectId.isValid(userid)) throw new LogicError({ status: 400, message: "userid is not valid" })
    }

    static all_get_stats_attritibutes_provided({ fromdate }) {
        if (!fromdate) throw new LogicError({ status: 400, message: "fromdate not provided" })
        if (!Date.parse(fromdate)) throw new LogicError({ status: 400, message: "fromdate is not valid" })
    }

    static async userid_exists({ userid }) {
        if (!userid) throw new LogicError({ status: 400, message: "userid not provided" })
        if (!ObjectId.isValid(userid)) throw new LogicError({ status: 400, message: "userid is not valid" })

        const User = mongoose.model('User')

        const user = await User.findById({ _id: ObjectId.createFromHexString(String(userid)) })
        if (!user) throw new LogicError({ status: 404, message: "user not found" })

        return user.toObject()
    }
}

module.exports = OrderUtils