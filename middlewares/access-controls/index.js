const { API_VERSION } = require('../../configs.cjs')
const update_user = require('./udpate-user.cjs')
const register_user = require('./register-user.cjs')

const base_path = `/api/${API_VERSION}`

const access_controls = (req, res, next) => {
    switch (req.url) {
        case `${base_path}/auth/register`: return register_user(req, res, next)
        case `${base_path}/user/update`: return update_user(req, res, next)
        default: return next()
    }
}

module.exports = access_controls