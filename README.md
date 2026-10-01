# OneBridge AI Voice Receptionist 📞🤖

A production-ready, bilingual (English & Telugu) AI Voice Receptionist built with Node.js, Express, Twilio Voice, Google Gemini 3.6 Flash, and MongoDB Atlas.

---

## 🌟 Features

- **Voice Inbound Calling**: Handles incoming telephone calls via Twilio Voice webhook integration.
- **Bilingual Conversations**: Speaks and understands English, pure Telugu, and mixed Tenglish with real-time automatic language switching.
- **Grounded AI Persona**: Priya, Executive AI Receptionist for Mr. Vinay Avala (Founder & CEO of OneBridge Infotech).
- **JSON Knowledge Base**: Accurate responses for Custom Software Development, Website Development, Mobile Apps, CRM, ERP, OutSystems, Cybersecurity, React, Node.js, Python, Java, and Full Stack courses.
- **Lead Capture & MongoDB Persistence**: Automatically extracts and saves caller name, phone number, requirement, and call context.
- **Full Call Records & History**: Stores call duration, timestamps, lifecycle statuses, and complete multi-turn dialogue transcripts.
- **REST APIs**: Full CRUD management endpoints (`GET /leads`, `GET /calls`, `GET /history`, `POST /incoming-call`, `POST /twilio/status`).
- **Production Logging**: Non-blocking Winston logging with daily rotation (`winston-daily-rotate-file`) and call correlation IDs.
- **Render Ready**: Complete `render.yaml` blueprint with Singapore low-latency deployment and automated health checks.

---

## 🏗️ Tech Stack

- **Backend**: Node.js, Express.js
- **Telephony**: Twilio Voice (TwiML)
- **AI Brain**: Google Gemini 3.6 Flash API
- **Database**: MongoDB Atlas (Mongoose ODM)
- **Deployment**: Render Web Service
- **Logging**: Winston, Morgan, Winston Daily Rotate File

---

## 📁 Project Structure

```
Voic assitance/
├── data/
│   └── knowledge/           # JSON Knowledge Base (Company, Services, Courses, FAQs)
├── logs/                    # Rotating log files (git-ignored)
├── scripts/                 # Automated test & verification scripts
│   ├── test-gemini.js
│   ├── test-leads.js
│   ├── test-knowledge.js
│   ├── test-conversation-rules.js
│   ├── test-call-history.js
│   ├── test-rest-apis.js
│   ├── test-logging.js
│   ├── verify-production-readiness.js
│   └── tunnel.js
├── src/
│   ├── ai/                  # Gemini 3.6 Flash conversation manager
│   ├── config/              # Centralized environment & database configuration
│   ├── controllers/         # REST API & Twilio controllers
│   ├── middleware/          # Error handler, request logger, Twilio validator
│   ├── models/              # Mongoose schemas (Lead, CallRecord)
│   ├── prompts/             # Grounded system prompt & Priya persona
│   ├── routes/              # Express API & webhook routing
│   ├── services/            # Core business logic (Twilio, Lead, Call, Knowledge)
│   └── utils/               # Logger, TwiML builder, Language detector
├── server.js                # Application entry point
├── render.yaml              # Render deployment blueprint
├── DEPLOYMENT.md            # Step-by-step production deployment guide
└── package.json
```

---

## 🚀 Quick Start

### 1. Installation
```bash
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
BASE_URL=http://localhost:3000

# MongoDB Atlas
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?appName=Cluster0

# Twilio Voice
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

# Google Gemini
GEMINI_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Run Test Suites
```bash
npm run test:knowledge      # Test JSON Knowledge Base
npm run test:conversation   # Test Telugu/English language switching
npm run test:history        # Test MongoDB transcript persistence
npm run test:api            # Test REST endpoints
npm run test:logging        # Test Daily log rotation
npm run audit               # Production readiness audit
```

---

## 🌐 Deployment to Render

See the complete step-by-step guide in [`DEPLOYMENT.md`](./DEPLOYMENT.md).

---

## 📄 License
ISC © OneBridge Infotech
