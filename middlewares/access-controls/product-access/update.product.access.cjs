const { LogicError, HTTPUtils, ProductUtils } = require("../../../utils")

const only_admin_with_update_access_or_superadmin_can_add_product = ({ loggedInUser }) => {
    if (!loggedInUser.issuperadmin && (!loggedInUser.isadmin || !loggedInUser.adminaccess?.canUpdate)) throw new LogicError({ status: 403, message: "You are not allowed to update product" })
}

const update_product_access = async (req, res, next) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const args = {
            loggedInUser: req.loggedinuser,
            productid: req.body.productid,
        }

        only_admin_with_update_access_or_superadmin_can_add_product(args)
        const products = await ProductUtils.products_exists(args)

        req.body.products = products

        return next()
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
}

module.exports = update_product_access