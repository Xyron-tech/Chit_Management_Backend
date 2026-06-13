const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    subdomain: { type: String, required: true, unique: true },
    plan: {
        type: String,
        enum: ['trial', 'monthly', 'yearly'],
        default: 'trial'
    },
    planExpiry: { type: Date },
    isActive: { type: Boolean, default: true },
    isTrial: { type: Boolean, default: true },
    trialEndsAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Tenant', tenantSchema);