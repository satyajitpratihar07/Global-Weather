
const BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';


const worldCities = [
  { name: 'Kolkata', country: 'IN', lat: 19.0760, lon: 72.8777 },
  { name: 'Kantapahari', country: 'IN', lat: 19.0760, lon: 72.8777 },
  { name: 'Jhargram', country: 'IN', lat: 19.0760, lon: 72.8777 },
    { name: 'New York', country: 'US', lat: 40.7128, lon: -74.0060 },
    { name: 'London', country: 'GB', lat: 51.5074, lon: -0.1278 },
    { name: 'Tokyo', country: 'JP', lat: 35.6762, lon: 139.6503 },
    { name: 'Paris', country: 'FR', lat: 48.8566, lon: 2.3522 },
    { name: 'Sydney', country: 'AU', lat: -33.8688, lon: 151.2093 },
    
    { name: 'Dubai', country: 'AE', lat: 25.2048, lon: 55.2708 },
    { name: 'Singapore', country: 'SG', lat: 1.3521, lon: 103.8198 },
    { name: 'Berlin', country: 'DE', lat: 52.5200, lon: 13.4050 },
    { name: 'Moscow', country: 'RU', lat: 55.7558, lon: 37.6173 },
    { name: 'Mexico City', country: 'MX', lat: 19.4326, lon: -99.1332 },
    { name: 'Bangkok', country: 'TH', lat: 13.7563, lon: 100.5018 },
   
];
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const currentWeather = document.getElementById('current-weather');
const currentCard = document.getElementById('current-card');
const weatherGrid = document.getElementById('weather-grid');
const forecastSection = document.getElementById('forecast-section');
const forecastContainer = document.getElementById('forecast-container');
const closeForecastBtn = document.getElementById('close-forecast-btn');
const modalOverlay = document.getElementById('modal-overlay');
const searchResults = document.getElementById('search-results');
const resultsList = document.getElementById('results-list');

let currentLocationData = null;
let searchTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
    loadWorldWeather();
    setupEventListeners();
});

function setupEventListeners() {
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    locationBtn.addEventListener('click', getUserLocation);
    closeForecastBtn.addEventListener('click', closeForecast);
    modalOverlay.addEventListener('click', closeForecast);
   
    document.addEventListener('click', (e) => {
        if (!searchResults.contains(e.target) && !searchInput.contains(e.target)) {
            hideSearchResults();
        }
    });
}

