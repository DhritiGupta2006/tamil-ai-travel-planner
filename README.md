# Tamil AI Travel Planner

An AI-powered full-stack web application that helps users plan travel itineraries across Tamil Nadu using natural language (text or voice input in Tamil/English).

---

## Architecture

```
tamil-ai-travel-planner/
  frontend/        — Next.js (React) UI with voice recording + TTS
  backend/         — Node.js + Express REST API + SQLite
  nlp/             — Python Flask NLP microservice
  database/        — SQLite database file (auto-created at runtime)
  README.md
```

### Tech Stack

| Layer     | Technology |
|-----------|-----------|
| Frontend  | Next.js 14, React 18, Browser MediaRecorder API, Web Speech API |
| Backend   | Node.js, Express, better-sqlite3, multer, OpenAI Whisper API |
| NLP       | Python 3.10+, Flask 3, regex-based intent detection |
| Database  | SQLite (via better-sqlite3) |

---

## Features

- 🗣️ **Voice input** — record audio which is transcribed via OpenAI Whisper (whisper-1 model)
- ⌨️ **Text input** — type queries in Tamil or English
- 🤖 **Intent detection** — keyword-based NLP for Tamil travel vocabulary
- 📍 **Entity extraction** — source city, destination city, travel date, budget
- 🗺️ **Itinerary generation** — Tamil-language day plans and travel option summaries
- 🔊 **Text-to-speech** — reads itinerary aloud using `window.speechSynthesis`
- 💾 **Persistent storage** — all queries and itineraries saved to SQLite
- 🕒 **Recent history** — view your last 10 travel plans

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- Python ≥ 3.10
- An OpenAI API key (for voice transcription via Whisper)

### 1. Clone the repository

```bash
git clone https://github.com/DhritiGupta2006/tamil-ai-travel-planner.git
cd tamil-ai-travel-planner
```

### 2. Start the NLP Service (Python Flask — port 5000)

```bash
cd nlp
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### 3. Start the Backend (Node.js — port 3001)

```bash
cd backend
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
npm install
npm start
```

### 4. Start the Frontend (Next.js — port 3000)

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## API Reference

### Backend (Express — `http://localhost:3001`)

| Method | Path      | Description |
|--------|-----------|-------------|
| GET    | /health   | Returns `{"status":"ok"}` |
| GET    | /recent   | Returns last 10 queries + itineraries |
| POST   | /query    | `{"text":"..."}` → NLP + itinerary generation |
| POST   | /voice    | Multipart `audio` file → Whisper transcription → same as /query |

### NLP Service (Flask — `http://localhost:5000`)

| Method | Path      | Description |
|--------|-----------|-------------|
| GET    | /health   | Returns `{"status":"ok"}` |
| POST   | /nlp      | `{"text":"..."}` → `{"intent":"...","entities":{...}}` |

**Intent values:** `plan_trip` · `get_routes` · `get_budget_trip` · `get_places`

**Entity fields:** `source` · `destination` · `date` · `budget`

---

## Database Schema

```sql
CREATE TABLE queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transcript TEXT NOT NULL,
  intent TEXT,
  entities TEXT,           -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE itineraries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query_id INTEGER NOT NULL REFERENCES queries(id),
  itinerary_text TEXT NOT NULL,
  travel_options TEXT,     -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Example Queries

- `Chennai இருந்து Madurai பயண திட்டம் தேவை`
- `Ooty க்கு பட்ஜெட் trip plan`
- `Rameswaram tourist places`
- `I want to travel from Trichy to Kanyakumari`

---

## Environment Variables

### backend/.env

| Variable          | Default                    | Description |
|-------------------|----------------------------|-------------|
| `OPENAI_API_KEY`  | —                          | Required for voice transcription |
| `PORT`            | `3001`                     | Backend port |
| `NLP_SERVICE_URL` | `http://localhost:5000`    | URL of the Flask NLP service |
| `DB_PATH`         | `../database/travel.db`    | SQLite file path (relative to backend/) |

### frontend/.env.local

| Variable                   | Default                  |
|----------------------------|--------------------------|
| `NEXT_PUBLIC_BACKEND_URL`  | `http://localhost:3001`  |

---

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT License — see the [LICENSE](LICENSE) file for details.