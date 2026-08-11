const chitService = require('../services/chitService');
const handleAsync = require('../utils/handleasync');
const { streamMonthStatementPdf } = require('../utils/pdfbuilder');


const createChit = handleAsync(async (req, res) => {
  const chit = await chitService.createChit(req.user.tenantId, req.body, req.file);
  res.status(201).json({ message: 'Chit created ✅', chit });
});

const getAllChits = handleAsync(async (req, res) => {
  const chits = await chitService.getAllChits(req.user.tenantId);
  res.json(chits);
});

const getChit = handleAsync(async (req, res) => {
  const chit = await chitService.getChit(req.params.id, req.user.tenantId);
  res.json(chit);
});

const updateChit = handleAsync(async (req, res) => {
  const { removeImage, ...rest } = req.body;
  const chit = await chitService.updateChit(
    req.params.id,
    req.user.tenantId,
    { ...rest, removeImage: removeImage === 'true' || removeImage === true },
    req.file
  );
  res.json({ message: 'Chit updated ✅', chit });
});

const deleteChit = handleAsync(async (req, res) => {
  await chitService.deleteChit(req.params.id, req.user.tenantId);
  res.json({ message: 'Chit deleted ✅' });
});


const addMember = handleAsync(async (req, res) => {
  const { memberName, phone } = req.body;
  const chit = await chitService.addMember(req.params.id, req.user.tenantId, { memberName, phone }, req.file);
  res.status(201).json({ message: 'Member added ✅', chit });
});

const updateMember = handleAsync(async (req, res) => {
  const { memberName, phone, month, prized, removePhoto } = req.body;
  const member = await chitService.updateMember(
    req.params.id, req.user.tenantId, req.params.memberId,
    {
      memberName,
      phone,
      month: month !== undefined ? Number(month) : undefined,
      prized: prized !== undefined ? prized === 'true' || prized === true : undefined,
      removePhoto: removePhoto === 'true' || removePhoto === true,
    },
    req.file
  );
  res.json({ message: 'Member updated ✅', member });
});

const deleteMember = handleAsync(async (req, res) => {
  await chitService.deleteMember(req.params.id, req.user.tenantId, req.params.memberId);
  res.json({ message: 'Member deleted ✅' });
});


const markPayment = handleAsync(async (req, res) => {
  const payment = await chitService.markPayment(
    req.params.id, req.user.tenantId, req.params.memberId, req.params.paymentId
  );
  res.json({ message: `Payment marked ${payment.status} ✅`, payment });
});

const markAllPaid = handleAsync(async (req, res) => {
  const month = parseInt(req.params.month);
  const chit = await chitService.markAllPaid(req.params.id, req.user.tenantId, month);
  res.json({ message: `All members marked paid for Month ${month} ✅`, chit });
});

const updatePaymentAmount = handleAsync(async (req, res) => {
  const { amount } = req.body;
  const month = parseInt(req.params.month);
  const chit = await chitService.updatePaymentAmount(req.params.id, req.user.tenantId, month, amount);
  res.json({ message: 'Amount updated & future months recalculated ✅', chit });
});

const downloadMonthPdf = async (req, res) => {
  try {
    const { id, month } = req.params;
    const monthNum = parseInt(month, 10);

    // Fixed: this was req.user?._id (the user's own id) — but the Chit
    // model scopes by tenantId, not by the individual user's id. Every
    // other function above already uses req.user.tenantId; this one just
    // hadn't been updated to match, which is why the query never matched
    // and always threw "Chit not found".
    const statement = await chitService.getMonthStatement(id, monthNum, req.user.tenantId);

    const filename = `${(statement.chit.chitName || 'chit').replace(/[^\w\-]+/g, '_')}-month-${monthNum}.pdf`;
    streamMonthStatementPdf(res, filename, statement);
  } catch (err) {
    console.error('PDF generation failed:', err);
    if (!res.headersSent) {
      const status = err.statusCode || 500;
      res.status(status).json({ message: err.message || 'Unable to generate PDF' });
    } else {
      res.end();
    }
  }
};

module.exports = {
  createChit, getAllChits, getChit,
  updateChit, deleteChit,
  addMember, updateMember, deleteMember,
  markPayment, markAllPaid, updatePaymentAmount, downloadMonthPdf,
};