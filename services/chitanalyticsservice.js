const Chit = require('../models/Chit');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ============================================================
// Date range + bucket helpers — always scoped to a single calendar month
// ============================================================

// month: 1-12. Defaults to the current month/year if not given or invalid.
const getMonthRange = (month, year) => {
  const now = new Date();
  const y = Number(year) || now.getFullYear();
  const m = Number(month);
  const safeMonth = m >= 1 && m <= 12 ? m : now.getMonth() + 1;

  const start = new Date(y, safeMonth - 1, 1);
  const end = new Date(y, safeMonth, 0, 23, 59, 59); // last day of that month

  return { start, end, month: safeMonth, year: y };
};

// Bucket a date into "Week 1", "Week 2"... within its month
const getWeekBucket = (date) => `Week ${Math.ceil(date.getDate() / 7)}`;

const getOrderedWeekBuckets = (start, end) => {
  const daysInMonth = end.getDate();
  const weekCount = Math.ceil(daysInMonth / 7);
  return Array.from({ length: weekCount }, (_, i) => `Week ${i + 1}`);
};

// ============================================================
// Main service
// ============================================================

const getAnalytics = async (tenantId, rawMonth, rawYear) => {
  const { start, end, month, year } = getMonthRange(rawMonth, rawYear);

  // Flatten member payments within the selected month
  const payments = await Chit.aggregate([
    { $match: { tenantId } },
    { $unwind: '$members' },
    { $unwind: '$members.payments' },
    { $match: { 'members.payments.dueDate': { $gte: start, $lte: end } } },
    {
      $project: {
        _id: 0,
        chitName: 1,
        memberId: '$members._id',
        dueDate: '$members.payments.dueDate',
        amount: '$members.payments.amount',
        status: '$members.payments.status',
      },
    },
  ]);

  // ---- Trend: collected vs pending per week of the month ----
  const bucketMap = {};
  getOrderedWeekBuckets(start, end).forEach((label) => {
    bucketMap[label] = { label, collected: 0, pending: 0 };
  });

  payments.forEach((p) => {
    const key = getWeekBucket(new Date(p.dueDate));
    if (!bucketMap[key]) bucketMap[key] = { label: key, collected: 0, pending: 0 };
    if (p.status === 'paid') bucketMap[key].collected += p.amount;
    else bucketMap[key].pending += p.amount;
  });

  const trend = Object.values(bucketMap);

  // ---- Status split ----
  const totalCollected = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter((p) => p.status !== 'paid').reduce((s, p) => s + p.amount, 0);

  // ---- Top chits by collected amount ----
  const chitTotals = {};
  payments.forEach((p) => {
    if (p.status !== 'paid') return;
    chitTotals[p.chitName] = (chitTotals[p.chitName] || 0) + p.amount;
  });
  const topChits = Object.entries(chitTotals)
    .map(([name, collected]) => ({ name, collected }))
    .sort((a, b) => b.collected - a.collected)
    .slice(0, 5);

  const totalForRate = totalCollected + totalPending;
  const collectionRate = totalForRate > 0 ? Math.round((totalCollected / totalForRate) * 100) : 0;

  return {
    month,
    year,
    monthLabel: MONTH_NAMES[month - 1],
    trend,
    statusSplit: [
      { name: 'Collected', value: totalCollected },
      { name: 'Pending', value: totalPending },
    ],
    topChits,
    kpis: {
      totalCollected,
      totalPending,
      totalAmount: totalForRate,
      collectionRate,
    },
  };
};

module.exports = { getAnalytics, MONTH_NAMES };