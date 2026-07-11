<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=32&pause=1000&color=0072FF&center=true&vCenter=true&width=600&lines=🛡️+MonsoonShield;Stay+Prepared.+Stay+Safe.;AI-Powered+Monsoon+Assistance" alt="Typing SVG" />

<br/>

<img src="https://img.shields.io/badge/Google%20Gemini-AI%20Powered-4285F4?style=for-the-badge&logo=google&logoColor=white" />
<img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
<img src="https://img.shields.io/badge/Open--Meteo-Weather%20API-00B4D8?style=for-the-badge&logo=cloud&logoColor=white" />
<img src="https://img.shields.io/badge/Languages-6%20Indian-FF6B35?style=for-the-badge" />
<img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" />

<br/><br/>

> **GenAI-powered Monsoon Preparedness & Citizen Assistance Platform**  
> Real-time weather · AI safety plans · Emergency checklists · Travel advisories · Multilingual chatbot

<br/>

**[🚀 Live Demo](#-getting-started) · [✨ Features](#-features) · [📸 Screenshots](#-screenshots) · [🛠️ Tech Stack](#️-tech-stack) · [📖 API Docs](#-api-endpoints)**

</div>

---

## 🌧️ What is MonsoonShield?

**MonsoonShield** is a GenAI-powered web application designed to help **individuals, families, and communities** prepare for the monsoon season in India.

It uses **Google Gemini AI** + **live weather data** to provide:
- Hyper-personalized safety plans based on your **household structure** and **location**
- Real-time **weather alerts** calibrated to actual rainfall intensity
- Dynamic **emergency checklists** tailored to your vulnerabilities
- AI-generated **travel advisories** during active storms
- A **multilingual chatbot** in 6 Indian languages

---

## 📸 Screenshots

<div align="center">

### 🏠 Home — Live Weather + Preparedness Hub
![MonsoonShield Home](https://raw.githubusercontent.com/gajanan0210/monsoon-shield/main/docs/screenshots/home.png)

> *Real-time weather from Open-Meteo · AI-generated alert status · Quick navigation to all tools*

### 📋 Preparedness Plan — AI-Generated Safety Timeline
> *Gemini generates a personalized Before / During / After monsoon action plan based on your location, household, and family vulnerabilities*

### ✅ Emergency Checklist — Smart Kit Tracker
> *Interactive checklist with progress bar · Categories: Water, Food, Medical, Documents, Tools*

### 🚗 Travel Advisory — Route Safety Engine
> *AI evaluates live wind and rain data to produce safe travel guidance, route alternatives, and emergency contacts*

### 🤖 AI Assistant — Multilingual Chatbot
> *Chat in English, Hindi, Marathi, Bengali, Tamil, or Telugu · Context-aware answers about your situation*

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🌦️ Real-Time Weather Intelligence
Live weather pulled from **Open-Meteo API** — no API key required.
- Temperature & feels-like
- Humidity, wind speed, rainfall (mm)
- Weather condition with dynamic icons
- Auto-updates when you change city

</td>
<td width="50%">

### 🤖 AI Preparedness Plans
**Google Gemini** generates a full safety plan tailored to:
- Your **city's current weather** conditions
- Your **household structure** (ground floor, apartment, villa)
- **Family size** and special vulnerabilities
- Elderly, infants, pets, or medical needs

</td>
</tr>
<tr>
<td width="50%">

### ✅ Emergency Kit Checklist
Interactive kit tracker with:
- **Category-wise** checklist (Water, Food, Docs, Medical, Tools)
- Visual **progress bar** as you check items
- AI-generated based on your risk profile
- Saves progress during your session

</td>
<td width="50%">

### 🚗 Travel Advisory Engine
Before you step out:
- **Safe / Caution / Avoid Travel** status card
- Commute recommendations based on live rain
- Route safety tips for waterlogged zones
- Emergency helpline quick-dial contacts

</td>
</tr>
<tr>
<td width="50%">

### 🗣️ Multilingual AI Chatbot
Ask anything in **6 Indian languages**:
- 🇮🇳 Hindi · Marathi · Bengali · Tamil · Telugu · English
- Context-aware: knows your city, weather & household
- Markdown-formatted structured responses
- Full chat history within the session

</td>
<td width="50%">

### 🔔 Weather Alert System
Smart alert card that adapts to live data:
- 🟢 **Clear** — Normal conditions, stay prepared
- 🟡 **Moderate** — Caution on low-lying roads
- 🔴 **Severe** — Heavy rainfall warning active
- Dashboard **Recent Alerts** feed updates in real-time

</td>
</tr>
</table>

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher → [nodejs.org](https://nodejs.org)
- **Google Gemini API Key** → [Get free key at ai.google.dev](https://ai.google.dev)

### 1. Clone the Repository

```bash
git clone https://github.com/gajanan0210/monsoon-shield.git
cd monsoon-shield
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
# Copy the example env file
copy .env.example .env
```

Edit `.env` with your Gemini API keys:

```env
GEMINI_API_KEY_PRIMARY=your_primary_gemini_api_key
GEMINI_API_KEY_SECONDARY=your_backup_gemini_api_key
PORT=3000
```

> 💡 **Tip:** Add two keys for automatic fallback when one key hits quota limits or high demand. Get free keys at [ai.google.dev](https://ai.google.dev).

### 4. Start the App

```bash
npm start
```

Open your browser at **[http://localhost:3000](http://localhost:3000)** 🎉

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology | Purpose |
|-------|-----------|---------|
| 🎨 **Frontend** | HTML5, Vanilla CSS, JavaScript | Responsive UI with glassmorphism design |
| ⚙️ **Backend** | Node.js + Express.js | REST API server |
| 🤖 **AI Engine** | Google Gemini API | Plan generation, chat, alerts |
| 🌦️ **Weather** | Open-Meteo API | Free real-time weather data |
| 📍 **Geocoding** | Open-Meteo Geocoding | City → coordinates resolution |
| 🔁 **Reliability** | Dual-key + model fallback | Auto-switches between keys & models |

</div>

### AI Model Fallback Strategy

```
Request → gemini-3.5-flash (Key 1)
           ↓ if 503/429 error
         → gemini-3.5-flash (Key 2)
           ↓ if still fails
         → gemini-1.5-flash (Key 1)
           ↓ if still fails
         → gemini-1.5-flash (Key 2)
```

> Ensures **maximum uptime** during high-demand periods without interrupting the user.

---

## 📁 Project Structure

```
monsoon-shield/
│
├── 📂 public/
│   ├── 🌐 index.html          # Main SPA frontend
│   ├── ⚡ app.js               # Frontend logic & API calls
│   └── 🎨 style.css           # Premium UI design system
│
├── 🖥️  server.js              # Express backend + Gemini proxy
├── 📦  package.json           # Node.js dependencies
├── 🔒  .env                   # API secrets (not committed)
├── 📝  .env.example           # Environment template
└── 🧪  test_monsoon.js        # Backend integration tests
```

---

## 📖 API Endpoints

### `GET /api/weather?city={city}`
Fetch live weather for any city.

**Response:**
```json
{
  "cityName": "Pune",
  "region": "Maharashtra",
  "country": "India",
  "coords": { "lat": 18.51, "lon": 73.85 },
  "current": {
    "temp": 29,
    "feelsLike": 30.7,
    "humidity": 58,
    "rain": 0,
    "windSpeed": 23.3,
    "weatherCode": 3
  },
  "dailyRain": 0.1
}
```

---

### `POST /api/generate-plan`
Generate an AI safety plan.

**Request Body:**
```json
{
  "city": "Pune",
  "weather": { ... },
  "houseType": "Ground Floor / Low-Lying Area",
  "familySize": 4,
  "vulnerableFactors": "Elderly members, Infants / Kids",
  "language": "Hindi"
}
```

---

### `POST /api/chat`
Multilingual AI assistant.

**Request Body:**
```json
{
  "message": "What should I do if water enters my house?",
  "language": "Marathi",
  "city": "Pune",
  "weather": { ... },
  "history": []
}
```

---

## 🌍 Supported Languages

| Language | Script | Status |
|----------|--------|--------|
| 🇮🇳 English | Latin | ✅ Full support |
| 🇮🇳 Hindi | Devanagari | ✅ Full support |
| 🇮🇳 Marathi | Devanagari | ✅ Full support |
| 🇮🇳 Bengali | Bengali | ✅ Full support |
| 🇮🇳 Tamil | Tamil | ✅ Full support |
| 🇮🇳 Telugu | Telugu | ✅ Full support |

---

## 🏆 Hackathon Context

Built for the **Hack2Skill Main Challenge:**

> *"Design a GenAI-powered solution that helps individuals, families, and communities prepare for the monsoon season. The solution must leverage Generative AI to provide personalized preparedness plans, weather-aware guidance, emergency checklists, travel advisories, safety recommendations, multilingual assistance, and real-time alerts before, during, and after severe weather events."*

---

## 📄 License

```
MIT License

Copyright (c) 2026 MonsoonShield

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software to use, copy, modify, merge, and distribute the software.
```

---

<div align="center">

**Built with ❤️ for safer monsoon seasons across India**

⭐ **Star this repo** if MonsoonShield helps you stay safe!

[![GitHub stars](https://img.shields.io/github/stars/gajanan0210/monsoon-shield?style=social)](https://github.com/gajanan0210/monsoon-shield)

</div>
