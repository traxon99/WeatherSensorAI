/*
WeatherSensorAI
Authors: Manu Redd, Riley England, Jackson Yanek, Evans Chigweshe
Course/Project: EECS 581 Project 3
Source Used: Generative AI (ChatGPT, Claude), Documentation (Open-Meteo API, Zippopotam.us, Nominatim, Marked.js, DOMPurify), StackOverflow
Date: 12-07-2025

File Overview and Purpose:
This file contains the main client-side JavaScript logic for WeatherSensorAI. It handles weather data 
fetching, location services (geolocation and ZIP code lookup), AI integration for summaries and chat, 
and dynamic UI updates. The file manages all user interactions including location input, weather display, 
and conversational AI features.

File Architecture:
- GetLocation() -> Promise<{lat, lng}>
  Retrieves user's current geolocation using browser API

- parseDateLocal(dateStr) -> Date
  Parameters: dateStr (string): "YYYY-MM-DD" format
  Returns: Local Date object at midnight

- UpdateWeatherInfo(location) -> Promise<{days, tempMax, tempMin, rain, wind}>
  Parameters: location (object, optional): {lat, lng, placeName}
  Fetches 7-day forecast from Open-Meteo API and updates UI

- GetGeminiResponse(type, input) -> Promise<string>
  Parameters: type (string): "summary" or "chat", input (string): user input or weather data
  Merges prompts with input and queries Gemini API

- QueryGemini(prompt) -> Promise<string>
  Parameters: prompt (string): full prompt for AI
  Sends request to backend server and returns AI response

- renderRichText(container, raw) -> void
  Parameters: container (HTMLElement), raw (string): markdown or HTML
  Safely renders markdown/HTML with DOMPurify sanitization

- trimBlankLines(text) -> string
  Parameters: text (string)
  Removes leading and trailing blank lines from text

- GetLatLngForZip(zip) -> Promise<{lat, lng, placeName}>
  Parameters: zip (string): US ZIP code
  Converts ZIP code to coordinates using Zippopotam.us API

- GetPlaceNameForLatLng(lat, lng) -> Promise<string>
  Parameters: lat (number), lng (number)
  Reverse geocodes coordinates to place name using Nominatim API

- testing() -> Promise<void>
  Initializes app on load with geolocation and weather data

- appendChatMessage(role, text) -> void
  Parameters: role (string): "user" or "assistant", text (string): message content
  Adds message bubble to chat history

- sendChat(message) -> Promise<void>
  Parameters: message (string): user's chat input
  Sends chat message to Gemini with weather context

- ensureControlsWired() -> void
  Ensures all event listeners are properly attached to UI controls
*/

/*
TODO:
    - Update how we get weather to work with the open weather API that Riley found
    - Get basic Gemini response working
    - Add chat box
    NOTE: When adding an api please DO NOT PUT THE API KEY IN THE JAVASCRIPT CODE.
    make a separate file and pull the api key.
*/
// The client gets the API key from the environment variable `GEMINI_API_KEY`.

/**
 * GetLocation - Retrieves the user's current geographic coordinates
 * Uses the browser's Geolocation API to access device location
 * Returns a Promise that resolves with latitude and longitude
 */
function GetLocation() {
  return new Promise((resolve, reject) => {
    // Check if browser supports geolocation API
    if (!navigator.geolocation) {
      reject("Geolocation not supported.");
    } else {
      // Request current position from browser (triggers permission prompt if needed)
      navigator.geolocation.getCurrentPosition(
        // Success callback: extract coordinates and resolve promise
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        // Error callback: pass error to caller (e.g., permission denied)
        (error) => reject(error)
      );
    }
  });
}

/**
 * parseDateLocal - Parse a date string like "YYYY-MM-DD" into a local Date at midnight.
 * This avoids the browser treating a bare date string as UTC and shifting the day.
 * Critical for ensuring the correct weekday/date is displayed to users in their timezone.
 * @param {string} dateStr - Date string in format "YYYY-MM-DD"
 * @returns {Date} Date object set to midnight local time
 */
function parseDateLocal(dateStr) {
  // Return invalid date if input is empty/null
  if (!dateStr) return new Date(NaN);
  
  // Split "2025-12-07" into [2025, 12, 7] and convert to numbers
  const parts = dateStr.split('-').map(Number);
  
  // Create Date with year, month (0-based, so subtract 1), day
  // Using Date constructor ensures local timezone interpretation
  return new Date(parts[0], parts[1] - 1, parts[2]);
}


