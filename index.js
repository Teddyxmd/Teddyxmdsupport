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

const CONFIG = {
    COMPANY_NAME: process.env.COMPANY_NAME || 'TEDDY-XMD Support',
    ADMIN_KEY: process.env.ADMIN_KEY,
    MONGO_URI: process.env.MONGO_URI,
    BOT_TOKEN: process.env.BOT_TOKEN,
    ADMIN_IDS: process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [],
    OUTLOOK_EMAIL: process.env.OUTLOOK_EMAIL,
    OUTLOOK_PASS: process.env.OUTLOOK_PASS,
};

// DB Connection
let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };
async function dbConnect() {
    if (cached.conn) return cached.conn;
    if (!cached.promise) cached.promise = mongoose.connect(CONFIG.MONGO_URI, {bufferCommands: false}).then(m => m);
    cached.conn = await cached.promise;
    return cached.conn;
}

// Schema
const ticketSchema = new mongoose.Schema({
    ticketID: {type: String, unique: true}, name: String, email: String, message: String,
    aiReply: String, status: { type: String, default: 'Open', enum: ['Open','Closed'] },
    ip: String, createdAt: { type: Date, default: Date.now }
});
const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);

// Email Transport
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: CONFIG.OUTLOOK_EMAIL, pass: CONFIG.OUTLOOK_PASS },
});

async function generateTicketID() {
    await dbConnect();
    const count = await Ticket.countDocuments();
    return `TKT-${String(count + 1).padStart(5, '0')}`;
}

// GIFTED API - EXACTLY LIKE THE TEST ABOVE
async function generateAIReply(name, userMessage, ticketID) {
    try {
        const prompt = `You are a professional support agent for ${CONFIG.COMPANY_NAME}. Ticket ID: ${ticketID}. Reply in 3 sentences max. Be helpful and professional. Customer: ${name}, Message: "${userMessage}". Sign as ${CONFIG.COMPANY_NAME} Support Team.`;

        const response = await axios.post('https://api.giftedtech.co.ke/api/ai/openai', {
            apikey: "gifted",
            question: prompt
        }, { timeout: 15000 });

        if(response.data.status === 200 && response.data.result){
            console.log("✅ GIFTED RESPONSE:", response.data.result);
            return response.data.result;
        }
        throw new Error("Invalid Gifted Response");

    } catch (e) {
        console.error("❌ GIFTED ERROR:", e.response?.status, e.response?.data || e.message);
        // Fallback reply
        return `Hi ${name},\n\nThank you for contacting ${CONFIG.COMPANY_NAME}. Your ticket ${ticketID} has been received.\n\nWe have noted: "${userMessage}"\nOur support team will get back to you within 24 hours.\n\n${CONFIG.COMPANY_NAME} Support Team`;
    }
}

