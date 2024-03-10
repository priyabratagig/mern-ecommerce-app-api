const register_user = require('./register.access.cjs')
const update_user = require('./udpate.access.cjs')
const delete_user = require('./delete.access.cjs')

const user_access = async (req, res, next) => {
    const url = String(req.url)

    switch (true) {
        case url.includes('/register'): return register_user(req, res, next)
        case url.includes('/update'): return update_user(req, res, next)
        case url.includes('/delete'): return delete_user(req, res, next)

        default: return next()
    }
}

module.exports = user_access