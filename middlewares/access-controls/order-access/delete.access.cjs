const { HTTPUtils, LogicError } = require("../../../utils")

const no_one_can_delete_order = () => {
    throw new LogicError({ status: 400, message: "no one can delete order" })
}

const delete_order_access = async (req, res, next) => {
    const httpUtils = new HTTPUtils(req, res)
    try {

        no_one_can_delete_order()

        return next()
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
}

module.exports = delete_order_access