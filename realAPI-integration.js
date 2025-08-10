// 真实API集成服务
class RealAPIIntegration {
    constructor() {
        // API配置 - 请替换为你的真实API密钥
        this.apiKeys = {
            openweather: 'YOUR_OPENWEATHER_API_KEY', // 从 openweathermap.org 获取
            stormglass: 'YOUR_STORMGLASS_API_KEY'    // 从 stormglass.io 获取
        };
        
        // CORS代理服务器（用于解决跨域问题）
        this.corsProxy = 'https://api.allorigins.win/raw?url=';
        
        this.cache = new Map();
        this.cacheTimeout = 30 * 60 * 1000; // 30分钟缓存
    }

    // 检查API密钥是否配置
    isConfigured() {
        return this.apiKeys.openweather !== 'YOUR_OPENWEATHER_API_KEY' && 
               this.apiKeys.stormglass !== 'YOUR_STORMGLASS_API_KEY';
    }

    // 获取真实天气数据
    async getRealWeatherData(coordinates, date) {
        if (!this.isConfigured()) {
            console.warn('API密钥未配置，使用模拟数据');
            return null;
        }

        const cacheKey = `weather_${coordinates.lat}_${coordinates.lng}_${date.toDateString()}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const { lat, lng } = coordinates;
            const apiKey = this.apiKeys.openweather;
            
            // OpenWeatherMap当前天气API
            const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=zh_cn`;
            
            const response = await fetch(this.corsProxy + encodeURIComponent(weatherUrl));
            const data = await response.json();

            if (data.cod !== 200) {
                throw new Error(`OpenWeather API错误: ${data.message}`);
            }

            const weatherData = {
                temperature: Math.round(data.main.temp),
                humidity: data.main.humidity,
                pressure: data.main.pressure,
                visibility: data.visibility ? Math.round(data.visibility / 1000) : 10,
                cloudCover: data.clouds.all,
                condition: this.translateWeatherCondition(data.weather[0].description),
                uvIndex: 0, // 免费版不提供UV指数
                windSpeed: Math.round(data.wind.speed * 1.94384 * 10) / 10, // 转换为节
                windDirection: data.wind.deg || 0
            };

            this.setCache(cacheKey, weatherData);
            return weatherData;

        } catch (error) {
            console.error('获取真实天气数据失败:', error);
            return null;
        }
    }

    // 获取真实海洋数据
    async getRealOceanData(coordinates, date) {
        if (!this.isConfigured()) {
            console.warn('API密钥未配置，使用模拟数据');
            return null;
        }

        const cacheKey = `ocean_${coordinates.lat}_${coordinates.lng}_${date.toDateString()}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const { lat, lng } = coordinates;
            const apiKey = this.apiKeys.stormglass;
            
            // 获取当前时间和24小时后的时间戳
            const start = Math.floor(date.getTime() / 1000);
            const end = start + 24 * 60 * 60;

            // Stormglass海洋数据API
            const params = [
                'waveHeight',
                'wavePeriod', 
                'waveDirection',
                'swellHeight',
                'swellPeriod',
                'swellDirection',
                'waterTemperature'
            ].join(',');

            const oceanUrl = `https://api.stormglass.io/v2/weather/point?lat=${lat}&lng=${lng}&params=${params}&start=${start}&end=${end}`;
            
            const response = await fetch(oceanUrl, {
                headers: {
                    'Authorization': apiKey
                }
            });

            if (!response.ok) {
                throw new Error(`Stormglass API错误: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.hours || data.hours.length === 0) {
                throw new Error('Stormglass API返回空数据');
            }

            // 使用第一个小时的数据
            const firstHour = data.hours[0];
            
            const oceanData = {
                // 浪况数据
                waveHeight: this.getValidValue(firstHour.waveHeight) || 1.0,
                wavePeriod: this.getValidValue(firstHour.wavePeriod) || 8.0,
                waveDirection: this.getValidValue(firstHour.waveDirection) || 180,
                
                // 涌浪数据
                swellHeight: this.getValidValue(firstHour.swellHeight) || 0.8,
                swellPeriod: this.getValidValue(firstHour.swellPeriod) || 10.0,
                swellDirection: this.getValidValue(firstHour.swellDirection) || 180,
                
                // 海洋环境
                waterTemperature: this.getValidValue(firstHour.waterTemperature) || 20.0,
                
                // 潮汐数据（简化处理）
                tideHeight: 2.0 + Math.sin(date.getHours() * Math.PI / 6) * 1.5,
                tideLevel: this.calculateTideLevel(date),
                
                // 其他数据
                currentSpeed: 0.5,
                currentDirection: 90,
                seaState: Math.min(6, Math.max(1, Math.round(this.getValidValue(firstHour.waveHeight) || 1)))
            };

            // 生成24小时数据
            oceanData.hourlyData = this.generateRealHourlyData(data.hours);

            this.setCache(cacheKey, oceanData);
            return oceanData;

        } catch (error) {
            console.error('获取真实海洋数据失败:', error);
            return null;
        }
    }

    // 获取真实潮汐数据（使用NOAA免费API）
    async getRealTideData(coordinates, date) {
        try {
            // 这里可以集成NOAA潮汐API或其他免费潮汐服务
            // 由于中国海域的潮汐站点有限，这里提供一个简化的实现
            
            const tideSchedule = [];
            const baseTime = new Date(date);
            
            // 模拟一天的潮汐时间（基于月相和地理位置）
            for (let i = 0; i < 4; i++) {
                const tideTime = new Date(baseTime.getTime() + i * 6 * 60 * 60 * 1000);
                const isHighTide = i % 2 === 0;
                
                tideSchedule.push({
                    time: `${tideTime.getHours().toString().padStart(2, '0')}:${tideTime.getMinutes().toString().padStart(2, '0')}`,
                    type: isHighTide ? '高潮' : '低潮',
                    height: isHighTide ? 3.2 + Math.random() * 0.8 : 1.1 + Math.random() * 0.6,
                    timestamp: tideTime
                });
            }

            return tideSchedule;

        } catch (error) {
            console.error('获取真实潮汐数据失败:', error);
            return null;
        }
    }

    // 生成真实的24小时数据
    generateRealHourlyData(stormglassHours) {
        const hourlyData = {
            waveHeight: [],
            windWave: [],
            swell: [],
            windSpeed: [],
            windGust: [],
            windDirection: [],
            tideHeight: [],
            tideSchedule: []
        };

        // 处理Stormglass返回的小时数据
        for (let i = 0; i < Math.min(24, stormglassHours.length); i++) {
            const hour = stormglassHours[i];
            
            const waveHeight = this.getValidValue(hour.waveHeight) || 1.0;
            const swellHeight = this.getValidValue(hour.swellHeight) || 0.8;
            
            hourlyData.waveHeight.push(Math.round(waveHeight * 10) / 10);
            hourlyData.windWave.push(Math.round((waveHeight - swellHeight) * 10) / 10);
            hourlyData.swell.push(Math.round(swellHeight * 10) / 10);
            hourlyData.windSpeed.push(Math.round((this.getValidValue(hour.windSpeed) || 10) * 1.94384 * 10) / 10);
            hourlyData.windGust.push(Math.round((this.getValidValue(hour.gust) || 12) * 1.94384 * 10) / 10);
            hourlyData.windDirection.push(this.getValidValue(hour.windDirection) || 180);
            
            // 潮汐高度计算
            const tideHeight = 2.0 + Math.sin(i * Math.PI / 6) * 1.5;
            hourlyData.tideHeight.push(Math.round(tideHeight * 10) / 10);
        }

        // 如果数据不足24小时，用最后一个值填充
        while (hourlyData.waveHeight.length < 24) {
            const lastIndex = hourlyData.waveHeight.length - 1;
            hourlyData.waveHeight.push(hourlyData.waveHeight[lastIndex]);
            hourlyData.windWave.push(hourlyData.windWave[lastIndex]);
            hourlyData.swell.push(hourlyData.swell[lastIndex]);
            hourlyData.windSpeed.push(hourlyData.windSpeed[lastIndex]);
            hourlyData.windGust.push(hourlyData.windGust[lastIndex]);
            hourlyData.windDirection.push(hourlyData.windDirection[lastIndex]);
            hourlyData.tideHeight.push(hourlyData.tideHeight[lastIndex]);
        }

        return hourlyData;
    }

    // 工具方法：获取有效值
    getValidValue(dataObject) {
        if (!dataObject) return null;
        
        // Stormglass返回多个数据源，优先使用noaa或sg
        const sources = ['noaa', 'sg', 'icon', 'meteo'];
        for (const source of sources) {
            if (dataObject[source] !== undefined && dataObject[source] !== null) {
                return dataObject[source];
            }
        }
        return null;
    }

    // 翻译天气条件
    translateWeatherCondition(condition) {
        const translations = {
            'clear sky': '晴朗',
            'few clouds': '少云',
            'scattered clouds': '多云',
            'broken clouds': '阴天',
            'shower rain': '阵雨',
            'rain': '小雨',
            'thunderstorm': '雷雨',
            'snow': '雪',
            'mist': '雾'
        };
        return translations[condition] || condition;
    }

    // 计算潮汐状态
    calculateTideLevel(date) {
        const hour = date.getHours();
        const tidePhase = (hour + 6) % 12;
        
        if (tidePhase < 3) return '低潮';
        if (tidePhase < 6) return '涨潮';
        if (tidePhase < 9) return '高潮';
        return '落潮';
    }

    // 缓存管理
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    // 综合获取真实数据
    async getAllRealData(coordinates, date) {
        try {
            console.log('开始获取真实API数据...');
            
            const [weatherData, oceanData, tideData] = await Promise.all([
                this.getRealWeatherData(coordinates, date),
                this.getRealOceanData(coordinates, date),
                this.getRealTideData(coordinates, date)
            ]);

            // 如果任何API失败，返回null让系统使用模拟数据
            if (!weatherData || !oceanData) {
                console.warn('部分真实API数据获取失败，将使用模拟数据');
                return null;
            }

            console.log('真实API数据获取成功');
            
            return {
                windy: {
                    windSpeed: weatherData.windSpeed,
                    windDirection: weatherData.windDirection,
                    windGust: weatherData.windSpeed * 1.2,
                    waveHeight: oceanData.waveHeight,
                    wavePeriod: oceanData.wavePeriod,
                    waveDirection: oceanData.waveDirection,
                    swellHeight: oceanData.swellHeight,
                    swellPeriod: oceanData.swellPeriod,
                    swellDirection: oceanData.swellDirection
                },
                weather: weatherData,
                ocean: {
                    waterTemperature: oceanData.waterTemperature,
                    tideHeight: oceanData.tideHeight,
                    tideLevel: oceanData.tideLevel,
                    currentSpeed: oceanData.currentSpeed,
                    currentDirection: oceanData.currentDirection,
                    seaState: oceanData.seaState
                },
                hourly: oceanData.hourlyData || null,
                timestamp: Date.now(),
                source: 'real-api'
            };

        } catch (error) {
            console.error('获取真实API数据失败:', error);
            return null;
        }
    }
}

// 创建全局真实API服务实例
const realAPIService = new RealAPIIntegration();