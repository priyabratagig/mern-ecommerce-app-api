const { LogicError, UserUtils, HTTPUtils } = require('../../../utils')

const only_update_user_exists = async (userid) => {
    const user = await UserUtils.user_exists({ userid }).catch(err => { throw new LogicError({ status: 400, message: "User does not exist" }) })

    return user
}

const none_can_update_other_username_or_password = ({ loggedInUser, user, body }) => {
    if (loggedInUser.userid !== body.userid && user.username !== body.username) throw new LogicError({ status: 400, message: "You are not allowed to update other's username" })
    if (loggedInUser.userid !== body.userid && user.password !== body.password) throw new LogicError({ status: 400, message: "You are not allowed to update other's password" })
}

const only_higher_level_can_update_lower_level = ({ loggedInUser, user, body }) => {
    if (loggedInUser.userid === body.userid) return true
    if (!loggedInUser.isadmin) throw new LogicError({ status: 400, message: "You are not allowed to update other's details" })
    if (user.isadmin && !loggedInUser.issuperadmin) throw new LogicError({ status: 400, message: "Only superadmin can update admin accounts" })
    if (user.issuperadmin) throw new LogicError({ status: 400, message: "Only organization authorities can update superadmin" })
}

const only_admin_or_superadmin_can_make_admin = ({ loggedInUser, user, body }) => {
    if (body.isadmin && !user.isadmin && !(loggedInUser.isadmin || loggedInUser.issuperadmin)) throw new LogicError({ status: 400, message: "Only existing admin or superadmin can make new admin" })
}

const only_organization_can_update_superadmin = ({ loggedInUser, user, body }) => {
    if (user.issuperadmin && !body.issuperadmin) throw new LogicError({ status: 400, message: "Only organization authorities can make superadmin" })
}

const only_superadmin_can_revoke_or_update_admin_accesses = ({ loggedInUser, user, body }) => {
    if (loggedInUser.issuperadmin) return true
    if (user.isadmin === body.isadmin && !body.hasOwnProperty('adminaccess')) return true

    switch (true) {
        case user.isadmin && !body.isadmin:
        case Boolean(user.adminaccess?.canCreate) !== Boolean(body.adminaccess?.canCreate):
        case Boolean(user.adminaccess?.canRead) !== Boolean(body.adminaccess?.canRead):
        case Boolean(user.adminaccess?.canUpdate) !== Boolean(body.adminaccess?.canUpdate):
        case Boolean(user.adminaccess?.canDelete) !== Boolean(body.adminaccess?.canDelete):
            throw new LogicError({ status: 400, message: "Only superadmin can revoke or update admin accesses" })
        default: return true
    }
}

const update_user_access = async (req, res, next) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        UserUtils.user_id_provided(req)
        const userUtils = new UserUtils(req, res)
        const userid = UserUtils.id_decrypt(req.body.userid)
        const user = loggedInUser.userid === userid ? req.loggedinuser.user : await only_update_user_exists(userid)
        const args = {
            loggedInUser: req.loggedinuser,
            user,
            body: { ...req.body, userid }
        }

        none_can_update_other_username_or_password(args)
        only_higher_level_can_update_lower_level(args)
        only_admin_or_superadmin_can_make_admin(args)
        only_organization_can_update_superadmin(args)
        only_superadmin_can_revoke_or_update_admin_accesses(args)

        userUtils.set_req_user(user)
        return next()
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
}

module.exports = update_user_access