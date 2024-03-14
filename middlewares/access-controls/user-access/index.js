const create_user_access = require('./create.user.access.cjs')
const update_user_access = require('./update.user.access.cjs')
const delete_user_access = require('./delete.user.access.cjs')
const read_user_access = require('./read.user.access.cjs')

const user_access = async (req, res, next) => {
    const url = String(req.url)

    switch (true) {
        case url.includes('/register'): return create_user_access(req, res, next)
        case url.includes('/update'): return update_user_access(req, res, next)
        case url.includes('/delete'): return delete_user_access(req, res, next)
        case url.includes('/get'):
        case url.includes('/get-all'):
        case url.includes('/stats'): return read_user_access(req, res, next)

        default: return next()
    }
}

module.exports = user_access