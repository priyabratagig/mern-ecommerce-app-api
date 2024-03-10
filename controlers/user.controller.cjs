const router = require("express").Router()
const User = require("../models/User.model.cjs")
const { LogicError, UserUtils, HTTPUtils } = require("../utils")
const CryptoJS = require("crypto-js")


const password_update = ({ req, userUtils }) => {
    if (req.body.user.password !== req.body.password) userUtils.use_original_password()
}

const all_upadate_values_must_be_present = ({ body }) => {
    UserUtils.all_user_attritibutes_provided({ isadmin: null, adminaccess: null, ...body })
    if (!body.adminaccess) return true
    if (!(body.adminaccess instanceof Object)) throw new LogicError({ status: 400, message: "Missing or invalid attributes adminaccess" })
    if (typeof body.adminaccess.canCreate !== 'boolean') throw new LogicError({ status: 400, message: "Missing or invalid attributes canCreate" })
    if (typeof body.adminaccess.canRead !== 'boolean') throw new LogicError({ status: 400, message: "Missing or invalid attributes canRead" })
    if (typeof body.adminaccess.canUpdate !== 'boolean') throw new LogicError({ status: 400, message: "Missing or invalid attributes canUpdate" })
    if (typeof body.adminaccess.canDelete !== 'boolean') throw new LogicError({ status: 400, message: "Missing or invalid attributes canDelete" })

    return true
}

const cancel_all_same = ({ user, body }) => {
    if (body.firstname !== user.firstname) return 'firstname'
    if (body.lastname !== user.lastname) return 'lastname'
    if (body.username !== user.username) return 'username'
    if (body.email !== user.email) return 'email'
    if (body.originalpassword) return 'password'
    if (body.isadmin !== user.isadmin) return 'isadmin'
    if ((!body.adminaccess) !== (!user.adminaccess)) return 'adminaccess'
    if (body.adminaccess?.canCreate !== user.adminaccess?.canCreate) return 'adminaccess.canCreate'
    if (body.adminaccess?.canRead !== user.adminaccess?.canRead) return 'adminaccess.canRead'
    if (body.adminaccess?.canUpdate !== user.adminaccess?.canUpdate) return 'adminaccess.canUpdate'
    if (body.adminaccess?.canDelete !== user.adminaccess?.canDelete) return 'adminaccess.canDelete'

    throw new LogicError({ status: 200, message: "Nothing to update" })
}

//UPDATE
router.put("/update", async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const userUtils = new UserUtils(req, res)
        password_update({ req, userUtils })
        const user = req.body.user
        const body = req.body
        const userid = body.userid

        all_upadate_values_must_be_present({ body })
        cancel_all_same({ body, user })

        const updatedUser = await User.updateUser(userid, body)
        const { _id, __v, password: _, adminaccess: __, ...userInfo } = updatedUser._doc
        if (req.loggedinuser.userid === updatedUser._id) userUtils.set_access_token(updatedUser)

        return httpUtils.send_json(200, userInfo)

    } catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

//DELETE
const all_delete_values_must_be_present = ({ body }) => {
    ['userid', 'username', 'email'].forEach((val) => {
        if (!body.hasOwnProperty(val)) throw new LogicError({ status: 400, message: `Missing ${val} attribute` })
    })
}

const username_email_should_match = ({ user, body }) => {
    ['username', 'email'].forEach((val) => {
        if (body[val] !== user[val]) throw new LogicError({ status: 400, message: `${val} mismatch` })
    })
}

router.delete("/delete", async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const userUtils = new UserUtils(req, res)
        const user = req.body.user
        const body = req.body
        const userid = body.userid
        const loggedInUser = req.loggedinuser
        const args = {
            body,
            user
        }
        all_delete_values_must_be_present(args)
        username_email_should_match(args)

        await User.findByIdAndDelete(userid)

        if (loggedInUser.userid === userid) userUtils.delete_access_token()

        return httpUtils.send_message(200, "User deleted successfully")
    } catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

//GET USER
const user_id_provided = ({ body: { userid } }) => {
    if (!userid) throw new LogicError({ status: 400, message: "Missing userid" })

    return UserUtils.id_decrypt(userid)
}

const none_can_view_other = ({ user, loggedInUser }) => {
    if (String(user._id) !== loggedInUser.userid) throw new LogicError({ status: 400, message: "Unauthorized" })
}

router.get("/find", async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const userid = user_id_provided(req)
        const user = await UserUtils.user_exists({ userid })

        none_can_view_other({ user, loggedInUser: req.loggedinuser })

        const { _id, __v, password, ...userInfo } = user._doc
        userInfo.userid = UserUtils.id_encrypt(_id)

        return httpUtils.send_json(200, userInfo)
    } catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

//GET ALL USER
const get_query = ({ loggedInUser }) => {
    if (!loggedInUser.isadmin) throw new LogicError({ status: 403, message: "Unauthorized" })

    if (!loggedInUser.issuperadmin) return { issuperadmin: { $eq: false } }

    return {}
}

router.get("/find-all", async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const pageSize = req.body.pagesize || 10
        const page = req.body.page || 1
        const loggedInUser = req.loggedinuser
        const query = get_query({ loggedInUser })

        const skip = pageSize * (page - 1)
        const limit = pageSize

        const result = await User.aggregate([
            { $match: query },
            {
                $project: {
                    __v: 0,
                    password: 0,
                },
            },
            {
                $facet: {
                    metadata: [{ $count: 'total' }],
                    users: [{ $skip: skip }, { $limit: limit }],
                },
            },
            {
                $addFields: {
                    'metadata.count': { $size: '$users' },
                },
            },
        ])

        result[0].users.forEach(user => {
            user.userid = UserUtils.id_encrypt(user._id)
            delete user._id
        })

        return httpUtils.send_json(200, result[0])
    } catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

//GET USER STATS
router.get("/stats", async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const query = get_query({ loggedInUser: req.loggedinuser })

        const date = new Date()
        const lastYear = new Date(date.setFullYear(date.getFullYear() - 1))

        query.createdAt = { $gte: lastYear }

        const result = await User.aggregate([
            { $match: query },
            {
                $project: {
                    month: { $month: "$createdAt" },
                },
            },
            {
                $group: {
                    _id: "$month",
                    total: { $sum: 1 },
                },
            }
        ])

        result[0].users = result[0]._id
        delete result[0]._id

        return httpUtils.send_json(200, result[0])
    } catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

module.exports = router