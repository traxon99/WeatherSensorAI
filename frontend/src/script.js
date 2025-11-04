/*
TODO:
    - Update how we get weather to work with the open weather API that Riley found
    - Get basic Gemini response working
    - Add chat box
    NOTE: When adding an api please DO NOT PUT THE API KEY IN THE JAVASCRIPT CODE.
    make a separate file and pull the api key.
*/




function UpdateWeatherInfo() {
    //pull weather data from weather api and return html
    fetch('weather.json')
    .then(response => response.json())
    .then(data => {
        const day_cards = document.getElementById('day-cards');
        const today_card = document.getElementById('today-card');
        const today = "Monday";

        day_cards.innerHTML = ''; // Clear old content
        today_card.innerHTML = ''; // Clear old content


        data.week.forEach(day => {
            if (day.day == today) {
                console.log("made it")
                const today_card_new = document.getElementById('today-card');
                today_card_new.innerHTML = `
                <h2>${day.day}</h2>
                <p>${day.condition}</p>
                <p>${day.temperature}°F</p>
                <p>💧 ${day.humidity}% | 🌬️ ${day.wind_speed} mph</p>
                `;
            }
            const card = document.createElement('div');
            card.className = 'day-card';
            card.innerHTML = `
                <h3>${day.day}</h3>
                <p>${day.condition}</p>
                <p>${day.temperature}°F</p>
                <p>💧 ${day.humidity}% | 🌬️ ${day.wind_speed} mph</p>
            `;
            day_cards.appendChild(card);
        });
    })
    .catch(error => console.error('Error loading weather data:', error));
};

async function GetGeminiResponse(type, input) {
    // merge prompts and sent to Gemini, then return html with gemini response
    try {
        //fetch prompts from json file
        response = await fetch('prompts.json');
        const prompts = await response.json();

        full_prompt = "";

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
    // Queries gemini with the full prompt and returns string


    return "This will be the Gemini response"
}


async function testing(){
    const gemini_text_box = document.getElementById("gemini-response");
    
    var gemini_response = await GetGeminiResponse("chat", "This is a test input (chat)");

    gemini_text_box.innerHTML = gemini_response;


    GetGeminiResponse("summary", "This is a test input (summary)");
    UpdateWeatherInfo();
}
// addEventListener("DOMContentLoaded", testing);
testing();
