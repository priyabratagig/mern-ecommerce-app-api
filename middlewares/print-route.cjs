const print_route = (req, res, next) => {
    console.log('\x1b[32m' + `${req.method} ${req.url}` + '\x1b[0m')

    return next()
}

module.exports = print_route