# WeatherSensorAI Backend

Simple Express.js backend server for integrating Google Gemini API with the Weather App.

## Setup

1. Install dependencies:
```bash
cd src/backend
npm install
```

2. Create a `.env` file from the example:
```bash
cp .env.example .env
```

3. Add your Gemini API key to `.env`:
```
GEMINI_API_KEY=your_actual_api_key_here
```

Get your API key from: https://aistudio.google.com/app/apikey

## Running the Server

Start the server:
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

The server will run on `http://localhost:5173` by default.

## API Endpoint

### POST `/api/gemini`

Send prompts to the Gemini API.

**Request Body:**
```json
{
  "prompt": "Your prompt text here"
}
```

**Response:**
```json
{
  "response": "Gemini's response text"
}
```

**Example:**
```bash
curl -X POST http://localhost:5173/api/gemini \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Explain weather patterns"}'
```
