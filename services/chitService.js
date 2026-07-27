const Chit = require('../models/Chit');
const ApiError = require('../utils/Apierror');
const cloudinary = require('../config/cloudinary');

// ============================================
// Helpers
// ============================================

const findChitOrThrow = async (id, tenantId) => {
  const chit = await Chit.findOne({ _id: id, tenantId });
  if (!chit) throw new ApiError(404, 'Chit not found');
  return chit;
};

const findMemberOrThrow = (chit, memberId) => {
  const member = chit.members.id(memberId);
  if (!member) throw new ApiError(404, 'Member not found');
  return member;
};

// Generate initial payments when a member is added
const generatePayments = (chit) => {
  const { chitType, installmentAmount, chitAmount, commission, memberCount, startDate, totalMonths } = chit;
  const payments = [];

  const buildSchedule = (amountPerMonth) => {
    for (let i = 0; i < totalMonths; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      payments.push({ month: i + 1, dueDate, amount: amountPerMonth, status: 'pending', paidAt: null });
    }
  };

  if (chitType === 'auction') {
    // Auction logic — fixed formula every month
    const commissionAmt = (installmentAmount * commission) / 100;
    const totalMonthly = installmentAmount + commissionAmt;
    buildSchedule(totalMonthly / memberCount);
  } else {
    // Tallu logic — effective amount (after commission) ÷ totalMonths as default
    const effectiveAmount = chitAmount - (chitAmount * commission) / 100;
    buildSchedule(effectiveAmount / totalMonths);
  }

  return payments;
};

// ============================================
// Chit CRUD
// ============================================

const createChit = async (tenantId, data, file) => {
  const {
    chitName, chitType, memberCount,
    chitAmount, installmentAmount,
    commission, chitDate, totalMonths,
    startDate, endDate
  } = data;

  const chitData = {
    tenantId, chitName, chitType, memberCount,
    chitAmount, installmentAmount,
    commission, chitDate, totalMonths,
    startDate, endDate
  };

  if (file) {
    chitData.image = { url: file.path, publicId: file.filename };
  }

  return Chit.create(chitData);
};

const getAllChits = (tenantId) => {
  return Chit.find({ tenantId }).select('-members').sort({ createdAt: -1 });
};

const getChit = (id, tenantId) => findChitOrThrow(id, tenantId);

const updateChit = async (id, tenantId, data, file) => {
  const chit = await findChitOrThrow(id, tenantId);

  // removeImage isn't a schema field — pull it out before assigning the rest
  const { removeImage, ...rest } = data;

  Object.assign(chit, rest);

  // Photo — a new file replaces the old one; removeImage clears it; neither leaves it untouched
  if (file) {
    if (chit.image?.publicId) {
      await cloudinary.uploader.destroy(chit.image.publicId);
    }
    chit.image = { url: file.path, publicId: file.filename };
  } else if (removeImage === true || removeImage === 'true') {
    if (chit.image?.publicId) {
      await cloudinary.uploader.destroy(chit.image.publicId);
    }
    chit.image = { url: '', publicId: '' };
  }

  await chit.save();
  return chit;
};

const deleteChit = async (id, tenantId) => {
  const chit = await findChitOrThrow(id, tenantId);

  // Clean up the chit's own cover photo
  if (chit.image?.publicId) {
    await cloudinary.uploader.destroy(chit.image.publicId);
  }

  // Clean up every member's photo too, since the whole chit is going away
  await Promise.all(
    chit.members
      .filter((m) => m.photo?.publicId)
      .map((m) => cloudinary.uploader.destroy(m.photo.publicId))
  );

  await Chit.findOneAndDelete({ _id: id, tenantId });
};

// ============================================
// Members
// ============================================

const addMember = async (id, tenantId, { memberName, phone }, file) => {
  const chit = await findChitOrThrow(id, tenantId);

  if (chit.members.length >= chit.memberCount) {
    throw new ApiError(400, 'Member limit reached');
  }

  const payments = generatePayments(chit);
  const newMember = { memberName, phone, payments };

  if (file) {
    newMember.photo = { url: file.path, publicId: file.filename };
  }

  chit.members.push(newMember);
  await chit.save();

  return chit;
};

