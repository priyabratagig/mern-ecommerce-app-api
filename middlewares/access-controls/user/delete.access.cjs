const { LogicError, UserUtils, HTTPUtils } = require("../../../utils")

const only_delete_user_exists = async (userid) => {
    const user = await UserUtils.user_exists({ userid }).catch(err => { throw new LogicError({ status: 400, message: "User does not exist" }) })

    return user
}

const user_can_only_delete_itself = ({ loggedInUser, body }) => {
    if (!loggedInUser.isadmin && loggedInUser.userid !== body.userid) throw new LogicError({ status: 403, message: "You are not allowed to delete other user" })
}

const admin_with_delete_access_can_delete_other_user = ({ loggedInUser, user, body }) => {
    if ((!loggedInUser.isadmin || !loggedInUser.adminaccess?.canDelete) && loggedInUser.userid !== body.userid) throw new LogicError({ status: 403, message: "You are not allowed to delete other user" })
}

const only_superadmin_can_delete_admin_user = ({ loggedInUser, user, body }) => {
    if (user.isadmin && loggedInUser.userid !== body.userid && !loggedInUser.issuperadmin) throw new LogicError({ status: 403, message: "Only superadmin can delete other admin user" })
}

const only_organization_can_delete_superadmin = ({ loggedInUser, user, body }) => {
    if (user.issuperadmin) throw new LogicError({ status: 403, message: "Only organization authorities can delete superadmin" })
}

const delete_user = async (req, res, next) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        UserUtils.user_id_provided(req)
        const userUtils = new UserUtils(req, res)
        const userid = UserUtils.id_decrypt(req.body.userid)
        const user = await only_delete_user_exists(userid)

        const args = {
            loggedInUser: req.loggedinuser,
            user,
            body: { ...req.body, userid }
        }

        only_organization_can_delete_superadmin(args)
        only_superadmin_can_delete_admin_user(args)
        user_can_only_delete_itself(args)
        admin_with_delete_access_can_delete_other_user(args)

        userUtils.set_req_user(user)
        return next()
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
}

module.exports = delete_user 