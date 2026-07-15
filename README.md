# 📞 TEDDY-XMD Support System

Official AI-powered support ticket system for **TEDDY-XMD WhatsApp Bot**.

Features: Gemini AI auto-reply + Email + Telegram Alerts + Admin Panel + MongoDB

![Status](https://img.shields.io/badge/status-Production-25D366)
![Node](https://img.shields.io/badge/Node-18+-0078D4)

---

### **🚀 1-CLICK DEPLOY TO RENDER**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/YOUR_USERNAME/teddy-xmd-support)

Click the button above, connect Github, and fill 6 env vars. Done in 2 minutes.

---

### **📁 PROJECT STRUCTURE**



---

### **⚙️ FEATURES**

| Feature | Description |
| --- | --- |
| **AI Auto Reply** | Gemini 1.5 Flash replies instantly with ticket ID |
| **Email System** | Outlook SMTP sends professional confirmation email |
| **Telegram Alerts** | Instant notification to admins when new ticket comes |
| **Admin Panel** | `/admin?key=YOUR_KEY` to view and close tickets |
| **MongoDB** | All tickets saved with IP, time, status |
| **Healthcheck** | `/health` endpoint for Render monitoring |
| **Responsive UI** | Mobile-first branded support form |

---

### **🔧 MANUAL SETUP**

#### **1. Clone & Install**
```bash
git clone https://github.com/YOUR_USERNAME/teddy-xmd-support.git
cd teddy-xmd-support
npm install
