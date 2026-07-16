const express = require('express');
const cors = require('cors');
const axios = require('axios');
const nodemailer = require('nodemailer');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors({origin: "*"}));
app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// EXAMPLE VARIABLES - REPLACE ON RENDER WITH REAL ONES
const CONFIG = {
    COMPANY_NAME: process.env.COMPANY_NAME || 'TEDDY-XMD Support',
    ADMIN_KEY: process.env.ADMIN_KEY || 'teddyxmd_admin_2026',
    MONGO_URI: process.env.MONGO_URI || 'mongodb+srv://example_user:example_pass@cluster0.mongodb.net/supportdb',
    BOT_TOKEN: process.env.BOT_TOKEN || '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
    ADMIN_IDS: process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : ['123456789'],
    OUTLOOK_EMAIL: process.env.OUTLOOK_EMAIL || 'example@test.com',
    OUTLOOK_PASS: process.env.OUTLOOK_PASS || 'abcd efgh ijkl mnop',
};

// DB CONNECTION
let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };
async function dbConnect() {
    if (cached.conn) return cached.conn;
    if (!cached.promise) cached.promise = mongoose.connect(CONFIG.MONGO_URI, {bufferCommands: false}).then(m => m);
    cached.conn = await cached.promise;
    return cached.conn;
}

// SCHEMA
const ticketSchema = new mongoose.Schema({
    ticketID: {type: String, unique: true}, name: String, email: String, message: String,
    status: { type: String, default: 'Open', enum: ['Open','Closed'] },
    ip: String, createdAt: { type: Date, default: Date.now }
});
const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);

// EMAIL
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: CONFIG.OUTLOOK_EMAIL, pass: CONFIG.OUTLOOK_PASS },
});

async function generateTicketID() {
    await dbConnect();
    const count = await Ticket.countDocuments();
    return `TKT-${String(count + 1).padStart(5, '0')}`;
}

function generateCustomReply(name, ticketID) {
    return `Hello ${name},\n\nWe've received your support ticket ${ticketID}.\n\nThank you for contacting ${CONFIG.COMPANY_NAME}. Our support team will review your message and you'll get your response within 24 hours.\n\nJoin our channels:\nWhatsApp: https://whatsapp.com/channel/0029Vb6NveDBPzjPa4vIRt3n\nTelegram: https://t.me/free_net_zone\n\nBest regards,\n${CONFIG.COMPANY_NAME} Support Team`;
}

// SEND EMAIL - FIRE AND FORGET
async function sendEmail(email, name, ticketID, reply) {
    try {
        if(!CONFIG.OUTLOOK_EMAIL || !CONFIG.OUTLOOK_PASS) return console.log("⚠️ EMAIL CONFIG MISSING");
        await transporter.sendMail({
            from: `"${CONFIG.COMPANY_NAME}" <${CONFIG.OUTLOOK_EMAIL}>`,
            to: email, 
            subject: `[${ticketID}] We received your message`,
            html: `<div style="font-family:Poppins,Arial;padding:20px;background:#f5f5f5"><div style="background:#fff;padding:25px;border-radius:15px;max-width:600px;margin:auto;border-top:4px solid #25D366"><h2 style="color:#25D366">Hi ${name},</h2><p><b>Ticket ID: ${ticketID}</b></p><p>${reply.replace(/\n/g,'<br>')}</p><hr><p style="font-size:12px;color:#888">${CONFIG.COMPANY_NAME}</p></div></div>`
        });
        console.log("✅ EMAIL SENT:", email);
    } catch(e) {
        console.error("❌ EMAIL FAILED BUT CONTINUING:", e.message);
    }
}

