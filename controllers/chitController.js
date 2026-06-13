const Chit = require('../models/Chit');

const generatePayments = (installmentAmount, commission, memberCount, startDate, totalMonths) => {
  const commissionAmt = (installmentAmount * commission) / 100;
  const totalMonthly  = installmentAmount + commissionAmt;
  const perMember     = totalMonthly / memberCount;

  const payments = [];
  for (let i = 0; i < totalMonths; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    payments.push({
      month: i + 1,
      dueDate,
      amount: perMember,
      status: 'pending',
      paidAt: null
    });
  }
  return payments;
};

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

    res.status(201).json({ message: 'Chit created ', chit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get All Chits
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

// Get Single Chit
const getChit = async (req, res) => {
  try {
    const chit = await Chit.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });
    if (!chit) return res.status(404).json({ message: 'Chit not found' });
    res.json(chit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update Chit
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

// Delete Chit
const deleteChit = async (req, res) => {
  try {
    await Chit.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });
    res.json({ message: 'Chit deleted ✅' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add Member
const addMember = async (req, res) => {
  try {
    const chit = await Chit.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });
    if (!chit) return res.status(404).json({ message: 'Chit not found' });

    if (chit.members.length >= chit.memberCount)
      return res.status(400).json({ message: 'Member limit reached' });

    const { memberName, phone } = req.body;

    const payments = generatePayments(
      chit.installmentAmount,
      chit.commission,
      chit.memberCount,
      new Date(chit.startDate),
      chit.totalMonths
    );

    chit.members.push({ memberName, phone, payments });
    await chit.save();

    res.status(201).json({ message: 'Member added ✅', chit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update Member
const updateMember = async (req, res) => {
  try {
    const chit = await Chit.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });
    if (!chit) return res.status(404).json({ message: 'Chit not found' });

    const member = chit.members.id(req.params.memberId);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const { memberName, phone } = req.body; // ✅ ticketNumber remove
    if (memberName) member.memberName = memberName;
    if (phone) member.phone = phone;

    await chit.save();
    res.json({ message: 'Member updated ✅', member });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete Member
const deleteMember = async (req, res) => {
  try {
    const chit = await Chit.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });
    if (!chit) return res.status(404).json({ message: 'Chit not found' });

    chit.members.pull({ _id: req.params.memberId });
    await chit.save();

    res.json({ message: 'Member deleted ✅' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Mark Payment
const markPayment = async (req, res) => {
  try {
    const chit = await Chit.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });
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

module.exports = {
  createChit, getAllChits, getChit,
  updateChit, deleteChit,
  addMember, updateMember, deleteMember,
  markPayment
};