const updateMember = async (id, tenantId, memberId, { memberName, phone, month, prized, removePhoto }, file) => {
  const chit = await findChitOrThrow(id, tenantId);
  const member = findMemberOrThrow(chit, memberId);

  if (memberName) member.memberName = memberName;
  if (phone) member.phone = phone;

  // Ensure prizedMonth is always an array (fixes old docs where it was null)
  if (!Array.isArray(member.prizedMonth)) {
    member.prizedMonth = [];
  }

  if (month !== undefined && prized !== undefined) {
    if (prized) {
      const alreadyTaken = chit.members.find(
        (m) => m._id.toString() !== member._id.toString() &&
               Array.isArray(m.prizedMonth) &&
               m.prizedMonth.includes(month)
      );

      if (alreadyTaken) {
        throw new ApiError(400, `Month ${month} is already prized by ${alreadyTaken.memberName}`);
      }

      if (!member.prizedMonth.includes(month)) member.prizedMonth.push(month);
    } else {
      member.prizedMonth = member.prizedMonth.filter((m) => m !== month);
    }
  }

  // Photo — a new file replaces the old one; removePhoto clears it; neither leaves it untouched
  if (file) {
    if (member.photo?.publicId) {
      await cloudinary.uploader.destroy(member.photo.publicId);
    }
    member.photo = { url: file.path, publicId: file.filename };
  } else if (removePhoto) {
    if (member.photo?.publicId) {
      await cloudinary.uploader.destroy(member.photo.publicId);
    }
    member.photo = { url: '', publicId: '' };
  }

  await chit.save();
  return member;
};

const deleteMember = async (id, tenantId, memberId) => {
  const chit = await findChitOrThrow(id, tenantId);
  chit.members.pull({ _id: memberId });
  await chit.save();
};

// ============================================
// Payments
// ============================================

const markPayment = async (id, tenantId, memberId, paymentId) => {
  const chit = await findChitOrThrow(id, tenantId);
  const member = findMemberOrThrow(chit, memberId);

  const payment = member.payments.id(paymentId);
  if (!payment) throw new ApiError(404, 'Payment not found');

  payment.status = payment.status === 'paid' ? 'pending' : 'paid';
  payment.paidAt = payment.status === 'paid' ? new Date() : null;

  await chit.save();
  return payment;
};

const markAllPaid = async (id, tenantId, month) => {
  const chit = await findChitOrThrow(id, tenantId);

  chit.members.forEach((member) => {
    const payment = member.payments.find((p) => p.month === month);
    if (payment && payment.status === 'pending') {
      payment.status = 'paid';
      payment.paidAt = new Date();
    }
  });

  await chit.save();
  return chit;
};

// Edits the amount for ALL members for the given month, then auto-recalculates
// ALL future months equally based on remaining balance ÷ remaining months.
// Tallu chits only.
const updatePaymentAmount = async (id, tenantId, month, amount) => {
  const chit = await findChitOrThrow(id, tenantId);

  if (chit.chitType !== 'tallu') {
    throw new ApiError(400, 'Amount edit is only allowed for Tallu chits');
  }

  const totalMonths = chit.totalMonths;

  // Step 1 — Set the edited month's amount for ALL members
  chit.members.forEach((member) => {
    const payment = member.payments.find((p) => p.month === month);
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
      const p = referenceMember.payments.find((pay) => pay.month === m);
      if (p) collectedSoFar += p.amount;
    }

    const remainingBalance = effectiveAmount - collectedSoFar;
    const remainingMonths = totalMonths - month;

    if (remainingMonths > 0) {
      const newMonthlyAmount = remainingBalance / remainingMonths;

      // Step 4 — Apply the new amount to ALL future months for ALL members
      chit.members.forEach((member) => {
        for (let m = month + 1; m <= totalMonths; m++) {
          const payment = member.payments.find((p) => p.month === m);
          if (payment) payment.amount = newMonthlyAmount;
        }
      });
    }
  }

  await chit.save();
  return chit;
};

module.exports = {
  createChit, getAllChits, getChit,
  updateChit, deleteChit,
  addMember, updateMember, deleteMember,
  markPayment, markAllPaid, updatePaymentAmount,
};