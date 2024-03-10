const router = require("express").Router()
const User = require("../models/User.model.cjs")
const { LogicError, UserUtils } = require("../utils")

//REGISTER
router.post("/register", async (req, res) => {
    try {
        const userUtils = new UserUtils(req, res)
        userUtils.use_original_password()
        UserUtils.all_user_attritibutes_provided({ userid: null, isadmin: null, adminaccess: null, ...req.body })

        const newUser = new User(UserUtils.build_user_attrs(req.body))

        const savedUser = await newUser.save()
        const { _id, __v, password, adminaccess, ...userInfo } = savedUser._doc
        return res.status(201).json(userInfo)

    } catch (err) {
        console.error(err.message)
        if (err.status) return res.status(err.status).json(err.message)
        return res.status(500).json(err.message)
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
    try {
        const userUtils = new UserUtils(req, res)
        userUtils.use_original_password()
        all_login_credentials_provided(req.body)
        const user = await UserUtils.user_exists({ username: req.body.username, email: req.body.email })

        passs_should_match(user, req.body.originalpassword)

        userUtils.set_access_token(user)
        const { _id, __v, password, adminaccess, ...userInfo } = user._doc
        return res.json(userInfo)

    } catch (err) {
        console.error(err.message)
        if (err.status) return res.status(err.status).json(err.message)
        return res.status(500).json(err.message)
    }
})

//LOGOUT
router.get('/logout', (req, res) => {
    res.status(200).clearCookie('access_token').json({ message: "Successfully logged out" })
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
    try {
        const userUtils = new UserUtils(req, res)
        all_forgot_credentials_provided(req.body)
        const username = req.body.username
        const email = req.body.email

        const user = await UserUtils.user_exists({ username, email })

        email_should_match(user, email)

        userUtils.set_reset_token(user)
        res.status(200).json({ message: "OTP sent successfully" })
    }
    catch (err) {
        console.error(err.message)
        if (err.status) return res.status(err.status).json(err.message)
        return res.status(500).json(err.message)
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

        userUtils.clear_reset_token()
        res.status(200).json({ message: "Password changed successfully" })

    }
    catch (err) {
        console.error(err.message)
        userUtils.clear_reset_token()
        if (err.status) return res.status(err.status).json(err.message)
        return res.status(500).json(err.message)
    }
})

module.exports = router