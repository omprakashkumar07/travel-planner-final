const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenAI, Type } = require('@google/genai');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { verifyToken } = require('./middleware/auth');

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// CORS — only allow requests from the configured frontend origin.
// In production this is set to the Netlify URL via the FRONTEND_URL env var.
const allowedOrigins = [
  process.env.FRONTEND_URL,                              // set in Render env vars
  'https://travel-planner-final-nu.vercel.app',         // Vercel production
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'null',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    // Allow exact matches from the allowedOrigins list
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow any Vercel preview / production deployment
    if (/\.vercel\.app$/.test(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// ── Serve Frontend Static Files ──────────────────────────────
// The frontend (index.html, pages/, css/, js/) lives one level
// above this backend folder.
const FRONTEND_DIR = path.join(__dirname, '..');
app.use(express.static(FRONTEND_DIR));

// ── Health Check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'TravelPlanner API',
    timestamp: new Date().toISOString()
  });
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// User data storage path
const USERS_FILE = path.join(__dirname, 'users.json');

// Helper to read users — safe against corrupt JSON
const readUsers = () => {
  try {
    if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch (e) {
    console.error('users.json corrupt — resetting:', e.message);
    fs.writeFileSync(USERS_FILE, '[]');
    return [];
  }
};

// Helper to write users
const writeUsers = (users) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

// User trips storage path
const TRIPS_FILE = path.join(__dirname, 'trips.json');

// Helper to read trips — safe against corrupt JSON
const readTrips = () => {
  try {
    if (!fs.existsSync(TRIPS_FILE)) fs.writeFileSync(TRIPS_FILE, '[]');
    return JSON.parse(fs.readFileSync(TRIPS_FILE, 'utf8'));
  } catch (e) {
    console.error('trips.json corrupt — resetting:', e.message);
    fs.writeFileSync(TRIPS_FILE, '[]');
    return [];
  }
};

// Helper to write trips
const writeTrips = (trips) => {
  fs.writeFileSync(TRIPS_FILE, JSON.stringify(trips, null, 2));
};

// ----------------------------------------
// AUTHENTICATION APIs
// ----------------------------------------

// POST /signup
app.post('/signup', async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    if (!name || !email || !mobile || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (mobile.length !== 10 || !/^\d+$/.test(mobile)) {
      return res.status(400).json({ error: 'Mobile number must be 10 digits.' });
    }

    const users = readUsers();
    
    // Check if user already exists
    if (users.find(u => u.email === email || u.mobile === mobile)) {
      return res.status(409).json({ error: 'User with this email or mobile already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      mobile,
      password: hashedPassword
    };

    users.push(newUser);
    writeUsers(users);

    // Generate JWT so the user is immediately authenticated after signup
    const tokenPayload = { id: newUser.id, name, email, mobile };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({ success: true, token, user: { id: newUser.id, name, email, mobile } });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal server error during signup.' });
  }
});

// POST /login
app.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier can be email or mobile

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/Mobile and password are required.' });
    }

    const users = readUsers();
    const user = users.find(u => u.email === identifier || u.mobile === identifier);

    if (!user) {
      return res.status(401).json({ error: 'Account not found. Please sign up.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password.' });
    }

    // Generate JWT — expires in 7 days
    const tokenPayload = { id: user.id, name: user.name, email: user.email, mobile: user.mobile };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.status(200).json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// POST /reset-password
app.post('/reset-password', async (req, res) => {
  try {
    const { identifier, newPassword } = req.body;

    if (!identifier || !newPassword) {
      return res.status(400).json({ error: 'Identifier and new password are required.' });
    }

    const users = readUsers();
    const userIndex = users.findIndex(u => u.email === identifier || u.mobile === identifier);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'Account not found. Please check your details.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    users[userIndex].password = hashedPassword;
    writeUsers(users);

    return res.status(200).json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Internal server error during password reset.' });
  }
});

// ----------------------------------------
// TRAVEL ITINERARY API
// ----------------------------------------

app.post('/chat', async (req, res) => {
  try {
    const { location, days, budget, query } = req.body;

    // Validate Input
    if (!location || !days || !budget) {
      return res.status(400).json({ error: 'Missing required fields: location, days, or budget.' });
    }

    // Ensure API Key is configured
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    console.log(`Received request for ${location} (${days} days, Budget: ${budget})`);

    // Construct the prompt
    const prompt = `
      You are a senior travel expert and itinerary planner.
      A user wants you to plan a trip with the following details:
      - Location: ${location}
      - Duration: ${days} days
      - Total Budget: ${budget}
      - User Query/Preferences: ${query || 'General trip planning'}

      Please provide a strict JSON response with:
      1. 'days': An array of objects for each day, containing 'day' (number), 'morning', 'afternoon', and 'evening' activities.
      2. 'cost': An object breaking down estimated costs for 'stay', 'food', and 'transport' based on the budget.
      3. 'tips': An array of strings containing practical travel tips for this specific location.
    `;

    // Call Gemini API to generate structured JSON output
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        // Enforce structured JSON output
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            days: {
              type: Type.ARRAY,
              description: 'An array of daily itineraries.',
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.INTEGER, description: 'Day number' },
                  morning: { type: Type.STRING, description: 'Morning activity details' },
                  afternoon: { type: Type.STRING, description: 'Afternoon activity details' },
                  evening: { type: Type.STRING, description: 'Evening activity details' }
                },
                required: ['day', 'morning', 'afternoon', 'evening']
              }
            },
            cost: {
              type: Type.OBJECT,
              description: 'Estimated cost breakdown',
              properties: {
                stay: { type: Type.STRING, description: 'Estimated cost and details for accommodation' },
                food: { type: Type.STRING, description: 'Estimated cost and details for food' },
                transport: { type: Type.STRING, description: 'Estimated cost and details for local transport' }
              },
              required: ['stay', 'food', 'transport']
            },
            tips: {
              type: Type.ARRAY,
              description: 'Array of practical travel tips',
              items: {
                type: Type.STRING
              }
            }
          },
          required: ['days', 'cost', 'tips']
        }
      }
    });

    // The response text is guaranteed to be a JSON string matching the schema
    let jsonOutput;
    try {
      jsonOutput = JSON.parse(response.text);
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', parseError);
      return res.status(500).json({ error: 'AI returned malformed data.' });
    }

    // Return the successful response
    return res.status(200).json(jsonOutput);

  } catch (error) {
    console.error('Error in /chat endpoint:', error);
    return res.status(500).json({
      error: 'Failed to generate itinerary. Please try again later.',
      details: error.message
    });
  }
});

