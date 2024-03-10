const router = require("express").Router()
const User = require("../models/User.model.cjs")
const { LogicError, UserUtils } = require("../utils")

const all_values_must_be_present = ({ body }) => {
    UserUtils.all_user_attritibutes_provided({ isadmin: null, adminaccess: null, ...body })
    if (!body.adminaccess) return true
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
    if (body.password !== user.password) return 'password'
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
    try {
        const user = req.body.user
        const body = req.body
        const userUtils = new UserUtils(req, res)

        all_values_must_be_present({ body })
        cancel_all_same({ body, user })

        const updatedUser = await User.updatedUserOne(new User(UserUtils.build_user_attrs(body)))
        const { _id, __v, password: _, adminaccess: __, ...userInfo } = updatedUser._doc

        if (req.loggedinuser.userid !== updatedUser._id) userUtils.set_access_token(updatedUser)

        res.status(200).json({ ...userInfo })

    } catch (err) {
        console.error(err.message)
        if (err.status) return res.status(err.status).json(err.message)
        res.status(500).json(err.message)
    }
})

// //DELETE
// router.delete("/:id", verifyTokenAndAuthorization, async (req, res) => {
//     try {
//         await User.findByIdAndDelete(req.params.id);
//         res.status(200).json("User has been deleted...");
//     } catch (err) {
//         res.status(500).json(err);
//     }
// });

// //GET USER
// router.get("/find/:id", verifyTokenAndAdmin, async (req, res) => {
//     try {
//         const user = await User.findById(req.params.id);
//         const { password, ...others } = user._doc;
//         res.status(200).json(others);
//     } catch (err) {
//         res.status(500).json(err);
//     }
// });

// //GET ALL USER
// router.get("/", verifyTokenAndAdmin, async (req, res) => {
//     const query = req.query.new;
//     try {
//         const users = query
//             ? await User.find().sort({ _id: -1 }).limit(5)
//             : await User.find();
//         res.status(200).json(users);
//     } catch (err) {
//         res.status(500).json(err);
//     }
// });

// //GET USER STATS

// router.get("/stats", verifyTokenAndAdmin, async (req, res) => {
//     const date = new Date();
//     const lastYear = new Date(date.setFullYear(date.getFullYear() - 1));

//     try {
//         const data = await User.aggregate([
//             { $match: { createdAt: { $gte: lastYear } } },
//             {
//                 $project: {
//                     month: { $month: "$createdAt" },
//                 },
//             },
//             {
//                 $group: {
//                     _id: "$month",
//                     total: { $sum: 1 },
//                 },
//             },
//         ]);
//         res.status(200).json(data)
//     } catch (err) {
//         res.status(500).json(err);
//     }
// });

module.exports = router;