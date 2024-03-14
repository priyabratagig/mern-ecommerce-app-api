const { MONGODB_URI, MONGODB_CLUSTER, MONGODB_PORT, MONGODB_DBNAMNE, SERVER_PORT, SEVER_IP, API_VERSION } = require('./configs.cjs')
const express = require('express')
const mongoose = require('mongoose')
const cookie_parser = require('cookie-parser')
const https = require('https')
const path = require('path')
const fs = require('fs')

const print_route = require('./middlewares/print-route.cjs')
const HTTPS_secure = require('./middlewares/HTTPS-secure.cjs')
const authenticate = require('./middlewares/authenticate.cjs')
const access_controls = require('./middlewares/access-controls')

const auth = require('./controlers/auth.controller.cjs')
const user = require('./controlers/user.controller.cjs')
const product = require('./controlers/product.controller.cjs')

const app = express()
app.use(cookie_parser(process.env.COOKIE_SECRET, { httpOnly: true, secure: true, signed: true }))
app.use(express.json())
app.use(print_route)
app.use(HTTPS_secure)
app.use(authenticate)
app.use(access_controls)
app.use(`/api/${API_VERSION}/auth`, auth)
app.use(`/api/${API_VERSION}/user`, user)
app.use(`/api/${API_VERSION}/product`, product)

try {
    const sslServer = https.createServer({
        key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem'))
    }, app)

    sslServer.listen(SERVER_PORT, () => {
        console.log(`Server is running on port ${SERVER_PORT}`)
        console.log(`local: https://localhost:${SERVER_PORT}`)
        console.log(`public: https://${SEVER_IP}:${SERVER_PORT}`)
    })

    mongoose.connect(MONGODB_URI)
        .then(() => {
            if (process.env.NODE_ENV !== 'production') console.log(`Connected to MongoDB on port ${MONGODB_PORT} db ${MONGODB_DBNAMNE}`)
            else console.log(`Connected to MongoDB on ${MONGODB_CLUSTER} db ${MONGODB_DBNAMNE}`)
        })
        .catch((err) => {
            console.error(err.message)
        })
} catch (err) {
    console.error(err.message)
}


