class HTTPUtils {
    constructor(req, res, next = undefined) {
        this.req = req
        this.res = res
        this.next = next
    }

    send_json(status = 500, data) {
        return this.res.status(status).json(data)
    }

    send_message(status = 500, message) {
        return this.res.status(status).json({ message: message })
    }
}

module.exports = HTTPUtils