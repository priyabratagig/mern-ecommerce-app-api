const User = require("../models/User.model.cjs")
const { LogicError, UserUtils, HTTPUtils } = require("../utils")

const access_token_provided = ({ req }) => {
    if (!req.signedCookies?.access_token) throw new LogicError({ status: 401, message: "Not Authorized" })
}

const logged_in_user_exists = async ({ body }) => {
    const user = await User.findById(body.id)
    if (!user) throw new LogicError({ status: 401, message: "User does not exist" })

    return user
}

const AUTHENTICATION_IGNORED_ROUTES = [
    /\/auth/,
    /\/products\/get\/[A-za-z0-9]+\/[A-za-z0-9]+/,
    /\/products\/get-by-categories\/[A-za-z\+]+/,
    /\/products\/get-all/,
    /\/products\/search/,
    /\/cart\//
]

const authenticate = async (req, res, next) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        access_token_provided({ req })

        const userUtils = new UserUtils(req, res)
        const token = userUtils.get_access_token()

        const user = await UserUtils.user_exists({ userid: token.userid })
        const { _id, __v, ...userInfo } = user._doc
        userInfo.userid = String(_id)
        token.user = userInfo

        req.loggedinuser = token

        return next()
    } catch (err) {
        const ignore_authentication = AUTHENTICATION_IGNORED_ROUTES.some(route => route.test(req.url))
        if (ignore_authentication) return next()

        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
}

module.exports = authenticate