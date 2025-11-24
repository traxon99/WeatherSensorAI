
/*
TODO:
    - Update how we get weather to work with the open weather API that Riley found
    - Get basic Gemini response working
    - Add chat box
    NOTE: When adding an api please DO NOT PUT THE API KEY IN THE JAVASCRIPT CODE.
    make a separate file and pull the api key.
*/
// The client gets the API key from the environment variable `GEMINI_API_KEY`.

async function UpdateWeatherInfo(lat, lng, city ="", state ="") {
  try {
    console.log(lat, lng, city, state);

    // show city/state at the top of the weather 
    const weatherTitle = document.getElementById('weather-details-h2');
    if (weatherTitle) {
      if (city.trim() === "" && state.trim() === ""){
        weatherTitle.textContent = `Weather for your loaction`;
      }else{
        weatherTitle.textContent = `Weather for ${city}${state ? ", " + state : ""}`;
      }
    }

    // Request daily forecast for next 7 days (timezone=auto keeps dates aligned to user)
    const open_meteo_url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&wind_speed_unit=mph&temperature_unit=fahrenheit&precipitation_unit=inch`;

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
      return;
    }

    // Build today's card using the first entry (days[0])
    const todayDate = new Date(days[0]);
    const todayName = todayDate.toLocaleDateString(undefined, { weekday: 'long' });
    today_card.innerHTML = `
      <h2>${todayName} (${todayDate.toLocaleDateString()})</h2>
      <p>🌡️ High: ${tempMax[0].toFixed(1)}°F | Low: ${tempMin[0].toFixed(1)}°F</p>
      <p>💧 Rain: ${rain[0]} inch</p>
      <p>🌬️ Wind: ${wind[0]} mph</p>
    `;

    // Create a card for every day returned by the API (this avoids skipping Monday)
    for (let i = 0; i < days.length; i++) {
      const date = new Date(days[i]);
      const weekday = date.toLocaleDateString(undefined, { weekday: 'long' });

      const card = document.createElement('div');
      card.className = 'day-card';
      card.innerHTML = `
        <h3>${weekday}</h3>
        <p>${date.toLocaleDateString()}</p>
        <p>🌡️ ${tempMax[i].toFixed(1)}°F / ${tempMin[i].toFixed(1)}°F</p>
        <p>💧 ${rain[i]} in. | 🌬️ ${wind[i]} mph</p>
      `;
      day_cards.appendChild(card);
    }
    return `${days, tempMax, tempMin, rain, wind}`;

  } catch (error) {
    console.error('Error loading weather data:', error);
    alert('Unable to fetch weather data.');
  }
}

//====================================================
// On page load, read lat/lng and city/state from URL
//====================================================

document.addEventListener("DOMContentLoaded",() =>{
  const params = new URLSearchParams(window.location.search);
  const lat = params.get("lat");
  const lng = params.get("lng");
  const city = params.get("city") || "";
  const state = params.get("state") || "";

  if (lat && lng){
     UpdateWeatherInfo(lat, lng, city, state);
  }else{
    alert("No coordinates provided!");
  }
});


async function GetGeminiResponse(type, input) {
    // merge prompts and sent to Gemini, then return html with gemini response
    try {
        //fetch prompts from json file
        var response = await fetch('prompts.json');
        const prompts = await response.json();

        var full_prompt = "";

        switch (type) {
            case "summary":
                full_prompt = prompts.summary_prompt;
                console.log("full prompt:\n" + prompts.summary_prompt);
                break;
            case "chat":
                full_prompt = prompts.chat_prompt + input;
                console.log("full prompt:\n" + full_prompt);
                break;
        };
        response = await QueryGemini(full_prompt);

        return `<p>${response}</p>`;
    } catch(error) {
        console.error(error);

    };
}; 

async function QueryGemini(prompt) {
    // try {

    //     return response.text
    // } catch(error) {
    //     console.error(error);
    // }
}


async function testing(){

    GetGeminiResponse("chat", "This is a test input (chat)");
    //UpdateWeatherInfo();

    GetGeminiResponse("summary", "This is a test input (summary)");
}
// addEventListener("DOMContentLoaded", testing);
testing();
