const router = require("express").Router()

router.get("/test", (req, res) => {
    return res.send("Hello World")
})

module.exports = router