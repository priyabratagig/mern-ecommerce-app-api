const { LogicError, HTTPUtils } = require("../../../utils")

const only_superadmin_or_admin_can_register_admin_user = ({ loggedInUser, body }) => {
    if (body.isadmin && !(loggedInUser?.isadmin || loggedInUser?.issuperadmin)) throw new LogicError({ status: 400, message: "Only admin or issuperadmin can register admin user" })
}

const only_organization_can_register_superadmin = ({ loggedInUser, body }) => {
    if (body.issuperadmin) throw new LogicError({ status: 400, message: "Only organization authorities can register superadmin" })
}

const create_user_access = (req, res, next) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const args = {
            loggedInUser: req.loggedinuser,
            body: req.body
        }
        only_organization_can_register_superadmin(args)
        only_superadmin_or_admin_can_register_admin_user(args)

        return next()
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
}

module.exports = create_user_access