const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    default: null
  },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profilePicture: {
    url:      { type: String, default: '' },
    publicId: { type: String, default: '' },
  },
  certificates: [
    {
      name: { type: String, required: true },   // e.g. "Chit Fund License", "GST Certificate"
      url: { type: String, required: true },
      publicId: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now },
    }
  ],
  role: {
    type: String,
    enum: ['super_admin', 'tenant_admin'],
    default: 'tenant_admin'
  }
}, { timestamps: true });

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);