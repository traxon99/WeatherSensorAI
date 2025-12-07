# WeatherSensorAI

An intelligent weather application that combines real-time weather data with AI-powered summaries and interactive chat capabilities. Built as part of EECS 581 at the University of Kansas.

## Overview

WeatherSensorAI fetches 7-day weather forecasts and leverages Google's Gemini AI to provide intelligent weather summaries, warnings, and answer weather-related questions through an interactive chat interface.

## Features

- **Real-time Weather Data**: Retrieves 7-day forecasts using the Open-Meteo API
- **Location Services**: 
  - Automatic geolocation detection
  - ZIP code lookup with reverse geocoding
  - Location display with city and state information
- **AI-Powered Insights**: 
  - Automated weather summaries with important warnings and suggestions
  - Interactive chat interface for weather-related questions
  - Context-aware responses using Gemini 2.0 Flash model
- **Modern UI**: 
  - Clean, responsive design with gradient backgrounds
  - Daily and weekly weather cards
  - Real-time chat bubbles with markdown support
- **Data Display**:
  - Temperature highs/lows (°F)
  - Precipitation amounts (inches)
  - Wind speeds (mph)
  - Date and weekday information

## Tech Stack

### Frontend
- **HTML5** - Structure and layout
- **CSS3** - Modern styling with gradients and animations
- **Vanilla JavaScript** - Client-side logic and API integration
- **External Libraries**:
  - [Marked.js](https://marked.js.org/) - Markdown to HTML conversion
  - [DOMPurify](https://github.com/cure53/DOMPurify) - HTML sanitization

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web server framework
- **Dependencies**:
  - `@google/generative-ai` - Gemini AI integration
  - `cors` - Cross-origin resource sharing
  - `dotenv` - Environment variable management

### APIs
- **Open-Meteo API** - Weather forecast data
- **Google Gemini API** - AI-powered summaries and chat
- **Zippopotam.us** - ZIP code to coordinates conversion
- **OpenStreetMap Nominatim** - Reverse geocoding

## Project Structure

```
WeatherSensorAI/
├── Documentation/
│   ├── Sprint1/
│   ├── Sprint2/
│   ├── Sprint3/
│   └── Sprint4/
├── src/
│   ├── backend/
│   │   ├── package.json
│   │   └── server.js
│   └── frontend/
│       ├── index.html
│       ├── script.js
│       ├── styles.css
│       └── prompts.json
└── README.md
```

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Google Gemini API key

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/traxon99/WeatherSensorAI.git
   cd WeatherSensorAI
   ```

2. **Install backend dependencies**
   ```bash
   cd src/backend
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the `src/backend` directory:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=5173
   ```
   
   To obtain a Gemini API key:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Sign in with your Google account
   - Create a new API key

4. **Start the backend server**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

5. **Open the frontend**
   
   Open `src/frontend/index.html` in your web browser, or serve it using a local server:
   ```bash
   # Using Python 3
   cd src/frontend
   python3 -m http.server 8000
   ```
   Then navigate to `http://localhost:8000`

## Usage

### Getting Weather Information

1. **Using Geolocation**:
   - Click "Use My Location" button
   - Allow browser location permissions when prompted
   - Weather data will load automatically with your current location

2. **Using ZIP Code**:
   - Enter a valid US ZIP code in the input field
   - Click "Lookup" button
   - Weather data will load for the specified location

### AI Features

1. **Weather Summary**:
   - Automatically generated when weather data loads
   - Provides overview, warnings, and suggestions
   - Updates when location changes

2. **Chat Interface**:
   - Ask questions about the weather in natural language
   - AI responds with context-aware answers
   - Press Enter or click "Send" to submit questions
   - Chat history is preserved until location changes

## API Endpoints

### Backend Server

**POST** `/api/gemini`
- **Description**: Sends prompts to Gemini AI and returns responses
- **Request Body**:
  ```json
  {
    "prompt": "string"
  }
  ```
- **Response**:
  ```json
  {
    "response": "string"
  }
  ```
- **Error Response**:
  ```json
  {
    "error": "string",
    "details": "string"
  }
  ```

## Configuration

### Prompts Configuration (`prompts.json`)

The application uses customizable prompts for AI interactions:

```json
{
  "chat_prompt": "You are a weather expert AI. Answer the user's question directly and concisely. Use the provided weather context when relevant.",
  "summary_prompt": "You are a weather expert. Summarize the following weather information and add important weather-related warnings and suggestions. User context: "
}
```

Modify these prompts to customize AI behavior and response style.

## Development

### Running in Development Mode

```bash
cd src/backend
npm run dev
```

This uses `nodemon` for automatic server restarts on file changes.

### Code Structure

**Frontend (`script.js`)**:
- `GetLocation()` - Retrieves user's geolocation
- `UpdateWeatherInfo(location)` - Fetches and displays weather data
- `GetGeminiResponse(type, input)` - Queries AI for summaries or chat
- `QueryGemini(prompt)` - Backend API communication
- `GetLatLngForZip(zip)` - ZIP code to coordinates conversion
- `GetPlaceNameForLatLng(lat, lng)` - Reverse geocoding

**Backend (`server.js`)**:
- Express server with CORS enabled
- Single endpoint for Gemini API proxy
- Environment variable validation
- Error handling with fallback responses

## Browser Compatibility

- Modern browsers with ES6+ support
- Geolocation API support required for location features
- Tested on Chrome, Firefox, Safari, and Edge

## Known Limitations

- ZIP code lookup limited to United States only
- Requires active internet connection
- Gemini API rate limits apply
- Weather data limited to 7-day forecast

## Future Enhancements

- Support for international postal codes
- Historical weather data
- Weather alerts and notifications
- Mobile app version
- Multi-language support
- User preferences and saved locations

## License

This project is part of an academic assignment at the University of Kansas.

## Contributors

EECS 581 Team Project, University of Kansas - Manu Redd, Riley England, Jackson Yanek, Evans Chigweshe


## Acknowledgments

- Open-Meteo for free weather API access
- Google for Gemini AI API
- OpenStreetMap for geocoding services
- Zippopotam.us for ZIP code data

## Support

For issues or questions, please refer to the course materials or contact the development team.

---

**Last Updated**: December 2025
