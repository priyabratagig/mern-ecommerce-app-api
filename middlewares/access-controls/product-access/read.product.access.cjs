const { HTTPUtils, LogicError, ProductUtils } = require("../../../utils")

const anyone_can_view_product = ({ loggedInUser }) => {
    return true
}

const only_admin_or_superadmin_can_view_the_route = ({ loggedInUser }) => {
    if (!loggedInUser.issuperadmin && !(loggedInUser.isadmin && loggedInUser.adminaccess?.canRead)) throw new LogicError({ status: 403, message: "You are not allowed to access this route" })
}

const read_product_access = async (req, res, next) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const productid = String(req.url).match(/(?<=\/products\/(get|get-group)\/)([A-Za-z0-9]+)/i)?.[2]
        const productname = String(req.url).match(/(?<=\/products\/(get|get-group)\/)[A-Za-z0-9]+\/([A-Za-z0-9]+)/i)?.[2]
        const args = {
            loggedInUser: req.loggedinuser,
            params: {
                productid,
                productname
            },
            productid,
            productname
        }

        switch (true) {
            case req.url.includes('/get/'):
                anyone_can_view_product(args)
                const product = await ProductUtils.product_variant_exists(args)
                req.product = product

                return next()

            case req.url.includes('/search'):
                anyone_can_view_product(args)

                return next()

            case req.url.includes('/get-all'):
                anyone_can_view_product(args)

                return next()

            case req.url.includes('/get-group'):
                only_admin_or_superadmin_can_view_the_route(args)
                const products_group = await ProductUtils.products_exists(args)
                req.products_group = products_group

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