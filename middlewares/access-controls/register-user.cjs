const { LogicError } = require("../../utils")

const only_superadmin_or_admin_can_register_admin_user = ({ loggedInUser, body }) => {
    if (body.isadmin && !(loggedInUser?.isadmin || loggedInUser?.issuperadmin)) throw new LogicError({ status: 400, message: "Only admin or issuperadmin can register admin user" })
}

const only_organization_can_register_superadmin = ({ loggedInUser, body }) => {
    if (body.issuperadmin) throw new LogicError({ status: 400, message: "Only organization authorities can register superadmin" })
}

const register_user = (req, res, next) => {
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
        if (err.status) return res.status(err.status).json(err.message)
        return res.status(500).json(err.message)
    }
}

module.exports = register_user