require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');
const OpenAI = require('openai');
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

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/query', apiLimiter);
app.use('/voice', apiLimiter);
app.use('/recent', apiLimiter);

// Multer for audio file uploads (store in memory for Whisper API)
const upload = multer({ storage: multer.memoryStorage() });

// OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
app.get('/recent', (req, res) => {
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
app.post('/query', async (req, res) => {
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

// POST /voice — accepts audio file, transcribes with Whisper, then processes as /query
app.post('/voice', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'audio file is required (multipart field: audio)' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured' });
  }

  try {
    // Write buffer to a temp file for OpenAI SDK.
    // Use a random hex ID (not user-provided data) to avoid path injection.
    const randomId = crypto.randomBytes(16).toString('hex');
    const tmpPath = path.join('/tmp', `voice_${randomId}.webm`);
    fs.writeFileSync(tmpPath, req.file.buffer);

    let transcript;
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tmpPath),
        model: 'whisper-1',
        language: 'ta',
      });
      transcript = transcription.text;
    } finally {
      // Clean up temp file
      try { fs.unlinkSync(tmpPath); } catch (_) {}
    }

    if (!transcript || transcript.trim() === '') {
      return res.status(422).json({ error: 'Could not transcribe audio' });
    }

    const result = await processQuery(transcript.trim());
    res.json(result);
  } catch (err) {
    console.error('POST /voice error:', err);
    res.status(500).json({ error: 'Failed to process voice input' });
  }
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
