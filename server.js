const dns = require('dns');
const https = require('https');
dns.setDefaultResultOrder('ipv4first');

// Force IPv4 at socket level for all outbound weather API requests
const ipv4HttpsAgent = new https.Agent({ family: 4 });

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. Weather API Proxy Endpoint (using wttr.in - works on all cloud platforms)
app.get('/api/weather', async (req, res) => {
  try {
    const { city } = req.query;
    if (!city) {
      return res.status(400).json({ error: 'City parameter is required.' });
    }

    // wttr.in returns full weather data in one call - no geocoding needed
    const wttrUrl = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
    const wttrResponse = await axios.get(wttrUrl, {
      httpsAgent: ipv4HttpsAgent,
      timeout: 12000,
      headers: { 'User-Agent': 'MonsoonShield/1.0 (monsoon-safety-app)' }
    });
    const wttrData = wttrResponse.data;

    const current = wttrData.current_condition?.[0];
    const nearest = wttrData.nearest_area?.[0];
    const today = wttrData.weather?.[0];

    if (!current || !nearest) {
      return res.status(404).json({ error: `City "${city}" not found or weather data unavailable.` });
    }

    const cityName = nearest.areaName?.[0]?.value || city;
    const region = nearest.region?.[0]?.value || '';
    const country = nearest.country?.[0]?.value || '';
    const precipMM = parseFloat(current.precipMM || 0);
    const windSpeedKmph = parseFloat(current.windspeedKmph || 0);
    const tempC = parseFloat(current.temp_C || 0);
    const feelsLikeC = parseFloat(current.FeelsLikeC || 0);
    const humidity = parseFloat(current.humidity || 0);
    const weatherCode = parseInt(current.weatherCode || 113);

    // Map wttr.in rain weather codes to determine rain
    const rainCodes = [293,296,299,302,305,308,311,314,353,356,359,362,365,374,377];
    const isRaining = rainCodes.includes(weatherCode);
    const rainMm = isRaining ? precipMM : 0;

    // Today's total precipitation
    const dailyRain = parseFloat(today?.hourly?.reduce((sum, h) => sum + parseFloat(h.precipMM || 0), 0) || 0);

    const result = {
      cityName,
      region,
      country,
      coords: { lat: parseFloat(nearest.latitude || 0), lon: parseFloat(nearest.longitude || 0) },
      current: {
        temp: tempC,
        feelsLike: feelsLikeC,
        humidity,
        precipitation: precipMM,
        rain: rainMm,
        windSpeed: windSpeedKmph,
        weatherCode,
        weatherDesc: current.weatherDesc?.[0]?.value || 'Unknown'
      },
      dailyRain
    };

    res.json(result);
  } catch (error) {
    console.error('Weather fetching error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to fetch weather data.' });
  }
});

// 2. Generate Plan API Endpoint (calls Gemini 3.5 Flash)

// Robust Gemini Caller with auto-fallback between multiple API keys from .env and fallback models (3.5 Flash and 1.5 Flash)
async function callGemini(contents, isJson = false) {
  const apiKeys = [
    process.env.GEMINI_API_KEY_PRIMARY,
    process.env.GEMINI_API_KEY_SECONDARY,
    process.env.GEMINI_API_KEY
  ].filter(Boolean); // removes undefined/empty env keys

  const models = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  let lastError = null;

  for (const apiKey of apiKeys) {
    for (const model of models) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      console.log(`Attempting content generation using model: ${model} with key starting with: ${apiKey.slice(0, 6)}...`);
      try {
        const response = await axios.post(
          geminiUrl,
          {
            contents,
            generationConfig: isJson ? { responseMimeType: 'application/json' } : undefined
          },
          {
            timeout: 20000 // 20 seconds timeout without forcing IPv4 agent for Google global edge network
          }
        );

        if (response.status === 200) {
          const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            console.log(`Successfully generated content using model: ${model}`);
            return text;
          }
        } else {
          lastError = `Model ${model} failed with status ${response.status}: ${JSON.stringify(response.data)}`;
          console.warn(`Key starting ${apiKey.slice(0, 6)}: ${lastError}`);
        }
      } catch (e) {
        lastError = `Model ${model} fetch error: ${e.message}`;
        if (e.response && e.response.data) {
          lastError += ` - ${JSON.stringify(e.response.data)}`;
        }
        console.warn(`Key starting ${apiKey.slice(0, 6)}: ${lastError}`);
      }
    }
  }
  throw new Error(`All Gemini API endpoints and keys are currently experiencing high demand. Last error: ${lastError}`);
}

