const router = require("express").Router()
const User = require("../models/User.model.cjs")
const { LogicError, UserUtils, HTTPUtils } = require("../utils")

//REGISTER
router.post("/register", async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const userUtils = new UserUtils(req, res)
        userUtils.use_original_password()
        UserUtils.all_user_attritibutes_provided({ userid: null, isadmin: null, adminaccess: null, ...req.body })

        const newUser = new User(UserUtils.build_user_attrs(req.body))

        const savedUser = await newUser.save()
        const { _id, __v, password, adminaccess, ...userInfo } = savedUser._doc

        return httpUtils.send_json(200, userInfo)
    } catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

//LOGIN
const all_login_credentials_provided = (body) => {
    if (!body.username && !body.email) throw new LogicError({ status: 400, message: "Missing Username or Email" })
    if (!body.originalpassword) throw new LogicError({ status: 400, message: "Missing Password" })
}

const passs_should_match = (user, password) => {
    if (user.originalpassword !== password) throw new LogicError({ status: 400, message: "Wrong Password" })
}

router.post('/login', async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const userUtils = new UserUtils(req, res)
        userUtils.use_original_password()
        all_login_credentials_provided(req.body)
        const user = await UserUtils.user_exists({ username: req.body.username, email: req.body.email })

        passs_should_match(user, req.body.originalpassword)

        userUtils.set_access_token(user)
        const { _id, __v, password, adminaccess, ...userInfo } = user._doc

        return httpUtils.send_json(200, { userid: UserUtils.id_encrypt(_id), userInfo })

    } catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

//LOGOUT
router.get('/logout', (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    const userUtils = new UserUtils(req, res)
    userUtils.delete_access_token()

    return httpUtils.send_json(200, "Logged out successfully")
})

// FORGOT PASSWORD
const all_forgot_credentials_provided = (body) => {
    ['username', 'email'].forEach(credential => {
        if (!body.hasOwnProperty(credential)) throw new LogicError({ status: 400, message: `Missing ${credential} attribute` })
    })
}

const email_should_match = (user, email) => {
    if (user.email !== email.toLowerCase()) throw new LogicError({ status: 400, message: "Wrong Email" })
}

router.post('/forgot-password', async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    try {
        const userUtils = new UserUtils(req, res)
        all_forgot_credentials_provided(req.body)
        const username = req.body.username
        const email = req.body.email

        const user = await UserUtils.user_exists({ username, email })

        email_should_match(user, email)

        userUtils.set_reset_token(user)

        return httpUtils.send_message(200, "OTP sent to your email")
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

const all_reset_credentials_provided = (body) => {
    ['otp', 'username', 'originalpassword'].forEach(credential => {
        if (!body.hasOwnProperty(credential)) throw new LogicError({ status: 400, message: `Missing ${credential} attribute` })
    })
}

const username_should_match = (username, reset_password_token) => {
    if (username !== reset_password_token.username) throw new LogicError({ status: 400, message: "Invalid User" })
}

const otp_should_match = (otp, reset_password_token) => {
    if (otp != reset_password_token.otp) throw new LogicError({ status: 400, message: "Invalid OTP" })
}

// VERIFY OTP
router.post('/reset-password', async (req, res) => {
    const httpUtils = new HTTPUtils(req, res)
    const userUtils = new UserUtils(req, res)
    try {
        userUtils.use_original_password()
        all_reset_credentials_provided(req.body)
        const otp = req.body.otp
        const username = req.body.username
        const password = req.body.originalpassword

        const reset_password_token = userUtils.get_reset_token()
        username_should_match(username, reset_password_token)
        otp_should_match(otp, reset_password_token)

        const user = await UserUtils.user_exists({ username })

        await User.updateUser(user._id, { originalpassword: password })

        userUtils.delete_reset_token()
        return httpUtils.send_message(200, "Password changed successfully")

    }
    catch (err) {
        console.error(err.message)
        userUtils.delete_reset_token()
        if (err.status) return httpUtils.send_message(err.status, err.message)
        return httpUtils.send_message(500, err.message)
    }
})

module.exports = router