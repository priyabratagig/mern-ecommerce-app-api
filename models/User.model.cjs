const mongoose = require('mongoose')
const CryptoJS = require("crypto-js")
const uniqueValidator = require('mongoose-unique-validator')
const LogicError = require("../utils/LogicError.cjs")

const AdminAccessSchema = new mongoose.Schema({
    _id: false,
    canCreate: { type: Boolean, default: false },
    canRead: { type: Boolean, default: true },
    canUpdate: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
})

const UserSchema = new mongoose.Schema({
    firstname: {
        type: String, required: [true, "First name is required"], match: [/^[A-Z][A-Za-z\s]{1,30}$/, "First name is invalid"]
    },
    lastname: {
        type: String, required: [true, "Last name is required"], match: [/^[A-Z][A-Za-z\s]{1,30}$/, "Last name is invalid"]
    },
    username: {
        type: String, lowercase: true, required: [true, "Username is required"], index: { unique: true, name: 'username' }, match: [/^[A-Za-z][A-Za-z0-9_]{1,30}$/, "Username is invalid"]
    },
    email: {
        type: String, lowercase: true, required: [true, "Email is required"], unique: true, match: [/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/, "Email is invalid"]
    },
    password: {
        type: String, required: [true, "Password is required"]
    },
    isadmin: { type: Boolean, required: true, default: false },
    adminaccess: { type: AdminAccessSchema || null, default: null },
    issuperadmin: { type: Boolean, required: true, default: false }
}, {
    timestamps: true
})

UserSchema.virtual('fullname').get(function () { return `${this.firstname} ${this.lastname}` })

UserSchema.virtual('originalpassword').get(function () {
    return CryptoJS.AES.decrypt(this.password, process.env.PASSWORD_SECRET).toString(CryptoJS.enc.Utf8)
})

UserSchema.virtual('originalpassword').set(function (password) {
    const passWordRegExp = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/
    if (!passWordRegExp.test(password)) throw new LogicError({ status: 400, message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character" })
    this.password = CryptoJS.AES.encrypt(password, process.env.PASSWORD_SECRET).toString()
})


UserSchema.pre('validate', function (next) {
    if (this.issuperadmin) {
        this.isadmin = true
        this.adminaccess = AdminAccessSchema
    }
    if (this.isadmin) {
        if (this.adminaccess === null) this.adminaccess = AdminAccessSchema
        this.adminaccess.canRead = true
    }
    if (!this.isadmin) {
        this.adminaccess = null
    }

    return next()
})

UserSchema.path('issuperadmin').validate({
    validator(issuperadmin) {
        if (issuperadmin && !this.isadmin) return false
        if (issuperadmin && this.adminaccess === null) return false
        if (issuperadmin && !(this.adminaccess.canCreate && this.adminaccess.canRead && this.adminaccess.canUpdate && this.adminaccess.canDelete)) return false
        return true
    },
    message: props => `${props.value} is not valid`
})

UserSchema.path('isadmin').validate({
    validator(isadmin) {
        if (this.issuperadmin && !isadmin) return false
        return true
    },
    message: props => `${props.value} is not valid`
})

UserSchema.path('adminaccess').validate({
    validator(adminaccess) {
        if (this.isadmin && adminaccess === null) return false
        if (adminaccess && adminaccess.canRead === false) return false
        if (!this.isadmin && adminaccess !== null) return false
        return true
    },
    message: props => `${props.value} is not valid`
})

UserSchema.post(['save', 'findOneAndUpdate'], function (error, doc, next) {
    if (error.name === 'ValidationError') {
        error.message = Object.values(error.errors).map(path => path.message).join('\n')
        return next(error)
    }
    if (error.codeName === 'DuplicateKey') {
        error.message = `${Object.keys(error.keyPattern).join(', ')} already exists`
        return next(error)
    }
    return next()
})

UserSchema.static('updateUser', async function (userid, attrs) {
    const UserModel = mongoose.model('User')
    const user = await UserModel.findOne({ _id: userid })
    let { _id, __v, createdAt, updatedAt, ...userInfo } = user._doc

    if (attrs.hasOwnProperty('originalpassword')) {
        userInfo.originalpassword = attrs.originalpassword
        delete userInfo.password
    }

    ['firstname', 'lastname', 'username', 'email', 'isadmin', 'adminaccess'].forEach(attr => {
        if (attrs.hasOwnProperty(attr)) userInfo[attr] = attrs[attr]
    })

    //prevalidate
    if (userInfo.issuperadmin) {
        userInfo.isadmin = true
        userInfo.adminaccess = {
            canCreate: true,
            canRead: true,
            canUpdate: true,
            canDelete: true
        }
    }
    if (userInfo.isadmin) {
        if (!userInfo.adminaccess) userInfo.adminaccess = {
            canCreate: false,
            canRead: true,
            canUpdate: false,
            canDelete: false
        }
        else {
            const adminaccess = {}
            adminaccess.canCreate = Boolean(userInfo.adminaccess.canCreate)
            adminaccess.canRead = true
            adminaccess.canUpdate = Boolean(userInfo.adminaccess.canUpdate)
            adminaccess.canDelete = Boolean(userInfo.adminaccess.canDelete)
            userInfo.adminaccess = adminaccess
        }
    }
    if (!userInfo.isadmin) userInfo.adminaccess = null

    let updatedUser = new UserModel(userInfo)
    const { _id: _, __v: __, createdAt: ___, updatedAt: ____, ...updatedUserInfo } = updatedUser._doc

    return await UserModel.findOneAndUpdate({ _id: userid }, { $set: updatedUserInfo }, { new: true })
})

UserSchema.plugin(uniqueValidator, { message: '{PATH} already exists.' })

module.exports = mongoose.model('User', UserSchema)