const mongoose = require('mongoose')

const AdminAccessSchema = new mongoose.Schema(
    {
        canCreate: { type: Boolean, default: false },
        canRead: { type: Boolean, default: true },
        canUpdate: { type: Boolean, default: false },
        canDelete: { type: Boolean, default: false },
    }
)

const UserSchema = new mongoose.Schema(
    {
        username: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        isAdmin: { type: Boolean, default: false, },
        adminaccess: {
            type: AdminAccessSchema,
            default: {},
            validate: {
                validator(adminaccess) {
                    if (!this.isAdmin) return true
                    if (typeof adminaccess !== 'object') return false
                    if (adminaccess.canRead !== true) return false
                    return true
                },
                message: "Invalid Admin Access"
            }
        }
    },
    { timestamps: true }
)

module.exports = mongoose.model('User', UserSchema)