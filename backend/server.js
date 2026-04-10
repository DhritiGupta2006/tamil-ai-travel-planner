require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');

const rateLimit = require('express-rate-limit');

const { getDb } = require('./db');
const { getTravelOptions } = require('./services/travelService');
const { generateItinerary } = require('./services/itineraryService');

const app = express();
const PORT = process.env.PORT || 3001;
const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || 'http://localhost:5000';

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting — applied directly on individual routes below
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// Multer for audio file uploads
const upload = multer({ storage: multer.memoryStorage() });

// ─── Helper: Call NLP service ────────────────────────────────────────────────
async function callNlpService(text) {
  try {
    const response = await axios.post(`${NLP_SERVICE_URL}/nlp`, { text }, { timeout: 10000 });
    return response.data;
  } catch (err) {
    console.error('NLP service error:', err.message);
    // Fallback NLP result
    return {
      intent: 'plan_trip',
      entities: { source: '', destination: '', date: '', budget: '' },
    };
  }
}

// ─── Helper: Process a text query end-to-end ─────────────────────────────────
async function processQuery(transcript) {
  const db = getDb();

  // 1. Call NLP service
  const nlpResult = await callNlpService(transcript);
  const { intent, entities } = nlpResult;

  // 2. Save query to DB
  const insertQuery = db.prepare(
    'INSERT INTO queries (transcript, intent, entities) VALUES (?, ?, ?)'
  );
  const queryRow = insertQuery.run(transcript, intent, JSON.stringify(entities));
  const queryId = queryRow.lastInsertRowid;

  // 3. Generate travel options + itinerary
  const travelOptions = getTravelOptions(
    entities.source,
    entities.destination,
    entities.budget
  );
  const itineraryText = generateItinerary(nlpResult, travelOptions);

  // 4. Save itinerary to DB
  const insertItinerary = db.prepare(
    'INSERT INTO itineraries (query_id, itinerary_text, travel_options) VALUES (?, ?, ?)'
  );
  const itineraryRow = insertItinerary.run(
    queryId,
    itineraryText,
    JSON.stringify(travelOptions)
  );

  return {
    queryId,
    itineraryId: itineraryRow.lastInsertRowid,
    transcript,
    intent,
    entities,
    itinerary: itineraryText,
    travelOptions,
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// GET /recent — last 10 queries with their itineraries
app.get('/recent', apiLimiter, (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT
        q.id AS query_id,
        q.transcript,
        q.intent,
        q.entities,
        q.created_at,
        i.id AS itinerary_id,
        i.itinerary_text,
        i.travel_options
      FROM queries q
      LEFT JOIN itineraries i ON i.query_id = q.id
      ORDER BY q.created_at DESC
      LIMIT 10
    `).all();

    const results = rows.map(row => ({
      queryId: row.query_id,
      transcript: row.transcript,
      intent: row.intent,
      entities: safeParseJson(row.entities),
      createdAt: row.created_at,
      itineraryId: row.itinerary_id,
      itinerary: row.itinerary_text,
      travelOptions: safeParseJson(row.travel_options),
    }));

    res.json(results);
  } catch (err) {
    console.error('GET /recent error:', err);
    res.status(500).json({ error: 'Failed to fetch recent queries' });
  }
});

// POST /query — accepts text, runs NLP + itinerary generation
app.post('/query', apiLimiter, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({ error: 'text field is required and must be a non-empty string' });
    }

    const result = await processQuery(text.trim());
    res.json(result);
  } catch (err) {
    console.error('POST /query error:', err);
    res.status(500).json({ error: 'Failed to process query' });
  }
});

// POST /voice — voice transcription requires an OpenAI API key (not configured)
app.post('/voice', apiLimiter, upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'audio file is required (multipart field: audio)' });
  }
  return res.status(501).json({
    error: 'Voice transcription is not available. Please use the text /query endpoint instead.',
  });
});

// ─── Utility ─────────────────────────────────────────────────────────────────
function safeParseJson(str) {
  try { return str ? JSON.parse(str) : null; } catch (_) { return str; }
}

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Tamil AI Travel Planner backend running on port ${PORT}`);
});

module.exports = app;