/**
 * UpdateWeatherInfo - Fetches weather data and updates the UI with 7-day forecast
 * Main function for displaying weather information on the page
 * @param {Object} location - Optional location object {lat, lng, placeName}
 * @returns {Promise<Object>} Weather data object with arrays for days, temps, rain, wind
 */
async function UpdateWeatherInfo(location) {
  try {
    // Determine which coordinates to use for weather lookup
    let lat, lng, placeName;
    
    // If location object is provided (from ZIP or previous lookup), use those coordinates
    if (location && typeof location.lat === 'number') {
      lat = location.lat;
      lng = location.lng;
      placeName = location.placeName || '';  // Optional human-readable location name
    } else {
      // No location provided - request device's current position via geolocation
      const pos = await GetLocation();
      lat = pos.lat;
      lng = pos.lng;
    }

    // Build Open-Meteo API URL with all required parameters:
    // - latitude/longitude: Location coordinates
    // - daily: Comma-separated list of weather variables to fetch
    // - timezone=auto: Automatically use user's timezone for dates
    // - Units: Fahrenheit for temperature, mph for wind, inches for precipitation
    const open_meteo_url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=auto&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`;

    // Fetch weather data from Open-Meteo API
    const response = await fetch(open_meteo_url);
    const data = await response.json();

    // Get DOM elements for displaying weather cards
    const day_cards = document.getElementById('day-cards');  // Container for 7-day forecast
    const today_card = document.getElementById('today-card');  // Special card for current day

    // Clear any existing weather cards before adding new ones
    day_cards.innerHTML = '';
    today_card.innerHTML = '';

    // Extract weather data arrays from API response, use empty arrays as fallback
    const days = data.daily.time || [];  // Array of date strings ["2025-12-07", "2025-12-08", ...]
    const tempMax = data.daily.temperature_2m_max || [];  // Daily high temperatures
    const tempMin = data.daily.temperature_2m_min || [];  // Daily low temperatures
    const rain = data.daily.precipitation_sum || [];  // Daily precipitation amounts
    const wind = data.daily.wind_speed_10m_max || [];  // Daily max wind speeds

    // Validate that we received data from the API
    if (days.length === 0) {
      today_card.innerHTML = '<p>No daily data available.</p>';
      return { days: [], tempMax: [], tempMin: [], rain: [], wind: [] };
    }

    // Build today's card using the first entry (days[0])
    // Parse date string to get proper local Date object
    const todayDate = parseDateLocal(days[0]);
    // Get full weekday name (e.g., "Saturday")
    const todayName = todayDate.toLocaleDateString(undefined, { weekday: 'long' });
    
    // Populate today's card with current weather information
    // Uses template literals for clean HTML string construction
    today_card.innerHTML = `
      <h2>${todayName} (${todayDate.toLocaleDateString()})</h2>
      ${placeName ? `<p style="font-size:0.95rem; color:#0078d7; margin-bottom:6px;">${placeName}</p>` : ''}
      <p>🌡️ High: ${tempMax[0].toFixed(1)}°F | Low: ${tempMin[0].toFixed(1)}°F</p>
      <p>💧 Rain: ${rain[0]} in</p>
      <p>🌬️ Wind: ${wind[0]} mph</p>
    `;

    // Create a card for every day returned by the API
    // Loop through all days to ensure complete week display (no skipped days)
    for (let i = 0; i < days.length; i++) {
      // Parse the date string to get a proper Date object
      const date = parseDateLocal(days[i]);
      // Extract the full weekday name for display
      const weekday = date.toLocaleDateString(undefined, { weekday: 'long' });

      // Create a new div element for this day's card
      const card = document.createElement('div');
      card.className = 'day-card';  // Apply CSS styling class
      
      // Set card content with weather data for this day
      // toFixed(1) rounds temperature to one decimal place
      card.innerHTML = `
        <h3>${weekday}</h3>
        <p>${date.toLocaleDateString()}</p>
        <p>🌡️ ${tempMax[i].toFixed(1)}°F / ${tempMin[i].toFixed(1)}°F</p>
        <p>💧 ${rain[i]} in | 🌬️ ${wind[i]} mph</p>
      `;
      
      // Add the completed card to the day-cards container
      day_cards.appendChild(card);
    }
    // Build a simple text representation of weather data for AI context
    // This creates a human-readable string that will be sent to Gemini for summaries/chat
    const weatherText = days.map((d, i) => {
      const dateObj = parseDateLocal(d);  // Parse date string
      const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'long' });  // Get weekday
      const dateStr = dateObj.toLocaleDateString();  // Get formatted date
      // Format: "Saturday (12/7/2025): High 45°F Low 32°F, Rain 0in, Wind 10 mph"
      return `${dayName} (${dateStr}): High ${tempMax[i]}°F Low ${tempMin[i]}°F, Rain ${rain[i]}in, Wind ${wind[i]} mph`;
    }).join('\n');  // Join all days with newlines for readable text block
    
    // Store weather text globally for AI chat context
    // Prepend location name so Gemini knows which city/area we're discussing
    window.lastWeatherText = (placeName ? `${placeName}\n` : '') + weatherText;
    
    // Also store coordinates for potential future use
    window.currentLatLng = { lat, lng, placeName };

    // Return structured weather data for programmatic use (e.g., further processing)
    return {
      days,
      tempMax,
      tempMin,
      rain,
      wind
    };

  } catch (error) {
    console.error('Error loading weather data:', error);
    alert('Unable to fetch weather data.');
  }
}

/**
 * GetGeminiResponse - Constructs and sends prompts to Gemini AI
 * Loads prompt templates from prompts.json and combines them with user input
 * @param {string} type - Either "summary" or "chat" to determine prompt type
 * @param {string} input - Weather data or user message to append to prompt
 * @returns {Promise<string>} AI-generated response text (may contain markdown)
 */
async function GetGeminiResponse(type, input) {
    try {
        // Fetch prompt templates from external JSON file
        // This allows easy modification of AI instructions without changing code
        var response = await fetch('prompts.json');
        const prompts = await response.json();

        var full_prompt = "";

        // Build appropriate prompt based on request type
        switch (type) {
            case "summary":
                // Summary prompt: AI acts as weather expert providing analysis
                full_prompt = prompts.summary_prompt + input;
                console.log("full prompt:\n" + full_prompt);
                break;
            case "chat":
                // Chat prompt: AI answers user questions about the weather
                full_prompt = prompts.chat_prompt + input;
                console.log("full prompt:\n" + full_prompt);
                break;
        };
        
        // Send constructed prompt to backend server (which calls Gemini API)
        response = await QueryGemini(full_prompt);

        // Return the raw text from Gemini
        // Note: Markdown->HTML rendering and sanitization happens separately
        // in renderRichText() function to keep concerns separated
        return response;
    } catch(error) {
        console.error(error);
        // Return user-friendly error message if AI request fails
        return `<p>Error: ${error.message}</p>`;
    };
}; 

/**
 * renderRichText - Safely render markdown or HTML into a container
 * Converts markdown to HTML using Marked.js and sanitizes with DOMPurify
 * Prevents XSS attacks by cleaning any potentially malicious HTML
 * @param {HTMLElement} container - DOM element to insert content into
 * @param {string} raw - Raw text, markdown, or HTML string
 */
function renderRichText(container, raw) {
  // Validate container exists
  if (!container) return;
  
  // Handle empty/null content
  if (!raw) {
    container.textContent = '';
    return;
  }

  // Detect if content looks like HTML (starts with '<')
  const looksLikeHtml = /^\s*</.test(raw);
  let html = raw;
  
  try {
    // If it doesn't look like HTML and Marked.js is loaded, parse as markdown
    if (!looksLikeHtml && window.marked) {
      html = window.marked.parse(raw);  // Convert markdown syntax to HTML
    }
  } catch (e) {
    console.warn('Marked failed, inserting raw text');
    html = raw;  // Fallback to raw text if markdown parsing fails
  }

  // Sanitize HTML to prevent XSS attacks before inserting into DOM
  if (window.DOMPurify) {
    container.innerHTML = window.DOMPurify.sanitize(html);
  } else {
    // If DOMPurify not loaded, insert without sanitization (not recommended for production)
    container.innerHTML = html;
  }
}

/**
 * trimBlankLines - Remove leading/trailing blank lines from text
 * Preserves internal spacing and formatting, only cleans edges
 * @param {string} text - Text to trim
 * @returns {string} Trimmed text
 */
function trimBlankLines(text) {
  if (typeof text !== 'string') return text;
  
  // Remove all leading blank lines (lines with only whitespace)
  text = text.replace(/^(?:\s*\r?\n)+/, '');
  
  // Remove all trailing blank lines
  text = text.replace(/(?:\r?\n\s*)+$/, '');
  
  return text;
}

/**
 * QueryGemini - Send a prompt to the backend server which forwards to Gemini AI
 * Acts as the communication layer between frontend and backend API
 * @param {string} prompt - Complete prompt text to send to AI
 * @returns {Promise<string>} AI response text or error message
 */
async function QueryGemini(prompt) {
  try {
    // Make POST request to our backend server (not directly to Gemini)
    // This keeps the API key secure on the server side
    const resp = await fetch('http://localhost:5173/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },  // Indicate JSON payload
      body: JSON.stringify({ prompt })  // Send prompt in request body
    });

    // Check if request was successful (status 200-299)
    if (!resp.ok) {
      // Try to extract error message from response, fallback to empty object
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to get Gemini response');
    }

    // Parse JSON response and extract the AI's text response
    const body = await resp.json();
    return body.response || '';  // Return empty string if no response field
  } catch (error) {
    console.error('QueryGemini error:', error);
    // Return user-friendly error message that can be displayed in UI
    return `Error querying Gemini: ${error.message}`;
  }
}

/**
 * GetLatLngForZip - Convert US ZIP code to latitude/longitude coordinates
 * Uses Zippopotam.us API which provides free ZIP code lookups
 * @param {string|number} zip - US ZIP code (5 digits)
 * @returns {Promise<Object>} Object with {lat, lng, placeName} properties
 */
async function GetLatLngForZip(zip) {
  try {
    // Ensure ZIP is a string and remove whitespace
    zip = String(zip).trim();
    if (!zip) throw new Error('Empty ZIP');
    
    // Call Zippopotam.us API - format: /us/{zip_code}
    const resp = await fetch(`https://api.zippopotam.us/us/${zip}`);
    
    // API returns 404 for invalid ZIP codes
    if (!resp.ok) throw new Error('ZIP not found');
    
    const data = await resp.json();
    
    // Extract first place from results (ZIP codes can span multiple locations)
    const place = data.places && data.places[0];
    if (!place) throw new Error('ZIP not found');
    
    // Parse coordinate strings to numbers
    const lat = parseFloat(place.latitude);
    const lng = parseFloat(place.longitude);
    
    // Build human-readable location name: "City Name, ST"
    const placeName = `${place['place name']}, ${place['state abbreviation']}`;
    
    return { lat, lng, placeName };
  } catch (err) {
    console.error('GetLatLngForZip error:', err);
    throw err;  // Re-throw to let caller handle the error
  }
}

