const mongoose = require('mongoose');
const dns = require("dns");

const connectDB = async () => {
    if (process.env.NODE_ENV !== "production") {
        dns.setServers(["8.8.8.8", "8.8.4.4"]);
    }
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            family: 4
        });
        console.log('MongoDB Connected ✅');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

module.exports = connectDB;