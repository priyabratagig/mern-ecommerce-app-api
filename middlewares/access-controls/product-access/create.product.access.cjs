const { LogicError, HTTPUtils } = require("../../../utils")

const only_admin_with_add_access_or_superadmin_can_add_product = ({ loggedInUser }) => {
    if (!loggedInUser.issuperadmin && !(loggedInUser.isadmin && !loggedInUser.adminaccess?.canCreate)) throw new LogicError(403, "You are not allowed to add product")
}

const create_product_access = (req, res, next) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const args = {
            loggedInUser: req.loggedinuser
        }

        only_admin_with_add_access_or_superadmin_can_add_product(args)

        return next()
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
}

module.exports = create_product_access