app.post('/api/generate-plan', async (req, res) => {
  try {
    const { city, weather, houseType, familySize, vulnerableFactors, language } = req.body;

    const hasApiKey = process.env.GEMINI_API_KEY_PRIMARY || process.env.GEMINI_API_KEY_SECONDARY || process.env.GEMINI_API_KEY;
    if (!hasApiKey) {
      return res.status(500).json({ error: 'Server configuration error: Gemini API Key is missing.' });
    }

    if (!city || !weather) {
      return res.status(400).json({ error: 'City and weather data are required.' });
    }

    // Build safety alert variables
    const rain = weather.current?.rain || 0;
    const temp = weather.current?.temp || 20;
    const wind = weather.current?.windSpeed || 0;

    // Define target language prompt helper
    const targetLang = language || 'English';

    // Construct prompt
    const prompt = `
You are a highly qualified disaster manager, community helper, and weather safety advisor. Create a personalized Monsoon Preparedness & Citizen Assistance plan in the language: "${targetLang}".

Use the following real-time profile data:
- Location: ${city} (${weather.region}, ${weather.country})
- Current Weather: Temp ${temp}°C, Wind Speed ${wind} km/h, Precipitation ${rain} mm
- House Structure type: ${houseType || 'Standard House'}
- Household Size: ${familySize || 1} people
- Specific Vulnerability/Risk factors: ${vulnerableFactors || 'None (General assistance)'}

Produce a detailed structured response in JSON format. The response must follow this exact JSON schema:
{
  "safetyStatus": {
    "level": "string (one of: Normal, Warning, Critical)",
    "color": "string (one of: Green, Amber, Red)",
    "summary": "string (brief sentence describing the risk level in ${targetLang})"
  },
  "localizedAlert": "string (A real-time safety alert statement tailored to their house structure, vulnerability factors, and current weather risk in ${targetLang})",
  "preparednessPlan": [
    {
      "stage": "string (e.g. Pre-Monsoon, Active Weather, Recovery)",
      "tasks": ["string (specific safety task in ${targetLang})"]
    }
  ],
  "emergencyChecklist": [
    {
      "category": "string (e.g. Food & Water, Medical, Domestic, Safety Tools)",
      "items": [
        {
          "name": "string (item name in ${targetLang})",
          "priority": "string (High, Medium, Low)",
          "details": "string (why it is needed for their household in ${targetLang})"
        }
      ]
    }
  ],
  "travelAdvisory": {
    "status": "string (Safe, Caution, Avoid Travel)",
    "commuteRecommendation": "string (advice on transport and routes in ${targetLang})",
    "tips": ["string (safety tip for travel during active monsoons in ${targetLang})"]
  },
  "safetyRecommendations": {
    "homeProtection": ["string (hack/protection tip in ${targetLang})"],
    "healthGuideline": ["string (health/hygiene tip in ${targetLang})"],
    "emergencyContacts": [
      {
        "name": "string (service name, e.g., Disaster Control, Medical)",
        "number": "string (e.g. 108, 100, local control room)"
      }
    ]
  }
}

Instructions:
- Base the safety status on current rainfall: if rain > 15 mm, set Warning/Amber. If rain > 40 mm, set Critical/Red.
- Customize the safety advice for their house structure (e.g. if they live on the ground floor or low-lying area, highlight flood risks, power outage safety, water ingress. If they have elderly/pets, highlight medical storage and safety).
- ALL fields that are human-readable texts (like name, summary, tasks, localizedAlert, tips, details, category, name, homeProtection) MUST be returned in the requested language ("${targetLang}"). The keys of the JSON must remain exactly as defined in the schema.
`;

    const contentsPayload = [
      {
        parts: [
          {
            text: prompt
          }
        ]
      }
    ];

    const textResponse = await callGemini(contentsPayload, true);
    if (!textResponse) {
      throw new Error('Invalid response format from Gemini API.');
    }

    const parsedPlan = JSON.parse(textResponse.trim());
    res.json(parsedPlan);
  } catch (error) {
    console.error('Plan generation error:', error);
    res.status(500).json({ error: error.message || 'An internal error occurred.' });
  }
});

// 3. Multilingual Chat API Endpoint (calls Gemini 3.5 Flash)
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, city, weather, houseType, familySize, vulnerableFactors, language } = req.body;

    const hasApiKey = process.env.GEMINI_API_KEY_PRIMARY || process.env.GEMINI_API_KEY_SECONDARY || process.env.GEMINI_API_KEY;
    if (!hasApiKey) {
      return res.status(500).json({ error: 'Server configuration error: Gemini API Key is missing.' });
    }

    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const targetLang = language || 'English';

    // Build systemic context for chat
    const systemPrompt = `
You are the "MonsoonShield Rescue & Assistance Chatbot" — a supportive, intelligent emergency assistant.
Your goal is to guide users during the monsoon season and assist with emergency situations, safety tips, health advisories, travel recommendations, and checklists.

Context:
- User is located in: ${city || 'Unknown Location'}
- Household: ${familySize || 1} people, living in a ${houseType || 'Standard'} home structure.
- Vulnerabilities: ${vulnerableFactors || 'None specified'}
- Current Weather Context: ${weather ? `Temp ${weather.current?.temp}°C, Wind ${weather.current?.windSpeed} km/h, Rain ${weather.current?.rain} mm` : 'No live data'}

Instructions:
1. Speak and respond ENTIRELY in the user's preferred language: "${targetLang}" (e.g. Hindi, Marathi, Bengali, Tamil, etc.).
2. Keep responses highly actionable, structured, empathetic, and clear. Use bullet points for steps.
3. If they ask about danger or emergencies, always provide reassurance and highlight essential emergency actions first (like turning off electricity, seeking high ground, or keeping medical kits dry).
4. Do not make up facts. Focus on standard monsoon safety guidelines.
5. Use markdown formatting.
`;

    // Map message history to Gemini contents format
    const contents = [];
    
    // Add system context as user instruction at the start of conversation
    contents.push({
      role: 'user',
      parts: [{ text: systemPrompt }]
    });
    
    // Mock response to system prompt to align conversational flow
    contents.push({
      role: 'model',
      parts: [{ text: `Acknowledged. I am the MonsoonShield Rescue Assistant. I will communicate entirely in "${targetLang}" based on the user's weather and household context.` }]
    });

    // Append chat history
    if (history && history.length > 0) {
      history.forEach(chat => {
        contents.push({
          role: chat.role === 'user' ? 'user' : 'model',
          parts: [{ text: chat.text }]
        });
      });
    }

    // Append new message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const reply = await callGemini(contents, false);
    if (!reply) {
      throw new Error('Invalid response format from Gemini API.');
    }

    res.json({ reply });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message || 'An internal error occurred.' });
  }
});

// Serve frontend SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`MonsoonShield Server is running at http://localhost:${PORT}`);
});
