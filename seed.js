const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

dotenv.config();
connectDB();

const seed = async () => {
  try {
    await User.deleteMany({ role: 'super_admin' });

    // Manual hash
    const hashedPassword = await bcrypt.hash('Xyron@tech', 10);

    await User.create({
      name: 'Super Admin',
      email: 'xyronwebtechnology@gmail.com',
      password: hashedPassword,
      role: 'super_admin',
      tenantId: null
    });

    process.exit();
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
};

seed();