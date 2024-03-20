const user_access = require('./user-access')
const product_access = require('./product-access')
const order_access = require('./order-access')

const access_controls = (req, res, next) => {
    const url = String(req.url)

    switch (true) {
        case url.includes('/auth'): return user_access(req, res, next)
        case url.includes('/user'): return user_access(req, res, next)
        case url.includes('/products'): return product_access(req, res, next)
        case url.includes('/order'): return order_access(req, res, next)

        default: return next()
    }
}

module.exports = access_controls