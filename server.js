const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. Weather API Proxy Endpoint (using free Open-Meteo APIs)
app.get('/api/weather', async (req, res) => {
  try {
    const { city } = req.query;
    if (!city) {
      return res.status(400).json({ error: 'City parameter is required.' });
    }

    // Geocoding API: City to Lat/Lon
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    const geoController = new AbortController();
    const geoTimeout = setTimeout(() => geoController.abort(), 10000);
    const geoRes = await fetch(geoUrl, { signal: geoController.signal });
    clearTimeout(geoTimeout);
    if (!geoRes.ok) {
      throw new Error('Geocoding service unavailable.');
    }
    const geoData = await geoRes.json();
    if (!geoData.results || geoData.results.length === 0) {
      return res.status(404).json({ error: `City "${city}" not found.` });
    }

    const { latitude, longitude, name, country, admin1 } = geoData.results[0];

    // Forecast API: Get current and daily rain forecast
    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m&daily=precipitation_sum,rain_sum&timezone=auto`;
    const forecastController = new AbortController();
    const forecastTimeout = setTimeout(() => forecastController.abort(), 10000);
    const forecastRes = await fetch(forecastUrl, { signal: forecastController.signal });
    clearTimeout(forecastTimeout);
    if (!forecastRes.ok) {
      throw new Error('Weather forecast service unavailable.');
    }
    const forecastData = await forecastRes.json();

    const result = {
      cityName: name,
      region: admin1 || '',
      country: country || '',
      coords: { lat: latitude, lon: longitude },
      current: {
        temp: forecastData.current.temperature_2m,
        feelsLike: forecastData.current.apparent_temperature,
        humidity: forecastData.current.relative_humidity_2m,
        precipitation: forecastData.current.precipitation,
        rain: forecastData.current.rain,
        windSpeed: forecastData.current.wind_speed_10m,
        weatherCode: forecastData.current.weather_code
      },
      dailyRain: forecastData.daily?.rain_sum?.[0] || 0
    };

    res.json(result);
  } catch (error) {
    console.error('Weather fetching error:', error);
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

  const models = ['gemini-3.5-flash', 'gemini-1.5-flash'];
  let lastError = null;

  for (const apiKey of apiKeys) {
    for (const model of models) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      console.log(`Attempting content generation using model: ${model} with key starting with: ${apiKey.slice(0, 6)}...`);
      try {
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents,
            generationConfig: isJson ? { responseMimeType: 'application/json' } : undefined
          })
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            console.log(`Successfully generated content using model: ${model}`);
            return text;
          }
        } else {
          const errText = await response.text();
          lastError = `Model ${model} failed with status ${response.status}: ${errText}`;
          console.warn(`Key starting ${apiKey.slice(0, 6)}: ${lastError}`);
        }
      } catch (e) {
        lastError = `Model ${model} fetch error: ${e.message}`;
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
