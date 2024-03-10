const CryptoJS = require("crypto-js")
const jwt = require("jsonwebtoken")
const User = require('../models/User.model.cjs')
const LogicError = require("./LogicError.cjs")

class UserUtils {
    constructor(req, res, next = undefined) {
        this.req = req
        this.res = res
        this.next = next
    }

    static id_encrypt(id) {
        return CryptoJS.AES.encrypt(String(id), process.env.ID_SECRET).toString()
    }

    static id_decrypt(id) {
        return CryptoJS.AES.decrypt(String(id), process.env.ID_SECRET).toString(CryptoJS.enc.Utf8)
    }

    static build_user_attrs(body) {
        return {
            firstname: body.firstname,
            lastname: body.lastname,
            username: body.username,
            email: body.email,
            password: body.password,
            originalpassword: body.originalpassword,
            isadmin: body.isadmin,
            adminaccess: body.adminaccess && {
                canCreate: body.adminaccess.canCreate,
                canRead: body.adminaccess.canRead,
                canUpdate: body.adminaccess.canUpdate,
                canDelete: body.adminaccess.canDelete
            } || null
        }
    }

    static async user_exists({ userid, username, email }) {
        if (userid) {
            const user = await User.findById(userid)
            if (!user) throw new Error("User does not exist")

            return user
        }

        if (username) {
            const user = await User.findOne({ $where: `this.username == "${username}"` })
            if (!user) throw new Error("User does not exist")

            return user
        }

        if (email) {
            const user = await User.findOne({ $where: `this.email == "${email}"` })
            if (!user) throw new Error("User does not exist")

            return user
        }

        throw new Error("No attribute provided")
    }

    static all_user_attritibutes_provided(doc = {}) {
        if (!doc.password && !doc.originalpassword) throw new Error(`Missing password attribute`)
        ['firstname', 'lastname', 'username', 'email', 'isadmin', 'adminaccess'].forEach(attr => {
            if (!doc.hasOwnProperty(attr)) throw new Error(`Missing ${attr} attribute`)
        })

        return true
    }

    use_original_password() {
        this.req.body.originalpassword = this.req.body.password
        delete this.req.body.password
    }

    set_access_token(user) {
        const access_token = jwt.sign({
            userid: String(user._id),
            issuperadmin: user.issuperadmin,
            isadmin: user.isadmin,
            adminaccess: user.adminaccess && {
                canCreate: user.adminaccess.canCreate,
                canRead: user.adminaccess.canRead,
                canUpdate: user.adminaccess.canUpdate,
                canDelete: user.adminaccess.canDelete
            } || null
        }, process.env.TOKEN_SECRET, {
            expiresIn: process.env.TOKEN_EXPIRY
        })

        return this.res.cookie("access_token", access_token, { signed: true, maxAge: process.env.COOKIE_EXPIRY })
    }

    get_access_token() {
        if (!this.req.signedCookies.access_token) throw new LogicError({ status: 401, message: "Unauthorized access" })

        return jwt.verify(this.req.signedCookies.access_token, process.env.TOKEN_SECRET, (err, token) => {
            if (err) throw new LogicError({ status: 400, message: err.message })

            return {
                userid: String(token.userid),
                issuperadmin: token.issuperadmin,
                isadmin: token.isadmin,
                adminaccess: token.adminaccess && {
                    canCreate: token.adminaccess.canCreate,
                    canRead: token.adminaccess.canRead,
                    canUpdate: token.adminaccess.canUpdate,
                    canDelete: token.adminaccess.canDelete
                } || null
            }
        })
    }

    set_reset_token(user) {
        const otp = Math.floor(100000 + Math.random() * 900000)
        console.log(otp)

        const reset_password_token = jwt.sign({
            id: String(user._id),
            username: user.username,
            otp
        }, process.env.TOKEN_SECRET, {
            expiresIn: "5m"
        })

        return this.res.cookie('password_reset', reset_password_token, { signed: true })
    }

    delete_access_token() {
        return this.res.clearCookie("access_token")
    }

    get_reset_token() {
        if (!this.req.signedCookies.password_reset) throw new LogicError({ status: 401, message: "Unauthorized access" })

        return jwt.verify(this.req.signedCookies.password_reset, process.env.TOKEN_SECRET, (err, token) => {
            if (err) throw new LogicError({ status: 400, message: err.message })

            return {
                id: String(token.id),
                username: token.username,
                otp: token.otp
            }
        })
    }

    delete_reset_token() {
        return this.res.clearCookie('password_reset')
    }
}

module.exports = UserUtils