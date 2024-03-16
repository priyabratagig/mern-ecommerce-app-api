const create_product_access = require('./create.product.access.cjs')
const update_product_access = require('./update.product.access.cjs')
const delete_product_access = require('./delete.product.access.cjs')
const read_product_access = require('./read.product.access.cjs')

const product_access = async (req, res, next) => {
    const url = String(req.url)

    switch (true) {
        case url.includes('/add'): return create_product_access(req, res, next)
        case url.includes('/update'): return update_product_access(req, res, next)
        case url.includes('/get'): return read_product_access(req, res, next)
        case url.includes('/search'): return read_product_access(req, res, next)
        case url.includes('/delete'): return delete_product_access(req, res, next)

        default: return next()
    }
}

module.exports = product_access