// SEND TELEGRAM
async function sendTelegram(ticketID, name, email, message) {
    try {
        if(!CONFIG.BOT_TOKEN || CONFIG.ADMIN_IDS.length === 0) return console.log("⚠️ TELEGRAM CONFIG MISSING");
        
        const escape = (text) => String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
        
        const adminText = `🚨 NEW TICKET: ${ticketID} 🚨\n\n👤 Name: ${escape(name)}\n📧 Email: ${escape(email)}\n📝 Message: ${escape(message)}\n\nStatus: Open`;

        for(let chatId of CONFIG.ADMIN_IDS){
            await axios.post(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`, {
                chat_id: chatId.trim(), 
                text: adminText
            }, {timeout: 5000});
            console.log("✅ TELEGRAM SENT:", chatId);
        }
    } catch(e) {
        console.error("❌ TELEGRAM FAILED:", e.response?.data || e.message);
    }
}

// ROUTES
app.post('/api/support', async (req, res) => {
    await dbConnect();
    const { name, email, message } = req.body;
    if(!name || !email || !message) return res.status(400).json({success: false, error: `All fields required`});
    
    try {
        const ticketID = await generateTicketID();
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const reply = generateCustomReply(name, ticketID);
        
        await new Ticket({ ticketID, name, email, message, ip }).save();

        res.json({success: true, ticketID, aiReply: reply});

        sendEmail(email, name, ticketID, reply);
        sendTelegram(ticketID, name, email, message);

    } catch(e) {
        console.error("SERVER ERROR:", e);
        if(!res.headersSent) res.status(500).json({success: false, error: 'Server Error'});
    }
});

app.post('/api/close-ticket', async (req, res) => {
    await dbConnect();
    const { ticketID, key } = req.body;
    if(key !== CONFIG.ADMIN_KEY) return res.status(401).json({success: false, error: 'Unauthorized'});
    await Ticket.updateOne({ ticketID }, { status: 'Closed' });
    res.json({success: true});
});

// GREEN ADMIN PANEL
app.get('/admin', async (req, res) => {
    await dbConnect();
    if(req.query.key !== CONFIG.ADMIN_KEY) return res.status(403).send('<h1 style="font-family:Poppins;text-align:center;margin-top:50px;color:#fff">403 Forbidden</h1>');
    const tickets = await Ticket.find().sort({ createdAt: -1 }).limit(200);
    res.send(`<!DOCTYPE html><html><head><title>Admin - ${CONFIG.COMPANY_NAME}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Poppins;background:linear-gradient(135deg,#25D366,#0078D4);padding:20px;margin:0;min-height:100vh}h1{color:#fff;text-align:center;margin-bottom:10px}.total{text-align:center;color:#fff;margin-bottom:20px;font-weight:600}table{width:100%;border-collapse:collapse;background:rgba(255,255,255,0.95);border-radius:15px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.2)}th,td{padding:12px;border-bottom:1px solid #eee;text-align:left}th{background:#25D366;color:#fff;font-weight:600}button{cursor:pointer;padding:8px 14px;border:none;border-radius:8px;background:#25D366;color:#fff;font-weight:600;transition:0.3s}button:hover{transform:translateY(-1px)}.btn-close{background:#ff4444}.status{padding:5px 12px;border-radius:20px;font-size:12px;font-weight:600}.open{background:#0078D4;color:#fff}.closed{background:#25D366;color:#fff}@media(max-width:768px){table,thead,tbody,th,td,tr{display:block}th{position:absolute;top:-9999px;left:-9999px}td{border:none;position:relative;padding-left:50%;padding-top:12px}td:before{content:attr(data-label);position:absolute;left:12px;font-weight:600;color:#25D366}}</style></head><body><h1>📊 ${CONFIG.COMPANY_NAME} - Admin Panel</h1><div class="total">Total Tickets: ${tickets.length}</div><table><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Details</th><th>Time</th><th>Status</th><th>Action</th></tr></thead><tbody>${tickets.map(t=>`<tr id="row-${t.ticketID}"><td data-label="ID"><b>${t.ticketID}</b></td><td data-label="Name">${t.name}</td><td data-label="Email">${t.email}</td><td data-label="Details"><button onclick="showMsg('${t.ticketID}')">View</button></td><td data-label="Time">${new Date(t.createdAt).toLocaleString('en-GB')}</td><td data-label="Status" id="status-${t.ticketID}"><span class="status ${t.status.toLowerCase()}">${t.status}</span></td><td data-label="Action">${t.status === 'Open' ? `<button class="btn-close" onclick="closeTicket('${t.ticketID}')">Close</button>` : '-'}</td></tr><tr id="msg-${t.ticketID}" style="display:none;background:#f0f0f0"><td colspan="7" style="padding:15px"><b>Customer Message:</b><br>${t.message}</td></tr>`).join('') || '<tr><td colspan=7 style="text-align:center;padding:20px">No tickets yet</td></tr>'}</tbody></table><script>const ADMIN_KEY='${CONFIG.ADMIN_KEY}';function showMsg(id){const el=document.getElementById('msg-'+id);el.style.display=el.style.display==='none'?'table-row':'none';}async function closeTicket(id){if(!confirm('Close '+id+'?'))return;await fetch('/api/close-ticket',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticketID:id,key:ADMIN_KEY})});document.getElementById('status-'+id).innerHTML='<span class="status closed">Closed</span>';document.getElementById('row-'+id).querySelector('td:last-child').innerHTML='-';}</script></body></html>`);
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'support.html')));

const PORT = process.env.PORT || 50900;
app.listen(PORT, () => console.log(`✅ TEDDY-XMD Support LIVE on ${PORT}`));

module.exports = app;