/**
 * GetPlaceNameForLatLng - Reverse geocode coordinates to human-readable place name
 * Uses OpenStreetMap's Nominatim API to convert lat/lng to city, state, country
 * @param {number} lat - Latitude coordinate
 * @param {number} lng - Longitude coordinate
 * @returns {Promise<string>} Formatted place name (e.g., "Lawrence, Kansas, USA") or empty string
 */
async function GetPlaceNameForLatLng(lat, lng) {
  try {
    // Build Nominatim reverse geocoding API URL
    // format=jsonv2 gives structured JSON response
    // encodeURIComponent prevents injection and handles special characters
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
    
    // Make request with explicit JSON accept header (required by Nominatim)
    const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!resp.ok) throw new Error('Reverse geocode failed');
    
    const data = await resp.json();
    
    // Extract address components from response
    const place = data.address || {};
    const parts = [];
    
    // Build place name hierarchically: city/town/village first
    if (place.city) parts.push(place.city);
    else if (place.town) parts.push(place.town);
    else if (place.village) parts.push(place.village);
    else if (data.name) parts.push(data.name);  // Fallback to generic name
    
    // Add state and country for context
    if (place.state) parts.push(place.state);
    if (place.country) parts.push(place.country);
    
    // Join parts with commas: "Lawrence, Kansas, USA"
    return parts.join(', ');
  } catch (err) {
    console.error('GetPlaceNameForLatLng error:', err);
    // Return empty string on error (non-critical, just means no location label)
    return '';
  }
}

