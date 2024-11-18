const mongoose = require("mongoose")
const { generalLogger } = require("../utils/generalLogger")

const connectDB = async() => {
    let url = ""
    if(process.env.NODE_ENV !== undefined && process.env.NODE_ENV.trim() === "development") {
        url = process.env.MONGODB_URI_DEV
    } else {
        url = process.env.MONGODB_URI
    }
    
    try {
        const con = await mongoose.connect(url)
        generalLogger.info(`MongoDB connected successfully: ${con.connection.host}`)
    } catch(error) {
        generalLogger.error("unable to connect to database: are you sure the IP address is whitelisted in the database?\n")
        generalLogger.debug(error)
    }
}

module.exports = connectDB