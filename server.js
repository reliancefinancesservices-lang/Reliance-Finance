const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({limit:'12mb'}));
app.use('/api/', rateLimit({windowMs: 15*60*1000, limit: 300, standardHeaders:true, legacyHeaders:false}));

const loanSchema = new mongoose.Schema({}, {strict:false, timestamps:true, minimize:false});
loanSchema.index({mobile:1});
loanSchema.index({id:1}, {unique:true, sparse:true});
const Loan = mongoose.model('Loan', loanSchema);

function sign(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: payload.role === 'admin' ? '8h' : '12h'});
}
function auth(requiredRole) {
  return (req,res,next) => {
    const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    try {
      const data=jwt.verify(token,process.env.JWT_SECRET);
      if(requiredRole && data.role!==requiredRole) return res.status(403).json({error:'Forbidden'});
      req.auth=data; next();
    } catch { return res.status(401).json({error:'Unauthorized or session expired'}); }
  };
}
function safeLoan(doc) {
  const l=doc.toObject ? doc.toObject() : {...doc};
  delete l.__v; return l;
}
app.get('/api/health', (req,res)=>res.json({ok:true, database:mongoose.connection.readyState===1?'connected':'disconnected'}));

app.post('/api/admin/login', async (req,res) => {
  const {username,password}=req.body||{};
  if(username!==process.env.ADMIN_USERNAME || !password || !(await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH||'')))
    return res.status(401).json({error:'Invalid admin username or password'});
  res.json({token:sign({role:'admin',username})});
});

app.get('/api/state', auth('admin'), async (req,res)=>{
  const loans=await Loan.find({}).sort({createdAt:1});
  res.json({loans:loans.map(safeLoan)});
});
app.put('/api/state', auth(), async (req,res)=>{
  const incoming=Array.isArray(req.body?.loans)?req.body.loans:[];
  if(req.auth.role==='admin') {
    const ops=incoming.map(l=>({updateOne:{filter:{id:Number(l.id)},update:{$set:{...l,id:Number(l.id)}},upsert:true}}));
    if(ops.length) await Loan.bulkWrite(ops);
    const ids=incoming.map(l=>Number(l.id));
    await Loan.deleteMany({id:{$nin:ids}});
    return res.json({ok:true});
  }
  if(req.auth.role==='customer') {
    const own=incoming.find(l=>String(l.mobile)===String(req.auth.mobile));
    if(!own) return res.status(403).json({error:'Customer record mismatch'});
    const allowed=['paymentRequests','paymentsHistory','feeStatus','feeAmount','feeNote','feeHeading','feeMessage'];
    const patch={}; for(const k of allowed) if(own[k]!==undefined) patch[k]=own[k];
    await Loan.updateOne({id:req.auth.loanId,mobile:req.auth.mobile},{$set:patch});
    return res.json({ok:true});
  }
  res.status(403).json({error:'Forbidden'});
});

app.post('/api/apply', async (req,res)=>{
  const input={...req.body};
  delete input._id; delete input.__v;
  input.id=Number(input.id)||Date.now();
  input.status='Pending'; input.applicationSource='customer';
  const exists=await Loan.findOne({mobile:String(input.mobile)});
  if(exists) return res.status(409).json({error:'This mobile number already has an application. Please contact support.'});
  const doc=await Loan.create(input);
  res.status(201).json({ok:true,id:doc.id});
});

app.post('/api/customer/login', async (req,res)=>{
  const mobile=String(req.body?.mobile||'').trim();
  const aadhaar=String(req.body?.aadhaar||'').replace(/\s/g,'');
  if(!/^\d{10}$/.test(mobile)||!/^\d{12}$/.test(aadhaar)) return res.status(400).json({error:'Enter valid mobile and 12-digit Aadhaar'});
  const loan=await Loan.findOne({mobile,aadhaar});
  if(!loan) return res.status(401).json({error:'Details did not match any customer record'});
  res.json({token:sign({role:'customer',mobile,loanId:loan.id}),loan:safeLoan(loan)});
});
app.get('/api/customer/me', auth('customer'), async (req,res)=>{
  const loan=await Loan.findOne({id:req.auth.loanId,mobile:req.auth.mobile});
  if(!loan) return res.status(404).json({error:'Customer record not found'});
  res.json({loan:safeLoan(loan)});
});
app.post('/api/status', async (req,res)=>{
  const key=String(req.body?.identifier||'').trim();
  if(!key) return res.status(400).json({error:'Enter mobile number or Aadhaar'});
  const loan=await Loan.findOne({$or:[{mobile:key},{aadhaar:key}]});
  if(!loan) return res.status(404).json({error:'No loan record found for this number'});
  // Status endpoint deliberately returns minimal information only.
  res.json({loan:{name:'Customer',photo:'',pan:'••••••••••',cibil:'—',type:'—',amount:0,rate:'—',tenure:'—',status:loan.status}});
});

app.use(express.static(path.join(__dirname,'public')));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.use((err,req,res,next)=>{ console.error(err); res.status(500).json({error:'Server error'}); });

const port=process.env.PORT||10000;
async function start(){
  if(!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  if(!process.env.JWT_SECRET || process.env.JWT_SECRET.length<32) throw new Error('JWT_SECRET must be at least 32 characters');
  if(!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD_HASH) throw new Error('Set ADMIN_USERNAME and ADMIN_PASSWORD_HASH');
  await mongoose.connect(process.env.MONGODB_URI);
  app.listen(port,()=>console.log(`Reliance Finance app listening on ${port}`));
}
start().catch(e=>{console.error(e);process.exit(1)});
