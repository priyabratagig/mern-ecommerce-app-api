const User = require("../models/User.model.cjs")
const { LogicError, UserUtils } = require("../utils")

const access_token_provided = ({ req }) => {
    if (!req.signedCookies?.access_token) throw new LogicError({ status: 401, message: "Not Authorized" })
}

const logged_in_user_exists = async ({ body }) => {
    const user = await User.findById(body.id)
    if (!user) throw new LogicError({ status: 401, message: "User does not exist" })

    return user
}

const authenticate = async (req, res, next) => {
    try {
        access_token_provided({ req })

        const userUtils = new UserUtils(req, res)
        const token = userUtils.get_access_token()

        const user = await UserUtils.user_exists({ userid: token.userid })
        req.loggedinuser = token

        return next()

    } catch (err) {
        if (String(req.url).includes('/auth')) return next()

        console.error(err.message)
        if (err.status) return res.status(err.status).json(err.message)
        return res.status(500).json(err.message)
    }
}

module.exports = authenticate