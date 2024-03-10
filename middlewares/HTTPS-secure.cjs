const HTTP_secure = (req, res, next) => {
    if (!req.secure) return res.status(301).send("Access Denied, only HTTPS is allowed")

    return next()
}

module.exports = HTTP_secure