/**
 * Initialize event listeners when DOM is fully loaded
 * This is the first event listener registration - sets up location control handlers
 */
document.addEventListener('DOMContentLoaded', () => {
  // Get references to location control elements
  const zipBtn = document.getElementById('zip-lookup');
  const zipInput = document.getElementById('zip-input');
  const useLoc = document.getElementById('use-location');
  const label = document.getElementById('location-label');

  // Set up ZIP code lookup button handler
  if (zipBtn && zipInput) {
    zipBtn.addEventListener('click', async () => {
      const zip = zipInput.value.trim();
      if (!zip) return;  // Don't process empty input
      
      zipBtn.disabled = true;  // Prevent multiple clicks during processing
      
      try {
        // Convert ZIP to coordinates and get place name
        const loc = await GetLatLngForZip(zip);
        
        // Display location name in UI
        if (label) label.textContent = loc.placeName;
        
        // Fetch and display weather for this location
        await UpdateWeatherInfo(loc);
        
        // Regenerate AI summary with new weather data
        const weather = window.lastWeatherText || '';
        const summaryHtml = await GetGeminiResponse('summary', weather);
        const geminiBox = document.getElementById('gemini-text-box');
        if (geminiBox) renderRichText(geminiBox, trimBlankLines(summaryHtml));
        
        // Clear chat history when location changes (old context no longer relevant)
        const history = document.getElementById('chat-history');
        if (history) history.innerHTML = '';
      } catch (err) {
        // Show error to user if ZIP lookup fails
        alert('ZIP lookup failed: ' + (err.message || err));
      } finally {
        // Re-enable button after processing completes (success or failure)
        zipBtn.disabled = false;
      }
    });
  }

  // Set up "Use My Location" button handler
  if (useLoc) {
    useLoc.addEventListener('click', async () => {
      try {
        // Clear previous location label
        label.textContent = '';
        
        // Fetch weather using device geolocation
        await UpdateWeatherInfo();
        
        // Generate new AI summary for current location
        const summaryHtml = await GetGeminiResponse('summary', window.lastWeatherText || '');
        const geminiBox = document.getElementById('gemini-text-box');
        if (geminiBox) renderRichText(geminiBox, trimBlankLines(summaryHtml));
        
        // Clear chat history for new location context
        const history = document.getElementById('chat-history');
        if (history) history.innerHTML = '';
      } catch (err) {
        // Show error if geolocation fails (permission denied, timeout, etc.)
        alert('Unable to use geolocation: ' + (err.message || err));
      }
    });
  }
});


