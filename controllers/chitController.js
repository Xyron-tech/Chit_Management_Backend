const Chit = require('../models/Chit');

// ============================================
// Generate initial payments when a member is added
// ============================================
const generatePayments = (chit) => {
  const { chitType, installmentAmount, chitAmount, commission, memberCount, startDate, totalMonths } = chit;
  const payments = [];

  if (chitType === 'auction') {
    // Auction logic — fixed formula every month
    const commissionAmt = (installmentAmount * commission) / 100;
    const totalMonthly  = installmentAmount + commissionAmt;
    const perMember      = totalMonthly / memberCount;

    for (let i = 0; i < totalMonths; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      payments.push({ month: i + 1, dueDate, amount: perMember, status: 'pending', paidAt: null });
    }
  } else {
    // Tallu logic — effective amount (after commission) ÷ totalMonths as default
    const effectiveAmount = chitAmount - (chitAmount * commission) / 100;
    const defaultMonthly  = effectiveAmount / totalMonths;

    for (let i = 0; i < totalMonths; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      payments.push({ month: i + 1, dueDate, amount: defaultMonthly, status: 'pending', paidAt: null });
    }
  }

  return payments;
};

// ============================================
// Create Chit
// ============================================
const createChit = async (req, res) => {
  try {
    const {
      chitName, chitType, memberCount,
      chitAmount, installmentAmount,
      commission, chitDate, totalMonths,
      startDate, endDate
    } = req.body;

    const chit = await Chit.create({
      tenantId: req.user.tenantId,
      chitName, chitType, memberCount,
      chitAmount, installmentAmount,
      commission, chitDate, totalMonths,
      startDate, endDate
    });

    res.status(201).json({ message: 'Chit created ✅', chit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================================
// Get All Chits (without members for list view)
// ============================================
const getAllChits = async (req, res) => {
  try {
    const chits = await Chit.find({ tenantId: req.user.tenantId })
      .select('-members')
      .sort({ createdAt: -1 });
    res.json(chits);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================================
// Get Single Chit (with members + payments)
// ============================================
const getChit = async (req, res) => {
  try {
    const chit = await Chit.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!chit) return res.status(404).json({ message: 'Chit not found' });
    res.json(chit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================================
// Update Chit (basic fields)
// ============================================
const updateChit = async (req, res) => {
  try {
    const chit = await Chit.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      req.body,
      { new: true }
    );
    if (!chit) return res.status(404).json({ message: 'Chit not found' });
    res.json({ message: 'Chit updated ✅', chit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================================
// Delete Chit
// ============================================
const deleteChit = async (req, res) => {
  try {
    await Chit.findOneAndDelete({ _id: req.params.id, tenantId: req.user.tenantId });
    res.json({ message: 'Chit deleted ✅' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================================
// Add Member to Chit
// ============================================
const addMember = async (req, res) => {
  try {
    const chit = await Chit.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!chit) return res.status(404).json({ message: 'Chit not found' });

    if (chit.members.length >= chit.memberCount)
      return res.status(400).json({ message: 'Member limit reached' });

    const { memberName, phone } = req.body;
    const payments = generatePayments(chit);

    chit.members.push({ memberName, phone, payments });
    await chit.save();

    res.status(201).json({ message: 'Member added ✅', chit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================================
// Update Member (name/phone only)
// ============================================
const updateMember = async (req, res) => {
  try {
    const chit = await Chit.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!chit) return res.status(404).json({ message: 'Chit not found' });

    const member = chit.members.id(req.params.memberId);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const { memberName, phone, month, prized } = req.body;

    if (memberName) member.memberName = memberName;
    if (phone) member.phone = phone;

    if (month !== undefined && prized !== undefined) {
      if (prized) {
        // Check if another member already has this month prized
        const alreadyTaken = chit.members.find(
          m => m._id.toString() !== member._id.toString() && m.prizedMonth.includes(month)
        );

        if (alreadyTaken) {
          return res.status(400).json({
            message: `Month ${month} is already prized by ${alreadyTaken.memberName}`
          });
        }

        if (!member.prizedMonth.includes(month)) member.prizedMonth.push(month);
      } else {
        member.prizedMonth = member.prizedMonth.filter(m => m !== month);
      }
    }

    await chit.save();
    res.json({ message: 'Member updated ✅', member });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================================
// Delete Member
// ============================================
const deleteMember = async (req, res) => {
  try {
    const chit = await Chit.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!chit) return res.status(404).json({ message: 'Chit not found' });

    chit.members.pull({ _id: req.params.memberId });
    await chit.save();

    res.json({ message: 'Member deleted ✅' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================================
// Mark Payment Paid / Pending (toggle)
// ============================================
const markPayment = async (req, res) => {
  try {
    const chit = await Chit.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!chit) return res.status(404).json({ message: 'Chit not found' });

    const member = chit.members.id(req.params.memberId);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const payment = member.payments.id(req.params.paymentId);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    payment.status = payment.status === 'paid' ? 'pending' : 'paid';
    payment.paidAt = payment.status === 'paid' ? new Date() : null;

    await chit.save();
    res.json({ message: `Payment marked ${payment.status} ✅`, payment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================================
// Mark All Paid for a given month
// ============================================
const markAllPaid = async (req, res) => {
  try {
    const month = parseInt(req.params.month);
    const chit = await Chit.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!chit) return res.status(404).json({ message: 'Chit not found' });

    chit.members.forEach(member => {
      const payment = member.payments.find(p => p.month === month);
      if (payment && payment.status === 'pending') {
        payment.status = 'paid';
        payment.paidAt = new Date();
      }
    });

    await chit.save();
    res.json({ message: `All members marked paid for Month ${month} ✅`, chit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================================
// Update Payment Amount (Tallu chit only)
// Edits the amount for ALL members for the given month,
// then auto-recalculates ALL future months equally
// based on remaining balance ÷ remaining months.
// ============================================
const updatePaymentAmount = async (req, res) => {
  try {
    const { amount } = req.body;
    const month = parseInt(req.params.month);

    const chit = await Chit.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!chit) return res.status(404).json({ message: 'Chit not found' });

    if (chit.chitType !== 'tallu') {
      return res.status(400).json({ message: 'Amount edit is only allowed for Tallu chits' });
    }

    const totalMonths = chit.totalMonths;

    // Step 1 — Set the edited month's amount for ALL members
    chit.members.forEach(member => {
      const payment = member.payments.find(p => p.month === month);
      if (payment) payment.amount = amount;
    });

    // Step 2 — Effective amount after commission deduction
    const effectiveAmount = chit.chitAmount - (chit.chitAmount * chit.commission) / 100;

    // Step 3 — Collected so far (months 1 → edited month), using first member as reference
    // (all members always carry identical amounts since this is a shared Tallu chit)
    const referenceMember = chit.members[0];

    if (referenceMember) {
      let collectedSoFar = 0;
      for (let m = 1; m <= month; m++) {
        const p = referenceMember.payments.find(pay => pay.month === m);
        if (p) collectedSoFar += p.amount;
      }

      const remainingBalance = effectiveAmount - collectedSoFar;
      const remainingMonths  = totalMonths - month; // e.g. 20 - 1 = 19

      if (remainingMonths > 0) {
        const newMonthlyAmount = remainingBalance / remainingMonths;

        // Step 4 — Apply the new amount to ALL future months for ALL members
        chit.members.forEach(member => {
          for (let m = month + 1; m <= totalMonths; m++) {
            const payment = member.payments.find(p => p.month === m);
            if (payment) payment.amount = newMonthlyAmount;
          }
        });
      }
    }

    await chit.save();
    res.json({ message: 'Amount updated & future months recalculated ✅', chit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createChit, getAllChits, getChit,
  updateChit, deleteChit,
  addMember, updateMember, deleteMember,
  markPayment, markAllPaid, updatePaymentAmount
};