// ----------------------------------------
// SAVE TRIP APIs
// ----------------------------------------

// POST /save-trip  ← PROTECTED: requires valid JWT
app.post('/save-trip', verifyToken, async (req, res) => {
  try {
    const { location, days, budget, itineraryJSON } = req.body;

    // userId comes from the verified JWT payload, not from the client body
    const userId = req.user.id;

    if (!location || !days || !budget || !itineraryJSON) {
      return res.status(400).json({ error: 'Missing required trip data.' });
    }

    const trips = readTrips();
    
    const newTrip = {
      tripId: Date.now().toString(),
      userId,
      place: location,
      days,
      budget,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      itinerary: itineraryJSON
    };

    trips.push(newTrip);
    writeTrips(trips);

    return res.status(201).json({ success: true, message: 'Trip saved successfully!', trip: newTrip });
  } catch (error) {
    console.error('Save trip error:', error);
    return res.status(500).json({ error: 'Failed to save trip to database.' });
  }
});

// GET /my-trips  ← PROTECTED
app.get('/my-trips', verifyToken, (req, res) => {
  try {
    const userId = req.user.id;
    const trips = readTrips();
    const userTrips = trips.filter(t => t.userId === userId);
    return res.status(200).json(userTrips);
  } catch (error) {
    console.error('Fetch trips error:', error);
    return res.status(500).json({ error: 'Failed to fetch trips.' });
  }
});

// DELETE /delete-trip/:tripId  ← PROTECTED
app.delete('/delete-trip/:tripId', verifyToken, (req, res) => {
  try {
    const userId = req.user.id;
    const { tripId } = req.params;
    const trips = readTrips();
    const idx = trips.findIndex(t => t.tripId === tripId && t.userId === userId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Trip not found or not yours to delete.' });
    }
    trips.splice(idx, 1);
    writeTrips(trips);
    return res.status(200).json({ success: true, message: 'Trip deleted.' });
  } catch (error) {
    console.error('Delete trip error:', error);
    return res.status(500).json({ error: 'Failed to delete trip.' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`🚀 TravelPlanner Backend Started`);
  console.log(`=================================`);
  console.log(`Port: ${PORT}`);
  console.log(`API Key Configured: ${process.env.GEMINI_API_KEY ? 'Yes ✅' : 'No ❌ (Update .env file)'}`);
  console.log(`\n🌐 Open your app at:`);
  console.log(`   Frontend  → http://localhost:${PORT}`);
  console.log(`   Login     → http://localhost:${PORT}/pages/login.html`);
  console.log(`   AI Chat   → http://localhost:${PORT}/pages/chat.html`);
  console.log(`   Profile   → http://localhost:${PORT}/pages/profile.html`);
  console.log(`   Health    → http://localhost:${PORT}/health`);
});