/**
 * testing - Initialize app on page load with automatic location detection
 * Called immediately (not waiting for DOMContentLoaded) to start data loading ASAP
 * This is the main entry point that kicks off the weather display
 */
async function testing(){
  // Try to use device location and display a user-friendly place name
  try {
    // Show loading message while fetching data
    const box = document.getElementById('gemini-text-box');
    if (box) box.textContent = 'Generating AI summary...';

    // Get device coordinates via browser geolocation API
    const pos = await GetLocation();
    
    // Reverse geocode to get place name (e.g., "Lawrence, Kansas")
    // .catch(() => '') prevents errors from breaking the entire flow
    const placeName = await GetPlaceNameForLatLng(pos.lat, pos.lng).catch(() => '');
    
    // Display location name in UI label
    const label = document.getElementById('location-label');
    if (label) label.textContent = placeName || '';

    // Fetch weather data with explicit placeName so it's included in AI context
    const weather = await UpdateWeatherInfo({ lat: pos.lat, lng: pos.lng, placeName });

    // Clear any previous chat history (fresh start for new session)
    const history = document.getElementById('chat-history');
    if (history) history.innerHTML = '';

    // Generate AI summary using the weather data stored in window.lastWeatherText
    const summaryHtml = await GetGeminiResponse('summary', window.lastWeatherText || '');
    if (box) renderRichText(box, trimBlankLines(summaryHtml));

    // Note: Removed example chat call to avoid showing instruction-acknowledgement
  } catch (err) {
    // Fallback path if geolocation fails (permission denied, timeout, etc.)
    console.warn('Initial location fetch failed, falling back:', err);
    
    // Try to get weather without location parameters (will trigger permission prompt)
    const weather = await UpdateWeatherInfo();
    const box = document.getElementById('gemini-text-box');
    if (box) box.textContent = 'Generating AI summary...';

    // Build weather text manually from returned data structure
    const weatherText = weather && weather.days ?
      weather.days.map((d, i) => {
        const dateObj = parseDateLocal(d);
        const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'long' });
        const dateStr = dateObj.toLocaleDateString();
        return `${dayName} (${dateStr}): High ${weather.tempMax[i]}°F Low ${weather.tempMin[i]}°F, Rain ${weather.rain[i]}in, Wind ${weather.wind[i]} mph`;
      }).join('\n')
      : 'No weather data available.';

    // Generate AI summary with fallback weather text
    const summaryHtml = await GetGeminiResponse('summary', weatherText);
    const geminiBox = document.getElementById('gemini-text-box');
    if (geminiBox) renderRichText(geminiBox, trimBlankLines(summaryHtml));
  }
}
// Alternative: addEventListener("DOMContentLoaded", testing);
// Currently calling testing() immediately to start loading weather ASAP
testing();

