const { HTTPUtils } = require("../utils")

const HTTP_secure = (req, res, next) => {
    const httpUtils = new HTTPUtils(req, res)
    if (!req.secure) return httpUtils.send_message(301, "Access Denied, only HTTPS is allowed")

    return next()
}

module.exports = HTTP_secure