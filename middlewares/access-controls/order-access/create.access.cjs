const { HTTPUtils, LogicError } = require("../../../utils")
const { ObjectId } = require('mongodb')

const anyone_can_create_order = ({ loggedInUser }) => {
    if (!loggedInUser.userid) throw new LogicError({ status: 400, message: "userid not provided" })
    if (!ObjectId.isValid(loggedInUser.userid)) throw new LogicError({ status: 400, message: "userid is not valid" })

    return true
}

const create_order_access = async (req, res, next) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const args = {
            loggedInUser: req.loggedinuser,
        }

        anyone_can_create_order(args)

        return next()
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
}

module.exports = create_order_access