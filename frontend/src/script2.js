const loader = document.getElementById("loader");
const currentlocationbtn = document.getElementById('current-location-btn');
const zipcodeInput = document.getElementById('zipcode');
const searchBtn = document.getElementById('zipcode-search-btn');
const clearBtn = document.getElementById('zipcode-clear-btn');

// Clear ZIP input
clearBtn.addEventListener('click', () => {
  zipcodeInput.value = '';
});

// Current location button
currentlocationbtn.addEventListener('click', () => {
  loader.style.display = "block"; // show spinner
  navigator.geolocation.getCurrentPosition(gotlocation, failedtogetlocation);
});

function gotlocation(position){
  loader.style.display = "none"; // hide spinner immediately
  const lat = position.coords.latitude;
  const longi = position.coords.longitude;
  alert(`Location detected:\nLatitude: ${lat}\nLongitude: ${longi}`);
  console.log("Latitude:", lat, "Longitude:", longi);
}

function failedtogetlocation(error){
  loader.style.display = "none"; // hide spinner on error
  alert("Failed to get location.");
  console.error('Error getting location:', error);
}

// ZIP code search using free Zippopotam.us API
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
    alert(`ZIP found: ${place['place name']}, ${place['state abbreviation']}\nLatitude: ${place['latitude']}\nLongitude: ${place['longitude']}`);
    console.log(data);

  } catch(err){
    loader.style.display = "none"; // hide spinner on error
    alert("Error fetching location: " + err.message);
    console.error(err);
  }
});