function handleSearchInput() {
    const query = searchInput.value.trim();

    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    if (query.length < 2) {
        hideSearchResults();
        return;
    }
   
    searchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`${GEOCODING_URL}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
            if (!response.ok) return;
            
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                displaySearchResults(data.results);
            } else {
                hideSearchResults();
            }
        } catch (error) {
            console.error('Search suggestions error:', error);
            hideSearchResults();
        }
    }, 300);
}

function displaySearchResults(results) {
    resultsList.innerHTML = '';
    
    results.forEach(result => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        const country = result.country || result.country_code || result.admin1 || 'Unknown';
        const lat = result.latitude?.toFixed(2) || '0.00';
        const lon = result.longitude?.toFixed(2) || '0.00';
        
        resultItem.innerHTML = `
            <i class="fas fa-map-marker-alt" style="color: #ff6b6b;"></i>
            <div class="result-info">
                <div class="result-city">${result.name}</div>
                <div class="result-country">${country}</div>
                <div class="result-coords">${lat}°, ${lon}°</div>
            </div>
        `;
        
        resultItem.addEventListener('click', () => {
            selectSearchResult({
                lat: result.latitude,
                lon: result.longitude,
                name: result.name,
                country: country
            });
        });
        
        resultsList.appendChild(resultItem);
    });
    
    searchResults.style.display = 'block';
}
async function selectSearchResult(location) {
    hideSearchResults();
    searchInput.value = '';
    
    if (!location.lat || !location.lon) {
        showError('Invalid location coordinates.');
        return;
    }
    
    try {
        showLoading(searchBtn);
        const weatherData = await fetchWeatherData(location.lat, location.lon);
        currentLocationData = {
            ...location,
            weatherData: weatherData
        };
        displayCurrentWeather(weatherData, `${location.name}, ${location.country}`);
    } catch (error) {
        showError('Unable to fetch weather data for this location.');
        console.error('Weather fetch error:', error);
    } finally {
        hideLoading(searchBtn);
    }
}


function hideSearchResults() {
    searchResults.style.display = 'none';
}

async function handleSearch() {
    const city = searchInput.value.trim();
    if (!city) return;
    
    try {
        showLoading(searchBtn);
        const coordinates = await geocodeCity(city);
        const weatherData = await fetchWeatherData(coordinates.lat, coordinates.lon);
        currentLocationData = {
            ...coordinates,
            weatherData: weatherData
        };
        displayCurrentWeather(weatherData, `${coordinates.name}, ${coordinates.country}`);
        searchInput.value = '';
        hideSearchResults();
    } catch (error) {
        showError('City not found. Please try a different search term.');
        console.error('Search error:', error);
    } finally {
        hideLoading(searchBtn);
    }
}


async function geocodeCity(cityName) {
    const response = await fetch(`${GEOCODING_URL}?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`);
    if (!response.ok) {
        throw new Error('Geocoding failed');
    }
    const data = await response.json();
    if (!data.results || data.results.length === 0) {
        throw new Error('City not found');
    }
    return {
        lat: data.results[0].latitude,
        lon: data.results[0].longitude,
        name: data.results[0].name,
        country: data.results[0].country_code || data.results[0].country || 'Unknown'
    };
}


function getUserLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by this browser.');
        return;
    }
    
    showLoading(locationBtn);
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                const weatherData = await fetchWeatherData(latitude, longitude);
                currentLocationData = {
                    lat: latitude,
                    lon: longitude,
                    name: 'Your Location',
                    country: '',
                    weatherData: weatherData
                };
                displayCurrentWeather(weatherData, 'Your Location');
            } catch (error) {
                showError('Unable to fetch weather for your location.');
                console.error('Location error:', error);
            } finally {
                hideLoading(locationBtn);
            }
        },
        (error) => {
            hideLoading(locationBtn);
            showError('Location access denied. Please allow location access or search for a city.');
            console.error('Geolocation error:', error);
        },
        {
            timeout: 10000,
            enableHighAccuracy: false
        }
    );
}


async function fetchWeatherData(lat, lon) {
    const url = `${BASE_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=6`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
    }
    return await response.json();
}


function displayCurrentWeather(data, cityName) {
    const card = currentWeather.querySelector('.current-card');
    const city = card.querySelector('.current-city');
    const date = card.querySelector('.current-date');
    const temp = card.querySelector('.current-temp');
    const desc = card.querySelector('.current-desc');
    const icon = card.querySelector('.weather-icon-large');
    const feelsLike = card.querySelector('.feels-like');
    const humidity = card.querySelector('.humidity');
    const wind = card.querySelector('.wind');
    
    const weatherInfo = getWeatherInfo(data.current.weather_code);
    
    city.textContent = cityName;
    date.textContent = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    temp.textContent = `${Math.round(data.current.temperature_2m)}°C`;
    desc.textContent = weatherInfo.description;
    icon.className = `weather-icon-large fas ${weatherInfo.icon}`;
    
    feelsLike.textContent = `Feels ${Math.round(data.current.apparent_temperature)}°C`;
    humidity.textContent = `${data.current.relative_humidity_2m}%`;
    wind.textContent = `${data.current.wind_speed_10m} km/h`;
    
  
    currentCard.onclick = () => {
        if (currentLocationData && currentLocationData.weatherData) {
            displayForecast(currentLocationData.weatherData, cityName);
        }
    };
    
    currentWeather.style.display = 'block';
    setTimeout(() => {
        currentWeather.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
}


function displayForecast(data, cityName) {
    forecastContainer.innerHTML = '';
    
   
    for (let i = 1; i <= 5; i++) {
        if (data.daily && data.daily.time && data.daily.time[i]) {
            const dayData = {
                date: data.daily.time[i],
                weatherCode: data.daily.weather_code[i],
                maxTemp: data.daily.temperature_2m_max[i],
                minTemp: data.daily.temperature_2m_min[i]
            };
            
            const card = createForecastCard(dayData, i);
            card.style.animationDelay = `${i * 0.1}s`;
            forecastContainer.appendChild(card);
        }
    }
    
 
    const sectionTitle = forecastSection.querySelector('.section-title');
    sectionTitle.innerHTML = `
        <i class="fas fa-calendar-week"></i>
        5-Day Weather Forecast - ${cityName}
    `;

    modalOverlay.style.display = 'block';
    forecastSection.style.display = 'block';
    forecastSection.style.position = 'fixed';
    forecastSection.style.top = '50%';
    forecastSection.style.left = '50%';
    forecastSection.style.transform = 'translate(-50%, -50%)';
    forecastSection.style.zIndex = '999';
    forecastSection.style.background = 'rgba(255, 255, 255, 0.1)';
    forecastSection.style.backdropFilter = 'blur(15px)';
    forecastSection.style.borderRadius = '20px';
    forecastSection.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    forecastSection.style.boxShadow = '0 8px 32px rgba(31, 38, 135, 0.37)';
    forecastSection.style.maxHeight = '90vh';
    forecastSection.style.overflowY = 'auto';
    

    document.body.style.overflow = 'hidden';
}


function createForecastCard(dayData, index) {
    const card = document.createElement('div');
    card.className = 'forecast-card';
    
    const weatherInfo = getWeatherInfo(dayData.weatherCode);
    const date = new Date(dayData.date);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const shortDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    card.innerHTML = `
        <div class="forecast-date">${dayName}<br><small>${shortDate}</small></div>
        <i class="forecast-icon fas ${weatherInfo.icon}"></i>
        <div class="forecast-temp">${Math.round(dayData.maxTemp)}°C</div>
        <div class="forecast-temp-range">${Math.round(dayData.minTemp)}°C - ${Math.round(dayData.maxTemp)}°C</div>
        <div class="forecast-desc">${weatherInfo.description}</div>
    `;
    
    return card;
}


function closeForecast() {
    modalOverlay.style.display = 'none';
    forecastSection.style.display = 'none';
    forecastSection.style.position = 'relative';
    forecastSection.style.top = 'auto';
    forecastSection.style.left = 'auto';
    forecastSection.style.transform = 'none';
    forecastSection.style.zIndex = 'auto';
    forecastSection.style.background = 'none';
    forecastSection.style.backdropFilter = 'none';
    forecastSection.style.borderRadius = '0';
    forecastSection.style.border = 'none';
    forecastSection.style.boxShadow = 'none';
    forecastSection.style.maxHeight = 'none';
    forecastSection.style.overflowY = 'visible';
    
    
    document.body.style.overflow = 'auto';
}


async function loadWorldWeather() {
    try {
        weatherGrid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading global weather data...</p></div>';
        
        const promises = worldCities.map(city => 
            fetchWeatherData(city.lat, city.lon)
                .then(data => ({ ...city, weather: data }))
                .catch(error => {
                    console.error(`Failed to load weather for ${city.name}:`, error);
                    return null;
                })
        );
        
        const results = await Promise.allSettled(promises);
        weatherGrid.innerHTML = '';
        
        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                const card = createWeatherCard(result.value);
                card.style.animationDelay = `${index * 0.1}s`;
                weatherGrid.appendChild(card);
            }
        });
        
      
        if (weatherGrid.children.length === 0) {
            weatherGrid.innerHTML = '<div class="error-message">Unable to load world weather data. Please check your internet connection.</div>';
        }
    } catch (error) {
        console.error('Error loading world weather:', error);
        weatherGrid.innerHTML = '<div class="error-message">Unable to load weather data. Please try again later.</div>';
    }
}


function createWeatherCard(cityData) {
    const card = document.createElement('div');
    card.className = 'weather-card';
    
    const weatherInfo = getWeatherInfo(cityData.weather.current.weather_code);
    
    card.innerHTML = `
        <h3>${cityData.name}, ${cityData.country}</h3>
        <i class="weather-icon fas ${weatherInfo.icon}"></i>
        <div class="temperature">${Math.round(cityData.weather.current.temperature_2m)}°C</div>
        <div class="description">${weatherInfo.description}</div>
        <div class="weather-details">
            <span><i class="fas fa-tint"></i> ${cityData.weather.current.relative_humidity_2m}%</span>
            <span><i class="fas fa-wind"></i> ${cityData.weather.current.wind_speed_10m} km/h</span>
            <span><i class="fas fa-thermometer-half"></i> ${Math.round(cityData.weather.current.apparent_temperature)}°C</span>
        </div>
    `;
    
    
    card.addEventListener('click', () => {
        displayForecast(cityData.weather, `${cityData.name}, ${cityData.country}`);
    });
    
    return card;
}


function getWeatherInfo(weatherCode) {
    const weatherCodes = {
        0: { description: 'Clear sky', icon: 'fa-sun' },
        1: { description: 'Mainly clear', icon: 'fa-sun' },
        2: { description: 'Partly cloudy', icon: 'fa-cloud-sun' },
        3: { description: 'Overcast', icon: 'fa-cloud' },
        45: { description: 'Foggy', icon: 'fa-smog' },
        48: { description: 'Depositing rime fog', icon: 'fa-smog' },
        51: { description: 'Light drizzle', icon: 'fa-cloud-drizzle' },
        53: { description: 'Moderate drizzle', icon: 'fa-cloud-rain' },
        55: { description: 'Dense drizzle', icon: 'fa-cloud-rain' },
        56: { description: 'Light freezing drizzle', icon: 'fa-snowflake' },
        57: { description: 'Dense freezing drizzle', icon: 'fa-snowflake' },
        61: { description: 'Slight rain', icon: 'fa-cloud-rain' },
        63: { description: 'Moderate rain', icon: 'fa-cloud-rain' },
        65: { description: 'Heavy rain', icon: 'fa-cloud-showers-heavy' },
        66: { description: 'Light freezing rain', icon: 'fa-snowflake' },
        67: { description: 'Heavy freezing rain', icon: 'fa-snowflake' },
        71: { description: 'Slight snow', icon: 'fa-snowflake' },
        73: { description: 'Moderate snow', icon: 'fa-snowflake' },
        75: { description: 'Heavy snow', icon: 'fa-snowflake' },
        77: { description: 'Snow grains', icon: 'fa-snowflake' },
        80: { description: 'Slight rain showers', icon: 'fa-cloud-rain' },
        81: { description: 'Moderate rain showers', icon: 'fa-cloud-rain' },
        82: { description: 'Violent rain showers', icon: 'fa-cloud-showers-heavy' },
        85: { description: 'Slight snow showers', icon: 'fa-snowflake' },
        86: { description: 'Heavy snow showers', icon: 'fa-snowflake' },
        95: { description: 'Thunderstorm', icon: 'fa-bolt' },
        96: { description: 'Thunderstorm with light hail', icon: 'fa-bolt' },
        99: { description: 'Thunderstorm with heavy hail', icon: 'fa-bolt' }
    };
    
    return weatherCodes[weatherCode] || { description: 'Unknown', icon: 'fa-question' };
}


function showLoading(button) {
    const originalHtml = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    button.disabled = true;
    button.dataset.originalHtml = originalHtml;
}

function hideLoading(button) {
    button.innerHTML = button.dataset.originalHtml;
    button.disabled = false;
}

function showError(message) {
    
    const notification = document.createElement('div');
    notification.className = 'error-message';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 300px;
        animation: slideInRight 0.3s ease;
    `;
    notification.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}


setInterval(loadWorldWeather, 900000);
