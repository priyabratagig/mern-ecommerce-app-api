const { HTTPUtils, LogicError, OrderUtils } = require("../../../utils")

const only_admin_with_update_access_or_superadmin_can_view_the_route = ({ loggedInUser }) => {
    if (!loggedInUser.issuperadmin && !(loggedInUser.isadmin && loggedInUser.adminaccess?.canUpdate)) throw new LogicError({ status: 403, message: "You are not allowed to update order" })
}

const update_order_access = async (req, res, next) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const args = {
            loggedInUser: req.loggedinuser,
            orderid: req.body.orderid
        }

        const order = await OrderUtils.order_exists(args)
        only_admin_with_update_access_or_superadmin_can_view_the_route(args)

        req.body.order = order

        return next()
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
}

module.exports = update_order_access