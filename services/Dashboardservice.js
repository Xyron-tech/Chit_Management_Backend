const Chit = require('../models/Chit');

const RECENT_CHITS_LIMIT = 3;
const MS_PER_MONTH = 30 * 24 * 60 * 60 * 1000;

// Rough "current month" progress for a chit based on elapsed time since start
const getMonthProgress = (chit) => {
  const now = new Date();
  const start = new Date(chit.startDate);
  const elapsed = Math.floor((now - start) / MS_PER_MONTH) + 1;
  return Math.max(1, Math.min(chit.totalMonths, elapsed));
};

// Simple heuristic: how much of what's due so far has actually been collected
const getRisk = (chit) => {
  const currentMonth = getMonthProgress(chit);
  let due = 0;
  let collected = 0;

  chit.members.forEach((member) => {
    member.payments
      .filter((p) => p.month <= currentMonth)
      .forEach((p) => {
        due += p.amount;
        if (p.status === 'paid') collected += p.amount;
      });
  });

  if (due === 0) return 'low';
  const rate = collected / due;
  if (rate >= 0.9) return 'low';
  if (rate >= 0.7) return 'medium';
  return 'high';
};

// Small weekly trend for the current calendar month — collected vs pending
const getThisMonthTrend = (chits) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const daysInMonth = monthEnd.getDate();
  const weekCount = Math.ceil(daysInMonth / 7);

  const buckets = Array.from({ length: weekCount }, (_, i) => ({
    label: `Wk ${i + 1}`,
    collected: 0,
    pending: 0,
  }));

  chits.forEach((chit) => {
    chit.members.forEach((member) => {
      member.payments.forEach((p) => {
        const due = new Date(p.dueDate);
        if (due < monthStart || due > monthEnd) return;
        const weekIndex = Math.min(weekCount - 1, Math.floor((due.getDate() - 1) / 7));
        if (p.status === 'paid') buckets[weekIndex].collected += p.amount;
        else buckets[weekIndex].pending += p.amount;
      });
    });
  });

  return buckets;
};

const getDashboardSummary = async (tenantId) => {
  const chits = await Chit.find({ tenantId }).sort({ createdAt: -1 });

  // ---- Totals (across ALL chits for this tenant) ----
  let totalPot = 0;
  let totalCollected = 0;
  let totalPending=0;

  chits.forEach((chit) => {
    totalPot += chit.chitAmount || 0;
    chit.members.forEach((member) => {
      member.payments.forEach((p) => {
      if (p.status === 'paid') {
          totalCollected += p.amount;
        } else {
          totalPending += p.amount;
        }
      });
    });
  });

  const totals = {
    totalPot,
    totalCollected,
    totalPending, 
    activeChits: chits.length,
  };

  const recentChits = chits.slice(0, RECENT_CHITS_LIMIT).map((chit) => {
    const collected = chit.members.reduce(
      (sum, m) => sum + m.payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0),
      0
    );

    return {
      id: chit._id,
      name: chit.chitName,
      pot: chit.chitAmount,
      collected,
      members: chit.members.length,
      month: `${getMonthProgress(chit)} / ${chit.totalMonths}`,
      risk: getRisk(chit),
    };
  });

  // ---- This month's collection trend (small graph) ----
  const monthTrend = getThisMonthTrend(chits);

  return { totals, recentChits, monthTrend };
};

module.exports = { getDashboardSummary };