const imageButton = document.getElementById('imageButton');
        const displayImage = document.getElementById('displayImage');
        const { createApp, ref, computed } = Vue;	
		
		imageButton.addEventListener('click', function() {
            displayImage.style.display = 'block';
            setTimeout(function() {
                displayImage.style.display = 'none';
            }, 800);
        });
		
        createApp({
            setup() {
                const location = ref('');
                const weatherData = ref(null);
				                const loading = ref(false);
                const error = ref(null);
                const locationDisplay = ref('');

                const fetchWeather = async () => {
                    if (!location.value.trim()) return;

                    loading.value = true;
                    error.value = null;

                    try {
                        const geocodeResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location.value)}&count=1`);
                        const geocodeData = await geocodeResponse.json();

                        if (!geocodeData.results || geocodeData.results.length === 0) {
                            const coords = location.value.split(',').map(coord => parseFloat(coord.trim()));
                            if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                                await fetchWeatherData(coords[0], coords[1], location.value);
                            } else {
                                throw new Error('Местоположение не найдено. Введите другое название или координаты');
                            }
                        } else {
                            const result = geocodeData.results[0];
                            locationDisplay.value = result.name + (result.admin1 ? `, ${result.admin1}` : '') + (result.country ? `, ${result.country}` : '');
                            await fetchWeatherData(result.latitude, result.longitude, locationDisplay.value);
                        }
                    } catch (err) {
                        error.value = err.message;
                        loading.value = false;
                    }
                };

                const fetchWeatherData = async (latitude, longitude, displayName) => {
                    try {
                        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min&current=wind_direction_10m,wind_speed_10m,surface_pressure,weather_code,temperature_2m,relative_humidity_2m,apparent_temperature,precipitation&timezone=auto`);
                        const data = await response.json();

                        if (data.error) {
                            throw new Error(data.reason || 'Ошибка получения данных');
                        }

                        weatherData.value = data;
                        locationDisplay.value = displayName || `Широта: ${latitude.toFixed(2)}, Долгота: ${longitude.toFixed(2)}`;
                    } catch (err) {
                        error.value = err.message;
                    } finally {
                        loading.value = false;
                    }
                };

                const currentTime = computed(() => {
                    if (!weatherData.value) return '';
                    const date = new Date(weatherData.value.current.time);
                    return date.toLocaleString('ru-RU', {
                        weekday: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                        month: 'short',
                        day: 'numeric'
                    });
                });

                const weatherDescription = computed(() => {
                    return getWeatherDescription(weatherData.value?.current.weather_code) || '';
                });

                const windDirection = computed(() => {
                    if (!weatherData.value) return '';
                    const deg = weatherData.value.current.wind_direction_10m;
                    if (deg >= 337.5 || deg < 22.5) return 'Север ↑';
                    if (deg >= 22.5 && deg < 67.5) return 'Северо-восток ↗';
                    if (deg >= 67.5 && deg < 112.5) return 'Восток →';
                    if (deg >= 112.5 && deg < 157.5) return 'Юго-восток ↘';
                    if (deg >= 157.5 && deg < 202.5) return 'Юг ↓';
                    if (deg >= 202.5 && deg < 247.5) return 'Юго-запад ↙';
                    if (deg >= 247.5 && deg < 292.5) return 'Запад ←';
                    return 'Северо-запад ↖';
                });

                const dailyForecast = computed(() => {
                    if (!weatherData.value?.daily) return [];
                    return weatherData.value.daily.time.map((time, index) => ({
                        date: new Date(time).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' }),
                        weather_code: weatherData.value.daily.weather_code[index],
                        temperature_max: weatherData.value.daily.temperature_2m_max[index],
                        temperature_min: weatherData.value.daily.temperature_2m_min[index]
                    }));
                });

                const getWeatherDescription = (code) => {
                    const weatherCodes = {
                        0: 'Ясно',
                        1: 'Преимущественно ясно',
                        2: 'Переменная облачность',
                        3: 'Пасмурно',
                        45: 'Туман',
                        48: 'Изморозь',
                        51: 'Мелкий дождь',
                        53: 'Умеренный дождь',
                        55: 'Сильный дождь',
                        56: 'Лёгкий ледяной дождь',
                        57: 'Сильный ледяной дождь',
                        61: 'Небольшой дождь',
                        63: 'Дождь',
                        65: 'Ливень',
                        66: 'Лёгкий снег с дождём',
                        67: 'Снег с дождём',
                        71: 'Небольшой снег',
                        73: 'Снег',
                        75: 'Сильный снегопад',
                        77: 'Снежные зёрна',
                        80: 'Кратковременные дожди',
                        81: 'Ливни',
                        82: 'Сильные ливни',
                        85: 'Снегопад',
                        86: 'Сильный снегопад',
                        95: 'Гроза',
                        96: 'Гроза с градом',
                        99: 'Сильная гроза с градом'
                    };
                    return weatherCodes[code] || 'Неизвестно';
                };

                return {
                    location,
                    weatherData,
                    loading,
                    error,
                    locationDisplay,
                    fetchWeather,
                    currentTime,
                    weatherDescription,
                    windDirection,
                    dailyForecast,
                };
            }
        }).mount('#app');
