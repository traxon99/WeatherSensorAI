const loader = document.getElementById("loader");
const currentlocationbtn = document.getElementById('current-location-btn');
const zipcodeInput = document.getElementById('zipcode');
const searchBtn = document.getElementById('zipcode-search-btn');
const clearBtn = document.getElementById('zipcode-clear-btn');

// Clear ZIP input
clearBtn.addEventListener('click', () => {
  zipcodeInput.value = '';
});


// ===============================
// Current location button (GPS)
//================================

currentlocationbtn.addEventListener('click', () => {
  loader.style.display = "block"; // show spinner
  navigator.geolocation.getCurrentPosition(gotlocation, failedtogetlocation);
});

function gotlocation(position){
  loader.style.display = "none"; // hide spinner immediately
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;

  // For GPS, we might not have city/state; we are to make default/empty
  const city = "";
  const state = "";

  // Redirect to the index.html with the coordinates and empty city/state
  window.location.href = `index.html?lat=${lat}&lng=${lng}&city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`;
}

function failedtogetlocation(error){
  loader.style.display = "none"; // hide spinner on error
  alert("Failed to get location.");
  console.error('Error getting location:', error);
}

//===============================================
// ZIP CODE 
// ZIP code search using free Zippopotam.us API
//===============================================

searchBtn.addEventListener('click', async () => {
  const zip = zipcodeInput.value.trim();
  if(!zip.match(/^\d{5}$/)){
    alert("Please enter a valid 5-digit ZIP code.");
    return;
  }

  loader.style.display = "block"; // show spinner

  const url = `https://api.zippopotam.us/us/${zip}`;
  try {
    const res = await fetch(url);
    if(!res.ok) throw new Error("ZIP code not found");

    const data = await res.json();
    loader.style.display = "none"; // hide spinner immediately

    const place = data.places[0];
    const lat = place['latitude'];
    const lng = place['longitude'];
    const city = place['place name'];
    const state = place['state abbreviation'];

    // Redirect with coordinates AND city/state
    window.location.href = `index.html?lat=${lat}&lng=${lng}&city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`;
    
  } catch(err){
    loader.style.display = "none"; // hide spinner on error
    alert("Error fetching location: " + err.message);
    console.error(err);
  }
});