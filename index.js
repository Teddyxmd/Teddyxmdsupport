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

// STARTUP CHECK
console.log("===== ENV CHECK =====");
console.log("MONGO:", CONFIG.MONGO_URI ? "✅ SET" : "❌ MISSING");
console.log("EMAIL:", CONFIG.OUTLOOK_EMAIL ? "✅ SET" : "❌ MISSING");
console.log("EMAIL PASS:", CONFIG.OUTLOOK_PASS ? "✅ SET" : "❌ MISSING");
console.log("BOT TOKEN:", CONFIG.BOT_TOKEN ? "✅ SET" : "❌ MISSING");
console.log("ADMIN IDS:", CONFIG.ADMIN_IDS.length > 0 ? "✅ SET" : "❌ MISSING");
console.log("ADMIN KEY:", CONFIG.ADMIN_KEY ? "✅ SET" : "❌ MISSING");
console.log("=====================");

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };
async function dbConnect() {
    if (cached.conn) return cached.conn;
    if (!cached.promise) cached.promise = mongoose.connect(CONFIG.MONGO_URI, {bufferCommands: false}).then(m => m);
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
    const prompt = `Support agent for ${CONFIG.COMPANY_NAME}. Ticket ${ticketID}. Customer ${name}: "${userMessage}". Reply 3 sentences.`;
    try {
        const url = `https://api.giftedtech.co.ke/api/ai/openai?apikey=gifted&q=${encodeURIComponent(prompt)}`;
        const res = await axios.get(url, { timeout: 10000 });
        return res.data.result || "AI reply failed";
    } catch(e) { 
        console.error("❌ GIFTED ERROR:", e.response?.status, e.message); 
        return `Hi ${name}, Ticket ${ticketID} received. We will reply in 24hrs. -${CONFIG.COMPANY_NAME}`;
    }
}

app.post('/api/support', async (req, res) => {
    await dbConnect();
    const { name, email, message } = req.body;
    if(!name || !email || !message) return res.status(400).json({success: false, error: `All fields required`});
    try {
        const ticketID = await generateTicketID();
        const aiReply = await generateAIReply(name, message, ticketID);
        await new Ticket({ ticketID, name, email, message, aiReply, ip: req.ip }).save();

        // EMAIL TEST
        if(!CONFIG.OUTLOOK_EMAIL || !CONFIG.OUTLOOK_PASS) {
            console.error("❌ EMAIL SKIPPED: ENV MISSING");
        } else {
            try {
                await transporter.sendMail({
                    from: `"${CONFIG.COMPANY_NAME}" <${CONFIG.OUTLOOK_EMAIL}>`,
                    to: email, subject: `[${ticketID}] We received your message`,
                    html: `<h2>Hi ${name}</h2><p>Ticket: ${ticketID}</p><p>${aiReply}</p>`
                });
                console.log("✅ EMAIL SENT TO:", email);
            } catch(e) { console.error("❌ EMAIL FAILED:", e.message); }
        }

        // TELEGRAM TEST
        if(!CONFIG.BOT_TOKEN || CONFIG.ADMIN_IDS.length === 0) {
            console.error("❌ TELEGRAM SKIPPED: ENV MISSING");
        } else {
            const adminText = `🚨 NEW TICKET: ${ticketID}\nName: ${name}\nEmail: ${email}\nMsg: ${message}`;
            for(let chatId of CONFIG.ADMIN_IDS){
                try {
                    await axios.post(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`, {
                        chat_id: chatId.trim(), text: adminText
                    });
                    console.log("✅ TELEGRAM SENT TO:", chatId);
                } catch(e) { console.error("❌ TELEGRAM FAILED:", chatId, e.response?.data); }
            }
        }
        
        res.json({success: true, ticketID, aiReply});
    } catch(e) {
        console.error("SERVER ERROR:", e);
        res.status(500).json({success: false, error: 'Server Error'});
    }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'support.html')));
const PORT = process.env.PORT || 50900;
app.listen(PORT, () => console.log(`✅ LIVE on ${PORT}`));
module.exports = app;
