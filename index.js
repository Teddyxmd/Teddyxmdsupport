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

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };
async function dbConnect() {
    if (cached.conn) return cached.conn;
    if (!cached.promise) cached.promise = mongoose.connect(CONFIG.MONGO_URI, {
        bufferCommands: false,
    }).then(m => m);
    cached.conn = await cached.promise;
    return cached.conn;
}

const ticketSchema = new mongoose.Schema({
    ticketID: {type: String, unique: true}, name: String, email: String, message: String,
    aiReply: String, status: { type: String, default: 'Open', enum: ['Open','Closed'] },
    ip: String, createdAt: { type: Date, default: Date.now }
});
const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: CONFIG.OUTLOOK_EMAIL, pass: CONFIG.OUTLOOK_PASS },
});

async function generateTicketID() {
    await dbConnect();
    const count = await Ticket.countDocuments();
    return `TKT-${String(count + 1).padStart(5, '0')}`;
}

async function generateAIReply(name, userMessage, ticketID) {
    try {
        const prompt = `You are a professional support agent for ${CONFIG.COMPANY_NAME}. Ticket ID: ${ticketID}. Reply in 3 sentences. Be helpful. Customer: ${name}, Message: "${userMessage}". Sign as ${CONFIG.COMPANY_NAME} Support Team.`;
        const url = `https://api.giftedtech.co.ke/api/ai/openai?apikey=gifted&q=${encodeURIComponent(prompt)}`;
        const response = await axios.get(url, { timeout: 20000 });
        return response.data.result || "Thanks for contacting us!";
    } catch (e) {
        console.error("GIFTED API ERROR:", e.message);
        return `Hi ${name},\n\nThanks for contacting ${CONFIG.COMPANY_NAME}! Your ticket ${ticketID} has been received. We will review "${userMessage}" and get back to you within 24 hours.\n\n${CONFIG.COMPANY_NAME} Support Team`;
    }
}

app.post('/api/support', async (req, res) => {
    await dbConnect();
    const { name, email, message } = req.body;
    if(!name || !email || !message) return res.status(400).json({success: false, error: `All fields required`});
    try {
        const ticketID = await generateTicketID();
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const aiReply = await generateAIReply(name, message, ticketID);
        await new Ticket({ ticketID, name, email, message, aiReply, ip }).save();

        // SEND EMAIL WITH LOGS
        try {
            await transporter.sendMail({
                from: `"${CONFIG.COMPANY_NAME}" <${CONFIG.OUTLOOK_EMAIL}>`,
                to: email,
                subject: `[${ticketID}] We received your message`,
                html: `<div style="font-family:Poppins,Arial;padding:20px;background:#f5f5f5"><div style="background:#fff;padding:25px;border-radius:15px;max-width:600px;margin:auto;border-top:4px solid #0078D4"><h2 style="color:#0078D4">Hi ${name},</h2><p><b>Ticket ID: ${ticketID}</b></p><p>Thanks for contacting <b>${CONFIG.COMPANY_NAME}</b>!</p><div style="background:#f9f9f9;padding:15px;border-left:4px solid #0078D4;margin:15px 0">${aiReply.replace(/\n/g, '<br>')}</div><p>Reply to this email and include ${ticketID} to continue.</p><hr><p style="font-size:12px;color:#888">${CONFIG.COMPANY_NAME}</p></div></div>`
            });
            console.log("✅ EMAIL SENT TO:", email);
        } catch(e) {
            console.error("❌ EMAIL FAILED:", e.message);
        }

        // SEND TELEGRAM WITH LOGS
        const adminText = `🚨 *NEW TICKET: ${ticketID}* 🚨\n\n👤 *Name:* \`${name}\`\n📧 *Email:* \`${email}\`\n📝 *Message:* ${message}\n\n*AI Reply:*\n${aiReply}`;
        for(let chatId of CONFIG.ADMIN_IDS){
            try {
                await axios.post(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`, {
                    chat_id: chatId.trim(), text: adminText, parse_mode: 'Markdown'
                });
                console.log("✅ TELEGRAM SENT TO:", chatId);
            } catch(e) {
                console.error("❌ TELEGRAM FAILED:", chatId, e.response?.data || e.message);
            }
        }
        
        res.json({success: true, ticketID, aiReply});
    } catch(e) {
        console.error("SERVER ERROR:", e);
        res.status(500).json({success: false, error: 'Server Error: ' + e.message});
    }
});

// ... keep your /admin and /api/close-ticket routes same as before ...

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'support.html')));

const PORT = process.env.PORT || 50900;
app.listen(PORT, () => console.log(`✅ TEDDY-XMD Support LIVE on ${PORT}`));
module.exports = app;
