const dev = process.env.NODE_ENV !== 'production'
require('dotenv').config(dev ? { path: '.env.dev' } : { path: '.env' })

const MONGODB_USER = process.env.MONGODB_USER
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD
const MONGODB_CLUSTER = process.env.MONGODB_CLUSTER
const MONGODB_DBNAMNE = process.env.MONGODB_DBNAMNE
const MONGODB_HOST = process.env.MONGODB_HOST
const MONGODB_PORT = parseInt(process.env.MONGODB_PORT)
const MONGODB_URI = dev ?
    `mongodb://${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DBNAMNE}?retryWrites=true&w=majority` :
    `mongodb+srv://${MONGODB_USER}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}.mongodb.net/${MONGODB_DBNAMNE}?retryWrites=true&w=majority`

const SEVER_IP = require('ip').address()
const SERVER_PORT = parseInt(process.env.SERVER_PORT)
const API_VERSION = process.env.API_VERSION

module.exports = {
    MONGODB_URI,
    MONGODB_CLUSTER,
    MONGODB_PORT,
    MONGODB_DBNAMNE,
    SERVER_PORT,
    SEVER_IP,
    API_VERSION,
}