/**
 * Chat helper functions for interactive weather Q&A
 */

/**
 * appendChatMessage - Add a message bubble to the chat history
 * Creates styled message elements for user and AI responses
 * @param {string} role - Either 'user' or 'assistant' to determine styling
 * @param {string} text - Message text to display
 */
function appendChatMessage(role, text) {
  const history = document.getElementById('chat-history');
  if (!history) return;  // Exit if chat container doesn't exist
  
  // Make chat history visible when first message is added
  // (CSS hides it when empty via :empty selector)
  try { history.style.display = ''; } catch(e) {}
  
  // Create new message element
  const el = document.createElement('div');
  // Apply CSS classes for bubble styling (user = right-aligned blue, assistant = left-aligned white)
  el.className = `msg ${role === 'user' ? 'user' : 'assistant'}`;
  
  if (role === 'user') {
    // User messages: plain text only (no formatting needed)
    el.innerText = text;
  } else {
    // Assistant messages: may contain markdown/HTML formatting
    // Use renderRichText to handle markdown conversion and sanitization
    renderRichText(el, text);
  }
  
  // Add message to chat history container
  history.appendChild(el);
  
  // Auto-scroll to bottom to show newest message
  history.scrollTop = history.scrollHeight;
}

/**
 * sendChat - Process and send a chat message to AI
 * Includes weather context in the prompt for relevant responses
 * @param {string} message - User's question or message
 */
async function sendChat(message) {
  // Validate message is not empty
  if (!message || !message.trim()) return;
  
  // Get UI element references
  const inputEl = document.getElementById('chat-input');
  const btn = document.getElementById('chat-send');
  
  // Display user's message immediately in chat
  appendChatMessage('user', message);
  
  // Clear input field after sending
  if (inputEl) inputEl.value = '';
  
  // Disable send button while processing (prevent duplicate sends)
  if (btn) btn.disabled = true;

  // Build context-aware prompt: include current weather data so AI can reference it
  const context = window.lastWeatherText ? `Weather summary:\n${window.lastWeatherText}\n\n` : '';
  
  // Send combined context + user message to Gemini
  const resp = await GetGeminiResponse('chat', context + message);
  
  // Display AI response in chat
  appendChatMessage('assistant', resp || 'No response');
  
  // Re-enable send button
  if (btn) btn.disabled = false;
}

/**
 * Initialize chat control event listeners when DOM is loaded
 * This is the second DOMContentLoaded listener - handles chat interface
 */
document.addEventListener('DOMContentLoaded', () => {
  const sendBtn = document.getElementById('chat-send');
  const input = document.getElementById('chat-input');
  
  if (sendBtn && input) {
    // Handle send button clicks
    sendBtn.addEventListener('click', () => sendChat(input.value));
    
    // Handle Enter key in textarea (Shift+Enter for new line, Enter to send)
    input.addEventListener('keydown', (e) => {
      // Check for Enter without Shift modifier
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();  // Prevent default new line insertion
        sendChat(input.value);  // Send the message instead
      }
      // If Shift+Enter, allow default behavior (new line)
    });
  }
});

/**
 * ensureControlsWired - Backup function to wire event listeners
 * Called both on DOMContentLoaded and immediately in case DOM is already ready
 * Uses _wired flags to prevent duplicate event listener registration
 * This ensures controls work even if script loads after page is ready
 */
