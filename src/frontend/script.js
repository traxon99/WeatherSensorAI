
/*
TODO:
    - Update how we get weather to work with the open weather API that Riley found
    - Get basic Gemini response working
    - Add chat box
    NOTE: When adding an api please DO NOT PUT THE API KEY IN THE JAVASCRIPT CODE.
    make a separate file and pull the api key.
*/
// The client gets the API key from the environment variable `GEMINI_API_KEY`.


function GetLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject("Geolocation not supported.");
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => reject(error)
      );
    }
  });
}

// Parse a date string like "YYYY-MM-DD" into a local Date at midnight.
// This avoids the browser treating a bare date string as UTC and shifting the day.
function parseDateLocal(dateStr) {
  if (!dateStr) return new Date(NaN);
  const parts = dateStr.split('-').map(Number);
  // year, month (0-based), day
  return new Date(parts[0], parts[1] - 1, parts[2]);
}


async function UpdateWeatherInfo(location) {
  try {
    // If a location object is provided (with lat/lng) use it, otherwise ask for geolocation
    let lat, lng, placeName;
    if (location && typeof location.lat === 'number') {
      lat = location.lat;
      lng = location.lng;
      placeName = location.placeName || '';
    } else {
      const pos = await GetLocation();
      lat = pos.lat;
      lng = pos.lng;
    }

    // Request daily forecast for next 7 days (timezone=auto keeps dates aligned to user)
    // Request imperial units: temperature in Fahrenheit, wind in mph, precipitation in inches
    const open_meteo_url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=auto&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`;

    const response = await fetch(open_meteo_url);
    const data = await response.json();

    const day_cards = document.getElementById('day-cards');
    const today_card = document.getElementById('today-card');

  day_cards.innerHTML = '';
  today_card.innerHTML = '';

    const days = data.daily.time || [];
    const tempMax = data.daily.temperature_2m_max || [];
    const tempMin = data.daily.temperature_2m_min || [];
    const rain = data.daily.precipitation_sum || [];
    const wind = data.daily.wind_speed_10m_max || [];

    if (days.length === 0) {
      today_card.innerHTML = '<p>No daily data available.</p>';
      return { days: [], tempMax: [], tempMin: [], rain: [], wind: [] };
    }

    // Build today's card using the first entry (days[0])
    const todayDate = parseDateLocal(days[0]);
    const todayName = todayDate.toLocaleDateString(undefined, { weekday: 'long' });
    today_card.innerHTML = `
      <h2>${todayName} (${todayDate.toLocaleDateString()})</h2>
      ${placeName ? `<p style="font-size:0.95rem; color:#0078d7; margin-bottom:6px;">${placeName}</p>` : ''}
      <p>🌡️ High: ${tempMax[0].toFixed(1)}°F | Low: ${tempMin[0].toFixed(1)}°F</p>
      <p>💧 Rain: ${rain[0]} in</p>
      <p>🌬️ Wind: ${wind[0]} mph</p>
    `;

    // Create a card for every day returned by the API (this avoids skipping Monday)
    for (let i = 0; i < days.length; i++) {
      const date = parseDateLocal(days[i]);
      const weekday = date.toLocaleDateString(undefined, { weekday: 'long' });

      const card = document.createElement('div');
      card.className = 'day-card';
        card.innerHTML = `
        <h3>${weekday}</h3>
        <p>${date.toLocaleDateString()}</p>
        <p>🌡️ ${tempMax[i].toFixed(1)}°F / ${tempMin[i].toFixed(1)}°F</p>
        <p>💧 ${rain[i]} in | 🌬️ ${wind[i]} mph</p>
      `;
      day_cards.appendChild(card);
    }
    // Build a simple text representation (include weekday names) and save to window for chat context
    const weatherText = days.map((d, i) => {
      const dateObj = parseDateLocal(d);
      const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'long' });
      const dateStr = dateObj.toLocaleDateString();
      return `${dayName} (${dateStr}): High ${tempMax[i]}°F Low ${tempMin[i]}°F, Rain ${rain[i]}in, Wind ${wind[i]} mph`;
    }).join('\n');
    // Prepend place name if present so Gemini sees location
    window.lastWeatherText = (placeName ? `${placeName}\n` : '') + weatherText;
    window.currentLatLng = { lat, lng, placeName };

    // Return structured weather data for consumers (e.g., AI summaries)
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

async function GetGeminiResponse(type, input) {
    // merge prompts and sent to Gemini, then return html with gemini response
    try {
        //fetch prompts from json file
        var response = await fetch('prompts.json');
        const prompts = await response.json();

        var full_prompt = "";

        switch (type) {
            case "summary":
                full_prompt = prompts.summary_prompt + input;
                console.log("full prompt:\n" + full_prompt);
                break;
            case "chat":
                full_prompt = prompts.chat_prompt + input;
                console.log("full prompt:\n" + full_prompt);
                break;
        };
        response = await QueryGemini(full_prompt);

        // Return the raw text from Gemini. Rendering (markdown -> HTML)
        // and sanitization will be done by the renderer function.
        return response;
    } catch(error) {
        console.error(error);
        return `<p>Error: ${error.message}</p>`;
    };
}; 

// Helper: safely render markdown or HTML into a container
function renderRichText(container, raw) {
  if (!container) return;
  if (!raw) {
    container.textContent = '';
    return;
  }

  const looksLikeHtml = /^\s*</.test(raw);
  let html = raw;
  try {
    if (!looksLikeHtml && window.marked) {
      html = window.marked.parse(raw);
    }
  } catch (e) {
    console.warn('Marked failed, inserting raw text');
    html = raw;
  }

  if (window.DOMPurify) {
    container.innerHTML = window.DOMPurify.sanitize(html);
  } else {
    container.innerHTML = html;
  }
}

// Trim leading/trailing blank lines from a text block (preserves internal spacing)
function trimBlankLines(text) {
  if (typeof text !== 'string') return text;
  // remove leading blank lines
  text = text.replace(/^(?:\s*\r?\n)+/, '');
  // remove trailing blank lines
  text = text.replace(/(?:\r?\n\s*)+$/, '');
  return text;
}

async function QueryGemini(prompt) {
  try {
    const resp = await fetch('http://localhost:5173/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to get Gemini response');
    }

    const body = await resp.json();
    return body.response || '';
  } catch (error) {
    console.error('QueryGemini error:', error);
    return `Error querying Gemini: ${error.message}`;
  }
}

// Resolve a ZIP code to lat/lng using Zippopotam.us (US only)
async function GetLatLngForZip(zip) {
  try {
    zip = String(zip).trim();
    if (!zip) throw new Error('Empty ZIP');
    const resp = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!resp.ok) throw new Error('ZIP not found');
    const data = await resp.json();
    const place = data.places && data.places[0];
    if (!place) throw new Error('ZIP not found');
    const lat = parseFloat(place.latitude);
    const lng = parseFloat(place.longitude);
    const placeName = `${place['place name']}, ${place['state abbreviation']}`;
    return { lat, lng, placeName };
  } catch (err) {
    console.error('GetLatLngForZip error:', err);
    throw err;
  }
}

// Reverse-geocode lat/lng to a place name using Nominatim (OpenStreetMap)
async function GetPlaceNameForLatLng(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
    const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!resp.ok) throw new Error('Reverse geocode failed');
    const data = await resp.json();
    // Try to build a concise place name
    const place = data.address || {};
    const parts = [];
    if (place.city) parts.push(place.city);
    else if (place.town) parts.push(place.town);
    else if (place.village) parts.push(place.village);
    else if (data.name) parts.push(data.name);
    if (place.state) parts.push(place.state);
    if (place.country) parts.push(place.country);
    return parts.join(', ');
  } catch (err) {
    console.error('GetPlaceNameForLatLng error:', err);
    return '';
  }
}

// Hook up ZIP lookup and location controls
document.addEventListener('DOMContentLoaded', () => {
  const zipBtn = document.getElementById('zip-lookup');
  const zipInput = document.getElementById('zip-input');
  const useLoc = document.getElementById('use-location');
  const label = document.getElementById('location-label');

  if (zipBtn && zipInput) {
    zipBtn.addEventListener('click', async () => {
      const zip = zipInput.value.trim();
      if (!zip) return;
      zipBtn.disabled = true;
      try {
        const loc = await GetLatLngForZip(zip);
        if (label) label.textContent = loc.placeName;
        await UpdateWeatherInfo(loc);
        // regenerate summary and clear chat
        const weather = window.lastWeatherText || '';
        const summaryHtml = await GetGeminiResponse('summary', weather);
        const geminiBox = document.getElementById('gemini-text-box');
        if (geminiBox) renderRichText(geminiBox, trimBlankLines(summaryHtml));
        const history = document.getElementById('chat-history');
        if (history) history.innerHTML = '';
      } catch (err) {
        alert('ZIP lookup failed: ' + (err.message || err));
      } finally {
        zipBtn.disabled = false;
      }
    });
  }

  if (useLoc) {
    useLoc.addEventListener('click', async () => {
      try {
        label.textContent = '';
        await UpdateWeatherInfo();
        const summaryHtml = await GetGeminiResponse('summary', window.lastWeatherText || '');
        const geminiBox = document.getElementById('gemini-text-box');
        if (geminiBox) renderRichText(geminiBox, trimBlankLines(summaryHtml));
        const history = document.getElementById('chat-history');
        if (history) history.innerHTML = '';
      } catch (err) {
        alert('Unable to use geolocation: ' + (err.message || err));
      }
    });
  }
});


async function testing(){
  // On first load, try to use device location and include a human-friendly place name
  try {
    const box = document.getElementById('gemini-text-box');
    if (box) box.textContent = 'Generating AI summary...';

    const pos = await GetLocation();
    const placeName = await GetPlaceNameForLatLng(pos.lat, pos.lng).catch(() => '');
    const label = document.getElementById('location-label');
    if (label) label.textContent = placeName || '';

    // Update weather with explicit placeName so window.lastWeatherText includes it
    const weather = await UpdateWeatherInfo({ lat: pos.lat, lng: pos.lng, placeName });

    // Clear chat history when loading a new context
    const history = document.getElementById('chat-history');
    if (history) history.innerHTML = '';

    // Generate summary using the prepared window.lastWeatherText
    const summaryHtml = await GetGeminiResponse('summary', window.lastWeatherText || '');
    if (box) renderRichText(box, trimBlankLines(summaryHtml));

    // Removed example chat call to avoid showing instruction-acknowledgement
  } catch (err) {
    // If anything fails (permissions, network), fall back to original flow
    console.warn('Initial location fetch failed, falling back:', err);
    const weather = await UpdateWeatherInfo();
    const box = document.getElementById('gemini-text-box');
    if (box) box.textContent = 'Generating AI summary...';

    // Removed fallback example chat call to avoid showing instruction-acknowledgement

    const weatherText = weather && weather.days ?
      weather.days.map((d, i) => {
        const dateObj = parseDateLocal(d);
        const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'long' });
        const dateStr = dateObj.toLocaleDateString();
        return `${dayName} (${dateStr}): High ${weather.tempMax[i]}°F Low ${weather.tempMin[i]}°F, Rain ${weather.rain[i]}in, Wind ${weather.wind[i]} mph`;
      }).join('\n')
      : 'No weather data available.';

    const summaryHtml = await GetGeminiResponse('summary', weatherText);
    const geminiBox = document.getElementById('gemini-text-box');
    if (geminiBox) renderRichText(geminiBox, trimBlankLines(summaryHtml));
  }
}
// addEventListener("DOMContentLoaded", testing);
testing();

// Chat helpers: append messages and send to Gemini with weather context
function appendChatMessage(role, text) {
  const history = document.getElementById('chat-history');
  if (!history) return;
  // Ensure the chat-history is visible when adding messages
  try { history.style.display = ''; } catch(e) {}
  const el = document.createElement('div');
  el.className = `msg ${role === 'user' ? 'user' : 'assistant'}`;
  if (role === 'user') {
    el.innerText = text;
  } else {
    // assistant content may be markdown/HTML
    renderRichText(el, text);
  }
  history.appendChild(el);
  history.scrollTop = history.scrollHeight;
}

async function sendChat(message) {
  if (!message || !message.trim()) return;
  const inputEl = document.getElementById('chat-input');
  const btn = document.getElementById('chat-send');
  appendChatMessage('user', message);
  if (inputEl) inputEl.value = '';
  if (btn) btn.disabled = true;

  // Include the last weather summary as context if available
  const context = window.lastWeatherText ? `Weather summary:\n${window.lastWeatherText}\n\n` : '';
  const resp = await GetGeminiResponse('chat', context + message);
  appendChatMessage('assistant', resp || 'No response');
  if (btn) btn.disabled = false;
}

// Wire chat controls
document.addEventListener('DOMContentLoaded', () => {
  const sendBtn = document.getElementById('chat-send');
  const input = document.getElementById('chat-input');
  if (sendBtn && input) {
    sendBtn.addEventListener('click', () => sendChat(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChat(input.value);
      }
    });
  }
});

// Ensure controls are wired even if DOMContentLoaded already fired
function ensureControlsWired() {
  console.log('ensureControlsWired running');
  const sendBtn = document.getElementById('chat-send');
  const input = document.getElementById('chat-input');
  if (sendBtn && input && !sendBtn._wired) {
    sendBtn.addEventListener('click', () => sendChat(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChat(input.value);
      }
    });
    sendBtn._wired = true;
  }

  const zipBtn = document.getElementById('zip-lookup');
  const zipInput = document.getElementById('zip-input');
  const useLoc = document.getElementById('use-location');
  if (zipBtn && zipInput && !zipBtn._wired) {
    zipBtn.addEventListener('click', async () => {
      console.log('zip-lookup clicked, value=', zipInput.value);
      const zip = zipInput.value.trim();
      if (!zip) return;
      zipBtn.disabled = true;
      const old = zipBtn.textContent;
      zipBtn.textContent = 'Looking...';
      try {
        const loc = await GetLatLngForZip(zip);
        const label = document.getElementById('location-label');
        if (label) label.textContent = loc.placeName;
        await UpdateWeatherInfo(loc);
        const weather = window.lastWeatherText || '';
        const summaryHtml = await GetGeminiResponse('summary', weather);
        const geminiBox = document.getElementById('gemini-text-box');
        if (geminiBox) renderRichText(geminiBox, trimBlankLines(summaryHtml));
        const history = document.getElementById('chat-history');
        if (history) history.innerHTML = '';
      } catch (err) {
        alert('ZIP lookup failed: ' + (err.message || err));
      } finally {
        zipBtn.disabled = false;
        zipBtn.textContent = old;
      }
    });
    zipBtn._wired = true;
  }

  if (useLoc && !useLoc._wired) {
    useLoc.addEventListener('click', async () => {
      console.log('use-location clicked');
      try {
        const label = document.getElementById('location-label');
        if (label) label.textContent = '';

        // Get device location
        const pos = await GetLocation();
        const { lat, lng } = pos;
        // Reverse-geocode to get a place name
        const placeName = await GetPlaceNameForLatLng(lat, lng);
        if (label) label.textContent = placeName || '';

        // Pass location + placeName into UpdateWeatherInfo so it prefixes lastWeatherText
        await UpdateWeatherInfo({ lat, lng, placeName });

        const summaryHtml = await GetGeminiResponse('summary', window.lastWeatherText || '');
        const geminiBox = document.getElementById('gemini-text-box');
        if (geminiBox) renderRichText(geminiBox, trimBlankLines(summaryHtml));
        const history = document.getElementById('chat-history');
        if (history) history.innerHTML = '';
      } catch (err) {
        alert('Unable to use geolocation: ' + (err.message || err));
      }
    });
    useLoc._wired = true;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureControlsWired);
} else {
  ensureControlsWired();
}
