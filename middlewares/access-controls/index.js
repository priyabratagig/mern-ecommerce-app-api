const user_access = require('./user-access')

const access_controls = (req, res, next) => {
    const url = String(req.url)

    switch (true) {
        case url.includes('/auth'): return user_access(req, res, next)
        case url.includes('/user'): return user_access(req, res, next)

        default: return next()
    }
}

module.exports = access_controls