function ensureControlsWired() {
  console.log('ensureControlsWired running');
  
  // ===== Chat Controls Setup =====
  const sendBtn = document.getElementById('chat-send');
  const input = document.getElementById('chat-input');
  
  // Only wire if elements exist and not already wired (check custom _wired flag)
  if (sendBtn && input && !sendBtn._wired) {
    // Wire send button click handler
    sendBtn.addEventListener('click', () => sendChat(input.value));
    
    // Wire Enter key handler for textarea
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();  // Don't insert newline
        sendChat(input.value);  // Send message instead
      }
    });
    
    // Mark as wired to prevent duplicate listeners
    sendBtn._wired = true;
  }

  // ===== ZIP Lookup Controls Setup =====
  const zipBtn = document.getElementById('zip-lookup');
  const zipInput = document.getElementById('zip-input');
  const useLoc = document.getElementById('use-location');
  
  // Wire ZIP lookup button if not already wired
  if (zipBtn && zipInput && !zipBtn._wired) {
    zipBtn.addEventListener('click', async () => {
      console.log('zip-lookup clicked, value=', zipInput.value);
      
      // Get and validate ZIP code input
      const zip = zipInput.value.trim();
      if (!zip) return;  // Don't process empty input
      
      // Disable button and show loading state
      zipBtn.disabled = true;
      const old = zipBtn.textContent;  // Save original button text
      zipBtn.textContent = 'Looking...';  // Show loading indicator
      
      try {
        // Convert ZIP to coordinates and place name
        const loc = await GetLatLngForZip(zip);
        
        // Display location name in UI
        const label = document.getElementById('location-label');
        if (label) label.textContent = loc.placeName;
        
        // Fetch and display weather for this location
        await UpdateWeatherInfo(loc);
        
        // Regenerate AI summary with new weather data
        const weather = window.lastWeatherText || '';
        const summaryHtml = await GetGeminiResponse('summary', weather);
        const geminiBox = document.getElementById('gemini-text-box');
        if (geminiBox) renderRichText(geminiBox, trimBlankLines(summaryHtml));
        
        // Clear chat history when location changes
        const history = document.getElementById('chat-history');
        if (history) history.innerHTML = '';
      } catch (err) {
        // Show user-friendly error message
        alert('ZIP lookup failed: ' + (err.message || err));
      } finally {
        // Always re-enable button and restore original text
        zipBtn.disabled = false;
        zipBtn.textContent = old;
      }
    });
    
    // Mark as wired
    zipBtn._wired = true;
  }

  // ===== Geolocation Button Setup =====
  // Wire "Use My Location" button if not already wired
  if (useLoc && !useLoc._wired) {
    useLoc.addEventListener('click', async () => {
      console.log('use-location clicked');
      
      try {
        // Clear previous location label
        const label = document.getElementById('location-label');
        if (label) label.textContent = '';

        // Request device location via browser geolocation API
        const pos = await GetLocation();
        const { lat, lng } = pos;
        
        // Reverse-geocode coordinates to human-readable place name
        const placeName = await GetPlaceNameForLatLng(lat, lng);
        if (label) label.textContent = placeName || '';

        // Update weather display with location and place name
        // Place name gets prepended to weather text for AI context
        await UpdateWeatherInfo({ lat, lng, placeName });

        // Generate new AI summary for current location
        const summaryHtml = await GetGeminiResponse('summary', window.lastWeatherText || '');
        const geminiBox = document.getElementById('gemini-text-box');
        if (geminiBox) renderRichText(geminiBox, trimBlankLines(summaryHtml));
        
        // Clear chat history for new location
        const history = document.getElementById('chat-history');
        if (history) history.innerHTML = '';
      } catch (err) {
        // Show error if geolocation fails (permission denied, timeout, etc.)
        alert('Unable to use geolocation: ' + (err.message || err));
      }
    });
    
    // Mark as wired
    useLoc._wired = true;
  }
}

/**
 * Smart initialization: Call ensureControlsWired either on DOMContentLoaded or immediately
 * This handles both cases:
 * 1. Script loads before DOM is ready: wait for DOMContentLoaded
 * 2. Script loads after DOM is ready (readyState !== 'loading'): call immediately
 */
if (document.readyState === 'loading') {
  // DOM still loading - wait for it to complete
  document.addEventListener('DOMContentLoaded', ensureControlsWired);
} else {
  // DOM already ready - wire controls immediately
  ensureControlsWired();
}
