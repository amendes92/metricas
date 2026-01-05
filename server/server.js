import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Use the provided key as fallback if environment variable is missing
const API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyDnPfZQAuZP9Hl3S734fvXM1q4UrxhXZ-w';

// Middleware
app.use(cors());
app.use(express.json());

if (!API_KEY) {
  console.error("ERRO CRÍTICO: GOOGLE_API_KEY não definida.");
} else {
  console.log(`Server initialized with API Key: ${API_KEY.substring(0, 8)}...`);
}

// Initialize Gemini Client (Server Side)
const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- ROUTES ---

// 0. Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'online', timestamp: new Date().toISOString() });
});

// 1. Geocoding Proxy
app.get('/api/coordinates', async (req, res) => {
  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'Address is required' });

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Geocoding Error:', error);
    res.status(500).json({ error: 'Failed to fetch coordinates' });
  }
});

// 2. Solar API Proxy (Solves CORS)
app.get('/api/solar-potential', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'Lat and Lng are required' });

  try {
    const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=HIGH&key=${API_KEY}`;
    const response = await fetch(url);
    
    // Pass specific status codes
    if (response.status === 404) {
      return res.status(404).json({ error: 'No solar data found for location' });
    }
    
    if (!response.ok) {
       const text = await response.text();
       console.error('Solar API Upstream Error:', text);
       return res.status(response.status).json({ error: 'Solar API Error' });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Solar API Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2.1 Solar Data Layers (New)
app.get('/api/solar-layers', async (req, res) => {
  const { lat, lng, radius_meters } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'Lat and Lng are required' });

  const radius = radius_meters || 100;

  try {
    // https://solar.googleapis.com/v1/dataLayers:get
    const url = `https://solar.googleapis.com/v1/dataLayers:get?location.latitude=${lat}&location.longitude=${lng}&radiusMeters=${radius}&view=FULL_LAYERS&requiredQuality=HIGH&key=${API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      console.error('Solar Layers API Error:', text);
      return res.status(response.status).json({ error: 'Failed to fetch Data Layers' });
    }

    const data = await response.json();
    // Returns URLs for GeoTIFFs (mask, dsm, rgb, annualFlux, monthlyFlux, hourlyShade)
    res.json(data);
  } catch (error) {
    console.error('Solar Layers Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. Static Map Proxy (Hides API Key in <img src>)
app.get('/api/static-map', async (req, res) => {
    const { lat, lng, zoom, size } = req.query;
    if (!lat || !lng) return res.status(400).send('Missing parameters');

    const z = zoom || 19;
    const s = size || '600x400';
    
    const url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${z}&size=${s}&maptype=satellite&markers=color:orange%7C${lat},${lng}&key=${API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch image');
        
        // Pipe the image stream directly to the client
        const buffer = await response.arrayBuffer();
        res.set('Content-Type', 'image/png');
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error('Static Map Error:', error);
        res.status(500).send('Error fetching map');
    }
});

// 4. Gemini Report Generation
app.post('/api/generate-report', async (req, res) => {
  const { prompt, modelId, config } = req.body;

  try {
    const response = await ai.models.generateContent({
      model: modelId || 'gemini-2.5-flash',
      contents: prompt,
      config: config || {}
    });
    
    res.json({ text: response.text });
  } catch (error) {
    console.error('Gemini Report Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate report' });
  }
});

// 5. Gemini Chat
app.post('/api/chat', async (req, res) => {
  const { history, message, systemInstruction } = req.body;

  try {
    // Create chat session
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        history: history || [],
        config: {
            systemInstruction: systemInstruction,
            tools: [{ googleSearch: {} }] // Keep search tool active
        }
    });

    const result = await chat.sendMessage({ message });
    res.json({ text: result.text });
  } catch (error) {
    console.error('Gemini Chat Error:', error);
    res.status(500).json({ error: error.message || 'Failed to chat' });
  }
});

// 6. Route Optimization (Google Routes API)
app.post('/api/optimize-route', async (req, res) => {
  const { origin, destinations } = req.body;

  if (!origin || !destinations || !Array.isArray(destinations)) {
      return res.status(400).json({ error: 'Origin and destinations array required' });
  }

  try {
      // Construct Body for Routes API
      const body = {
          origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
          destination: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } }, // Round trip
          intermediates: destinations.map(d => ({
              location: { latLng: { latitude: d.lat, longitude: d.lng } }
          })),
          travelMode: 'DRIVE',
          optimizeWaypointOrder: true,
      };

      // Call Google Routes API
      const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': API_KEY,
              'X-Goog-FieldMask': 'routes.optimizedIntermediateWaypointIndex,routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
          },
          body: JSON.stringify(body)
      });

      if (!response.ok) {
          const err = await response.text();
          console.error('Routes API Error:', err);
          throw new Error('Failed to compute route');
      }

      const data = await response.json();
      
      // Check if route exists
      if (!data.routes || data.routes.length === 0) {
          return res.status(404).json({ error: 'No route found' });
      }

      const route = data.routes[0];
      
      // Return processed data
      res.json({
          encodedPolyline: route.polyline.encodedPolyline,
          waypointOrder: route.optimizedIntermediateWaypointIndex, // The new order of indices
          distanceMeters: route.distanceMeters,
          duration: route.duration
      });

  } catch (error) {
      console.error('Optimization Logic Error:', error);
      res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});