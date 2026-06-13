const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  month: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  amount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'paid'], 
    default: 'pending' 
  },
  paidAt: { type: Date, default: null }
});

const memberSchema = new mongoose.Schema({
  memberName: { type: String, required: true },
  phone: { type: String },
  hasPrized: { type: Boolean, default: false },
  prizedMonth: { type: Number, default: null },
  payments: [paymentSchema]
});

const chitSchema = new mongoose.Schema({
  tenantId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Tenant', 
    required: true 
  },
  chitName: { type: String, required: true },
  chitType: { 
    type: String, 
    enum: ['auction', 'tallu'], 
    required: true 
  },
  memberCount: { type: Number, required: true },
  chitAmount: { type: Number, required: true },
  installmentAmount: { type: Number, required: true },
  commission: { type: Number, default: 4 },
  chitDate: { type: Number, required: true },
  totalMonths: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['active', 'completed'], 
    default: 'active' 
  },
  members: [memberSchema]
}, { timestamps: true });

module.exports = mongoose.model('Chit', chitSchema);