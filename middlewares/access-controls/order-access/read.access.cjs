const { HTTPUtils, LogicError, UserUtils, OrderUtils } = require("../../../utils")

const only_admin_with_read_access_or_superadmin_can_view_the_route = ({ loggedInUser }) => {
    if (!loggedInUser.issuperadmin && !(loggedInUser.isadmin && loggedInUser.adminaccess?.canRead)) throw new LogicError({ status: 403, message: "You are not allowed to access this route" })
}

const only_admin_with_read_access_or_superadmin_can_view_other_order = ({ loggedInUser, userid, orderid }) => {
    if (userid !== loggedInUser.userid && !loggedInUser.issuperadmin && !(loggedInUser.isadmin && loggedInUser.adminaccess?.canRead)) throw new LogicError({ status: 403, message: "You are not allowed to view other's order" })
}

const read_order_access = async (req, res, next) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const userid = req.body.userid ? UserUtils.id_decrypt(req.body.userid) : ""
        const args = {
            loggedInUser: req.loggedinuser,
            userid,
            orderid: req.body.orderid,
            fromdate: req.body.fromdate
        }

        switch (true) {
            case req.url.includes('/get-by-user'):
                OrderUtils.all_get_order_by_user_attritibutes_provided(args)
                only_admin_with_read_access_or_superadmin_can_view_other_order(args)

                req.body.userid = userid

                return next()

            case req.url.includes('/get-all'):
                only_admin_with_read_access_or_superadmin_can_view_the_route(args)

                return next()

            case req.url.includes('/get-stats'):
                OrderUtils.all_get_stats_attritibutes_provided(args)
                only_admin_with_read_access_or_superadmin_can_view_other_order(args)

                return next()

            case req.url.includes('/get'):
                OrderUtils.all_get_order_attritibutes_provided(args)
                only_admin_with_read_access_or_superadmin_can_view_other_order(args)

                req.body.userid = userid

                return next()

            default: return next()
        }
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
}

module.exports = read_order_access