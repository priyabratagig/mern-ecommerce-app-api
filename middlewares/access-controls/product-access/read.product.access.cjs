const { HTTPUtils, LogicError, ProductUtils } = require("../../../utils")

const anyone_can_view_product = ({ loggedInUser }) => {
    return true
}

const only_admin_or_superadmin_can_view_the_route = ({ loggedInUser }) => {
    if (!loggedInUser.issuperadmin && !(loggedInUser.isadmin && loggedInUser.adminaccess?.canRead)) throw new LogicError(403, "You are not allowed to access this route")
}

const read_product_access = async (req, res, next) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const args = {
            loggedInUser: req.loggedinuser,
            params: req.params
        }

        switch (true) {
            case req.url.includes('/get-all'):
                only_admin_or_superadmin_can_view_the_route(args)
                const products = await ProductUtils.products_exists(args)
                req.params.products = products._doc

                return next()

            case req.url.includes('/get'):
                anyone_can_view_product(args)
                const product = await ProductUtils.product_variant_exists(args)
                req.params.product = product._doc

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

module.exports = read_product_access