const { MONGODB_URI, MONGODB_CLUSTER, MONGODB_PORT, MONGODB_DBNAMNE, SERVER_PORT, SEVER_IP, API_VERSION } = require('./configs.cjs')
const express = require('express')
const app = express()
const mongoose = require('mongoose')


mongoose.connect(MONGODB_URI)
    .then(() => {
        if (process.env.NODE_ENV !== 'production') console.log(`Connected to MongoDB on port ${MONGODB_PORT} db ${MONGODB_DBNAMNE}`)
        else console.log(`Connected to MongoDB on ${MONGODB_CLUSTER} db ${MONGODB_DBNAMNE}`)
    })
    .catch((err) => {
        console.error(err)
    })


app.listen(SERVER_PORT, () => {
    console.log(`Server is running on port ${SERVER_PORT}`)
    console.log(`local: http://localhost:${SERVER_PORT}`)
    console.log(`public: http://${SEVER_IP}:${SERVER_PORT}`)
})

