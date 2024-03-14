const { LogicError, UserUtils, HTTPUtils } = require('../../../utils')

const user_id_provided = ({ body: { userid } }) => {
    if (!userid) throw new LogicError({ status: 400, message: "Missing userid" })

    return UserUtils.id_decrypt(userid)
}

const only_view_itself = ({ bobdy: { userid }, loggedInUser }) => {
    if (userid !== loggedInUser.userid) throw new LogicError({ status: 400, message: "Unauthorized" })
}

const only_admin_or_superadmin_are_allowed = ({ loggedInUser }) => {
    if (!loggedInUser.issuperadmin && !(loggedInUser.isadmin || loggedInUser.adminaccess?.canRead)) throw new LogicError({ status: 400, message: "Unauthorized" })
}

const get_query = ({ loggedInUser }) => {
    if (!loggedInUser.issuperadmin) return { issuperadmin: { $eq: false } }

    return {}
}

const read_user_access = async (req, res, next) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        switch (true) {
            case req.url.includes('/get'):
                const userid = user_id_provided(req)
                req.body.userid = userid

                const args = {
                    loggedInUser: req.loggedinuser,
                    body: req.body
                }
                only_view_itself(args)

                return next()

            case req.url.includes('/get-all'):
            case req.url.includes('/stats'):
                only_admin_or_superadmin_are_allowed({ loggedInUser: req.loggedinuser })

                const query = get_query({ loggedInUser: req.loggedinuser })
                req.body.query = { $match: query }

                return next()

            default: return next()
        }
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
}

module.exports = read_user_access