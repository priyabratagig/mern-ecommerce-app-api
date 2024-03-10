class LogicError extends Error {
    constructor({ status = 400, message = "LogicError" }) {
        super(message)
        this.name = this.constructor.name
        this.status = status
    }
}

module.exports = LogicError