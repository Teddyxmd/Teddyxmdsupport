
# 📞 TEDDY-XMD Support System
[Repo Preview](https://files.catbox.moe/5ffdce.jpeg)

Official AI-powered support ticket system for **TEDDY-XMD WhatsApp Bot**.

Features: Email + Telegram Alerts + Admin Panel + MongoDB

![Status](https://img.shields.io/badge/status-Production-25D366)
![Node](https://img.shields.io/badge/Node-18+-0078D4)

---

### **🎬 PREVIEW**
![TEDDY-XMD Support Panel](https://files.catbox.moe/5ffdce.jpeg)

---

### **🚀 1-CLICK DEPLOY**

Deploy instantly. No coding needed.

#### Deploy to Render
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Teddyxmd/teddyxmdsupport)

#### Deploy to Heroku
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/Teddyxmd/teddyxmdsupport)

*After clicking, fill 5 required env vars: `MONGO_URI, BOT_TOKEN, ADMIN_IDS, OUTLOOK_EMAIL, OUTLOOK_PASS`. `ADMIN_KEY` is auto-generated.*

---

### **📁 PROJECT STRUCTURE**
teddy-xmd-support/
├── index.js                # Main Express server + API + Admin
├── package.json            # Dependencies
├── render.yaml             # 1-Click Render config
├── app.json                # 1-Click Heroku config
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
| **Rate Limiting** | Prevent spam: 1 ticket per 10 minutes per IP |
| **Fire-and-Forget** | Email/Telegram run in background so user doesn't wait |

---

### **🔧 MANUAL SETUP**

#### **1. Clone & Install**
```bash
git clone https://github.com/Teddyxmd/teddyxmdsupport.git
cd teddyxmdsupport
npm install
#### *2. Setup Environment*
Copy `.env.example` to `.env` and fill:
PORT=50900
NODE_ENV=production
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
1.  *Never commit `.env`* - Use Render/Heroku Environment Variables
2.  *Rotate keys* if you leaked them: MongoDB, Telegram, Gmail
3.  *Gmail*: Must use App Password with 2FA ON to fix `535` error
4.  *Change `ADMIN_KEY`* to something strong before going live

---

### *📞 SUPPORT & COMMUNITY*
Made with ❤️ for TEDDY-XMD Community  
Owner: @xdbot1  

WhatsApp Channel: https://whatsapp.com/channel/0029Vb6NveDBPzjPa4vIRt3n  
Telegram Channel: https://t.me/free_net_zone  

For bugs or feature requests, open an [Issue](https://github.com/Teddyxmd/teddyxmdsupport/issues)

---

### *📜 LICENSE*
MIT © TEDDY-XMD

### **What was fixed**
1.  `![Status]` and `![Node]` badges now have `!`
2.  `[![Deploy to Render]]` and `[![Deploy]]` buttons now have `!`
3.  `![TEDDY-XMD Support Panel]` preview image now has `!`