// Routes
app.post('/api/support', async (req, res) => {
    await dbConnect();
    const { name, email, message } = req.body;
    if(!name || !email || !message) return res.status(400).json({success: false, error: `All fields required`});
    try {
        const ticketID = await generateTicketID();
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const aiReply = await generateAIReply(name, message, ticketID);
        await new Ticket({ ticketID, name, email, message, aiReply, ip }).save();

        // SEND EMAIL
        try {
            await transporter.sendMail({
                from: `"${CONFIG.COMPANY_NAME}" <${CONFIG.OUTLOOK_EMAIL}>`,
                to: email,
                subject: `[${ticketID}] We received your message`,
                html: `<div style="font-family:Poppins,Arial;padding:20px;background:#f5f5f5"><div style="background:#fff;padding:25px;border-radius:15px;max-width:600px;margin:auto;border-top:4px solid #0078D4"><h2 style="color:#0078D4">Hi ${name},</h2><p><b>Ticket ID: ${ticketID}</b></p><p>Thanks for contacting <b>${CONFIG.COMPANY_NAME}</b>!</p><div style="background:#f9f9f9;padding:15px;border-left:4px solid #0078D4;margin:15px 0">${aiReply.replace(/\n/g, '<br>')}</div><p>Reply to this email and include ${ticketID} to continue.</p><hr><p style="font-size:12px;color:#888">${CONFIG.COMPANY_NAME}</p></div></div>`
            });
            console.log("✅ EMAIL SENT TO:", email);
        } catch(e) { console.error("❌ EMAIL FAILED:", e.message); }

        // SEND TELEGRAM
        const adminText = `🚨 *NEW TICKET: ${ticketID}* 🚨\n\n👤 *Name:* \`${name}\`\n📧 *Email:* \`${email}\`\n📝 *Message:* ${message}\n\n*AI Reply:*\n${aiReply}`;
        for(let chatId of CONFIG.ADMIN_IDS){
            try {
                await axios.post(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`, {
                    chat_id: chatId.trim(), text: adminText, parse_mode: 'Markdown'
                });
                console.log("✅ TELEGRAM SENT TO:", chatId);
            } catch(e) { console.error("❌ TELEGRAM FAILED:", chatId, e.response?.data || e.message); }
        }
        
        res.json({success: true, ticketID, aiReply});
    } catch(e) {
        console.error("SERVER ERROR:", e);
        res.status(500).json({success: false, error: 'Server Error: ' + e.message});
    }
});

app.post('/api/close-ticket', async (req, res) => {
    await dbConnect();
    const { ticketID, key } = req.body;
    if(key !== CONFIG.ADMIN_KEY) return res.status(401).json({success: false, error: 'Unauthorized'});
    await Ticket.updateOne({ ticketID }, { status: 'Closed' });
    res.json({success: true});
});

app.get('/admin', async (req, res) => {
    await dbConnect();
    if(req.query.key !== CONFIG.ADMIN_KEY) return res.status(403).send('<h1 style="font-family:Poppins;text-align:center;margin-top:50px">403 Forbidden</h1>');
    const tickets = await Ticket.find().sort({ createdAt: -1 }).limit(200);
    res.send(`<!DOCTYPE html><html><head><title>Admin - ${CONFIG.COMPANY_NAME}</title><style>body{font-family:Poppins;background:#0a0a0a;color:#fff;padding:20px}h1{color:#0078D4}table{width:100%;border-collapse:collapse;background:#111;border-radius:10px;overflow:hidden}th,td{padding:12px;border-bottom:1px solid #222;text-align:left}th{background:#0078D4}button{cursor:pointer;padding:6px 12px;border:none;border-radius:5px;background:#0078D4;color:#fff}.btn-close{background:#ff4444}.status{padding:4px 10px;border-radius:5px;font-size:12px}.open{background:#0078D4}.closed{background:#25D366}</style></head><body><h1>📊 ${CONFIG.COMPANY_NAME} - Admin</h1><div>Total Tickets: ${tickets.length}</div><br><table><tr><th>ID</th><th>Name</th><th>Email</th><th>Details</th><th>Time</th><th>Status</th><th>Action</th></tr>${tickets.map(t=>`<tr id="row-${t.ticketID}"><td><b>${t.ticketID}</b></td><td>${t.name}</td><td>${t.email}</td><td><button onclick="showMsg('${t.ticketID}')">View</button></td><td>${new Date(t.createdAt).toLocaleString('en-GB')}</td><td id="status-${t.ticketID}"><span class="status ${t.status.toLowerCase()}">${t.status}</span></td><td>${t.status === 'Open' ? `<button class="btn-close" onclick="closeTicket('${t.ticketID}')">Close</button>` : '-'}</td></tr><tr id="msg-${t.ticketID}" style="display:none;background:#1a1a1a"><td colspan="7"><b>Customer:</b><br>${t.message}<br><br><b>AI:</b><br>${t.aiReply}</td></tr>`).join('') || '<tr><td colspan=7>No tickets yet</td></tr>'}</table><script>const ADMIN_KEY='${CONFIG.ADMIN_KEY}';function showMsg(id){const el=document.getElementById('msg-'+id);el.style.display=el.style.display==='none'?'table-row':'none';}async function closeTicket(id){if(!confirm('Close '+id+'?'))return;await fetch('/api/close-ticket',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticketID:id,key:ADMIN_KEY})});document.getElementById('status-'+id).innerHTML='<span class="status closed">Closed</span>';document.getElementById('row-'+id).querySelector('td:last-child').innerHTML='-';}</script></body></html>`);
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'support.html')));

const PORT = process.env.PORT || 50900;
app.listen(PORT, () => console.log(`✅ TEDDY-XMD Support LIVE on ${PORT}`));

module.exports = app;
