const read_order_access = require("./read.access.cjs")
const update_order_access = require("./update.access.cjs")
const create_order_access = require("./create.access.cjs")
const delete_order_access = require("./delete.access.cjs")

const order_access = (req, res, next) => {
    switch (true) {
        case req.url.includes('/get'): return read_order_access(req, res, next)
        case req.url.includes('/update'): return update_order_access(req, res, next)
        case req.url.includes('/create'): return create_order_access(req, res, next)
        case req.url.includes('/delete'): return delete_order_access(req, res, next)

        default: return next()
    }
}

module.exports = order_access