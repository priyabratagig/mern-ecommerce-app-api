const { LogicError, HTTPUtils, ProductUtils } = require("../../../utils")

const only_admin_with_delete_access_or_superadmin_can_add_product = ({ loggedInUser }) => {
    if (!loggedInUser.issuperadmin && (!loggedInUser.isadmin || !loggedInUser.adminaccess?.canDelete)) throw new LogicError({ status: 403, message: "You are not allowed to delete product" })
}

const delete_product_access = async (req, res, next) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const args = {
            loggedInUser: req.loggedinuser,
            productid: req.body.productid,
        }

        only_admin_with_delete_access_or_superadmin_can_add_product(args)
        await ProductUtils.products_exists(args)

        return next()
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
}

module.exports = delete_product_access