# 📞 TEDDY-XMD Support System

Official AI-powered support ticket system for **TEDDY-XMD WhatsApp Bot**.

Features: Email + Telegram Alerts + Admin Panel + MongoDB

![Status](https://img.shields.io/badge/status-Production-25D366)
![Node](https://img.shields.io/badge/Node-18+-0078D4)

---

### **🚀 1-CLICK DEPLOY TO RENDER**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Teddyxmd/teddyxmdsupport)

Click the button above, connect Github, and fill 6 env vars. Done in 2 minutes.

---

### **📁 PROJECT STRUCTURE**
teddy-xmd-support/
├── server.js               # Main Express server + API + Admin
├── package.json            # Dependencies
├── .env.example            # Env template
├── .gitignore              # Ignore .env and node_modules
└── public/
    └── support.html        # Official customer support form with BG + Channels

---

### **⚙️ FEATURES**

| Feature | Description |
| --- | --- |
| **Instant Ticket** | User gets ticket ID immediately, no waiting |
| **Email System** | Gmail SMTP sends professional confirmation email |
| **Telegram Alerts** | Instant notification to admins when new ticket comes |
| **Admin Panel** | `/admin?key=YOUR_KEY` to view and close tickets. Green UI |
| **MongoDB** | All tickets saved with IP, time, status |
| **Background Image** | Branded support form with your image |
| **Channel Buttons** | WhatsApp + Telegram channel join buttons |
| **Fire-and-Forget** | Email/Telegram run in background so user doesn't wait |

---

### **🔧 MANUAL SETUP**

#### **1. Clone & Install**
```bash
git clone https://github.com/YOUR_USERNAME/teddy-xmd-support.git
cd teddy-xmd-support
npm install
#### *2. Setup Environment*
Copy `.env.example` to `.env` and fill:
PORT=50900
COMPANY_NAME=TEDDY-XMD Support
ADMIN_KEY=your_random_secret_key

MONGO_URI=mongodb+srv://...
BOT_TOKEN=from_BotFather
ADMIN_IDS=6815918612

OUTLOOK_EMAIL=your_gmail@gmail.com
OUTLOOK_PASS=App_Password_Not_Normal_Password
#### *3. Run Locally*
npm run dev
Open: `http://localhost:50900`  
Admin: `http://localhost:50900/admin?key=your_random_secret_key`

---

### *🌐 API ENDPOINTS*
Method	Endpoint	Description
`GET`	`/`	Customer support form
`POST`	`/api/support`	Create new ticket
`GET`	`/admin?key=KEY`	Admin dashboard
`POST`	`/api/close-ticket`	Close a ticket
---

### *🔐 SECURITY NOTES*
1.  *Never commit `.env`* - Use Render Environment Variables
2.  *Rotate keys* if you leaked them: MongoDB, Telegram, Gmail
3.  *Gmail*: Must use App Password with 2FA ON to fix `535` error
4.  *Change `ADMIN_KEY`* to something strong before going live

---

### *📞 SUPPORT*
Made with ❤️ for TEDDY-XMD Community  
Owner: @xdbot1  
WhatsApp Channel: https://whatsapp.com/channel/0029Vb6NveDBPzjPa4vIRt3n  
Telegram Channel: https://t.me/free_net_zone

