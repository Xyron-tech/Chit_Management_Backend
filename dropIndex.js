const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require("dns");
dotenv.config();



const run = async () => {
  try {
     dns.setServers(["8.8.8.8", "8.8.4.4"]);
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('Connected ✅');

    const result = await mongoose.connection.db
      .collection('users')
      .dropIndex('phone_1');

    console.log('Index dropped ✅', result);
    process.exit();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

run();