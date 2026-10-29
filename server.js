import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

const loanSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true, minimize: false });
const Loan = mongoose.model('Loan', loanSchema);
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false });

function decodeToken(req) {
  if (!process.env.JWT_SECRET) return null;
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  try { return jwt.verify(header.slice(7), process.env.JWT_SECRET); } catch { return null; }
}
function requireAdmin(req, res, next) {
  const user = decodeToken(req);
  if (!user || user.role !== 'admin') return res.status(401).json({ message: 'Admin login required.' });
  req.auth = user; next();
}
function requireCustomer(req, res, next) {
  const user = decodeToken(req);
  if (!user || user.role !== 'customer' || !Number.isFinite(Number(user.loanId))) return res.status(401).json({ message: 'Customer session expired. Please log in again.' });
  req.auth = user; next();
}
function safeStatus(loan) {
  return { id: loan.id, name: loan.name, type: loan.type, amount: loan.amount, status: loan.status, rate: loan.rate || '', tenure: loan.tenure || '', cibil: loan.cibil || '', photo: loan.photo || '' };
}
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.post('/api/admin/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD_HASH || !process.env.JWT_SECRET)
    return res.status(503).json({ message: 'Admin credentials are not configured on the server.' });
  const usernameOk = typeof username === 'string' && username === process.env.ADMIN_USERNAME;
  const passwordOk = typeof password === 'string' && await bcrypt.compare(String(password || ''), process.env.ADMIN_PASSWORD_HASH);
  if (!usernameOk || !passwordOk) return res.status(401).json({ message: 'Invalid Admin Username or Password!' });
  res.json({ token: jwt.sign({ sub: username, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' }), expiresIn: 28800 });
});
app.get('/api/admin/loans', requireAdmin, async (_req, res) => {
  try {
    const docs = await Loan.find({}, { _id: 0, id: 1, data: 1 }).lean();
    res.json(docs.map(d => d.data).sort((a,b) => Number(a.id)-Number(b.id)));
  } catch { res.status(500).json({ message: 'Could not load records.' }); }
});

/* Compatibility with the existing one-field login. This is not equivalent to verified OTP authentication.
   Do not use real KYC/financial data until the UI is upgraded to verify control of the phone number. */
app.post('/api/customer/login', loginLimiter, async (req, res) => {
  const identifier = String(req.body?.identifier || '').trim();
  if (!identifier) return res.status(400).json({ message: 'Enter your mobile number or Govt ID.' });
  try {
    const docs = await Loan.find({}, { _id: 0, id: 1, data: 1 }).lean();
    const found = docs.map(d => d.data).find(l => String(l.mobile || '') === identifier || String(l.aadhaar || '') === identifier);
    if (!found) return res.status(404).json({ message: 'Customer record not found.' });
    const token = jwt.sign({ role: 'customer', loanId: Number(found.id) }, process.env.JWT_SECRET, { expiresIn: '30m' });
    return res.json({ token, loan: found });
  } catch { return res.status(500).json({ message: 'Unable to log in. Try again.' }); }
});
app.get('/api/customer/status', loginLimiter, async (req, res) => {
  const identifier = String(req.query.identifier || '').trim();
  if (!identifier) return res.status(400).json({ message: 'Enter your mobile number or Govt ID.' });
  try {
    const docs = await Loan.find({}, { _id: 0, data: 1 }).lean();
    const found = docs.map(d => d.data).find(l => String(l.mobile || '') === identifier || String(l.aadhaar || '') === identifier);
    if (!found) return res.status(404).json({ message: 'No loan record found for this number.' });
    return res.json(safeStatus(found));
  } catch { return res.status(500).json({ message: 'Unable to check status.' }); }
});

/* Admin may upsert/delete all records. Customer session may update only its own record.
   Anonymous visitors can create new records only; they cannot read or overwrite existing ones. */
app.put('/api/loans/sync', async (req, res) => {
  const auth = decodeToken(req);
  const isAdmin = !!auth && auth.role === 'admin';
  const isCustomer = !!auth && auth.role === 'customer' && Number.isFinite(Number(auth.loanId));
  if (req.headers.authorization && !auth) return res.status(401).json({ message: 'Session expired. Please log in again.' });
  const loans = req.body?.loans;
  if (!Array.isArray(loans) || loans.length > 5000) return res.status(400).json({ message: 'Invalid loan data.' });
  const ids = new Set();
  for (const loan of loans) {
    if (!loan || !Number.isFinite(Number(loan.id)) || ids.has(String(loan.id))) return res.status(400).json({ message: 'Each loan must have a unique numeric id.' });
    ids.add(String(loan.id));
  }
  try {
    if (isAdmin) {
      const ops = loans.map(loan => ({ updateOne: { filter: { id: Number(loan.id) }, update: { $set: { data: loan } }, upsert: true } }));
      if (ops.length) await Loan.bulkWrite(ops);
      await Loan.deleteMany({ id: { $nin: loans.map(l => Number(l.id)) } });
      return res.json({ ok: true, count: loans.length });
    }
    if (isCustomer) {
      const mine = loans.find(l => Number(l.id) === Number(auth.loanId));
      if (!mine) return res.status(403).json({ message: 'This customer session cannot edit this record.' });
      const currentDoc = await Loan.findOne({ id: Number(auth.loanId) }, { _id: 0, data: 1 }).lean();
      if (!currentDoc) return res.status(404).json({ message: 'Customer record not found.' });
      const current = currentDoc.data || {};
      // Customer sessions may submit payment proof only; they cannot edit loan approval, KYC or identity data.
      const allowed = ['paymentRequests', 'paymentsHistory', 'feeStatus', 'feeAmount', 'feeNote', 'feeHeading', 'feeMessage'];
      const updated = { ...current };
      for (const key of allowed) if (Object.prototype.hasOwnProperty.call(mine, key)) updated[key] = mine[key];
      await Loan.updateOne({ id: Number(auth.loanId) }, { $set: { data: updated } });
      return res.json({ ok: true, updated: 1 });
    }
    const existingIds = new Set((await Loan.find({ id: { $in: loans.map(l => Number(l.id)) } }, { id: 1, _id: 0 }).lean()).map(d => String(d.id)));
    const newLoans = loans.filter(l => !existingIds.has(String(l.id)));
    if (newLoans.length) await Loan.insertMany(newLoans.map(data => ({ id: Number(data.id), data })), { ordered: false });
    return res.json({ ok: true, created: newLoans.length });
  } catch (e) {
    if (e?.code === 11000) return res.status(409).json({ message: 'A record with this id already exists. Refresh and retry.' });
    return res.status(500).json({ message: 'Could not save records.' });
  }
});

app.use(express.static(path.join(root, 'frontend')));
app.get('*', (_req, res) => res.sendFile(path.join(root, 'frontend', 'index.html')));
mongoose.connect(process.env.MONGODB_URI)
  .then(() => app.listen(PORT, () => console.log(`Reliance Finance server listening on ${PORT}`)))
  .catch(err => { console.error('MongoDB connection failed:', err.message); process.exit(1); });
