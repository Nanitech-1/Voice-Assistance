# OneBridge AI Voice Receptionist — Render Deployment Guide 🚀

This guide provides step-by-step instructions to deploy the application to **Render** and connect your live **Twilio Voice Number**.

---

## Architecture Overview

```
[ Incoming Call ]
       │
       ▼
[ Twilio Voice ]
       │  POST https://your-app.onrender.com/incoming-call
       ▼
[ Render Web Service (Node.js) ]
       ├── [ Google Gemini 3.6 Flash ]  (AI Voice Logic & Telugu/English Switching)
       ├── [ JSON Knowledge Base ]      (OneBridge Services, Courses, FAQs, Pricing)
       └── [ MongoDB Atlas ]            (Leads, Call Metrics, Transcripts)
```

---

## Pre-Deployment Checklist

Ensure you have your credentials ready:
- [x] **MongoDB Atlas URI**: `mongodb+srv://...` (Network Access `0.0.0.0/0` whitelisted)
- [x] **Twilio Account SID**: `AC29afebf9...`
- [x] **Twilio Auth Token**: `db644f341a...`
- [x] **Twilio Phone Number**: (e.g. `+19804737692`)
- [x] **Google Gemini API Key**: `AIzaSy...` or Google AI Studio key
- [x] **GitHub Account**: To host the repository

---

## Step 1: Initialize Git and Push to GitHub

In your project directory (`c:\Users\user\Voic assitance`):

```bash
# 1. Initialize git (if not already done)
git init

# 2. Add all files (secrets in .env are automatically ignored)
git add .

# 3. Commit
git commit -m "feat: production ready AI voice receptionist (Phases 1-9)"

# 4. Set main branch
git branch -M main

# 5. Link to your GitHub repository (create an empty repo on github.com first)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git

# 6. Push code
git push -u origin main
```

---

## Step 2: Deploy to Render

### Option A: Using Render Blueprint (`render.yaml`) — Recommended
1. Log in to **[dashboard.render.com](https://dashboard.render.com)**.
2. Click **New +** → **Blueprint**.
3. Connect your GitHub repository.
4. Render will read `render.yaml` and configure the service automatically.
5. Fill in the requested secret environment variables:
   - `MONGO_URI`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
   - `GEMINI_API_KEY`
6. Click **Apply**.

### Option B: Manual Web Service Setup
1. Log in to **[dashboard.render.com](https://dashboard.render.com)**.
2. Click **New +** → **Web Service**.
3. Select your GitHub repository.
4. Configure:
   - **Name**: `onebridge-ai-voice-receptionist`
   - **Region**: `Singapore` (Fastest latency for India/Hyderabad)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Starter` (or `Free`)
5. Under **Advanced** → **Add Environment Variables**:

| Key | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Enables production security & JSON logging |
| `LOG_LEVEL` | `info` | Logging verbosity |
| `MONGO_URI` | `mongodb+srv://...` | Your MongoDB Atlas connection string |
| `TWILIO_ACCOUNT_SID` | `AC...` | From Twilio Console |
| `TWILIO_AUTH_TOKEN` | `...` | From Twilio Console |
| `TWILIO_PHONE_NUMBER` | `+1...` | Your Twilio Phone Number |
| `GEMINI_API_KEY` | `...` | Your Gemini API Key |
| `BASE_URL` | `https://onebridge-ai-voice-receptionist.onrender.com` | Your Render service URL |

6. Click **Create Web Service**.

---

## Step 3: Verify Deployment

Once Render finishes building:

1. **Health Check**:
   Open in your browser:
   `https://your-service-name.onrender.com/health`
   Expected response:
   ```json
   {
     "success": true,
     "message": "OneBridge AI Voice Receptionist is running",
     "timestamp": "2026-09-02T...",
     "environment": "production"
   }
   ```

2. **REST API Leads Check**:
   `https://your-service-name.onrender.com/leads`
   Expected response:
   ```json
   {
     "success": true,
     "count": 0,
     "data": []
   }
   ```

---

## Step 4: Configure Twilio Phone Number

1. Go to the **[Twilio Console](https://console.twilio.com)**.
2. Navigate to: **Phone Numbers** → **Manage** → **Active Numbers**.
3. Click on your phone number.
4. Scroll down to the **Voice Configuration** section:
   - **A CALL COMES IN**: Select **Webhook**
   - **URL**: `https://your-service-name.onrender.com/incoming-call` (or `/twilio/incoming-call`)
   - **HTTP METHOD**: `HTTP POST`
   - **CALL STATUS CHANGES**:
     - **URL**: `https://your-service-name.onrender.com/twilio/status`
     - **HTTP METHOD**: `HTTP POST`
5. Click **Save Configuration**.

---

## Step 5: Test Live Call! 📞

1. Call your Twilio phone number from your mobile.
2. Priya will answer:
   > *"Hello! Thank you for calling OneBridge Infotech. I am Priya, the AI executive receptionist for Vinay. How can I help you today?"*
3. Speak in **English** or **Telugu** (*"Namaste andi, mee courses gurinchi cheppandi"*).
4. Notice automatic language switching, lead capture, and instant call transcript saving in MongoDB Atlas!

---

## Monitoring & Logs

- View live application logs directly in the **Render Dashboard** → **Logs** tab.
- Query captured leads and transcripts anytime via:
  - `GET /leads`
  - `GET /calls`
  - `GET /history/:callSid`
