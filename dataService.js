// 数据服务 - 负责从各个API获取数据
class DataService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 30 * 60 * 1000; // 30分钟缓存
    }

    // 获取缓存键
    getCacheKey(type, coordinates, date) {
        return `${type}_${coordinates.lat}_${coordinates.lng}_${date}`;
    }

    // 检查缓存
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    // 设置缓存
    setCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    // 获取Windy数据 (风浪数据)
    async getWindyData(coordinates, date) {
        const cacheKey = this.getCacheKey('windy', coordinates, date);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            // 模拟Windy API调用 (实际使用时需要替换为真实API)
            const mockData = this.generateMockWindyData(coordinates, date);
            this.setCache(cacheKey, mockData);
            return mockData;
        } catch (error) {
            console.error('Windy API错误:', error);
            return this.generateMockWindyData(coordinates, date);
        }
    }

    // 获取OpenWeatherMap数据
    async getOpenWeatherData(coordinates, date) {
        const cacheKey = this.getCacheKey('openweather', coordinates, date);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            // 模拟OpenWeatherMap API调用
            const mockData = this.generateMockWeatherData(coordinates, date);
            this.setCache(cacheKey, mockData);
            return mockData;
        } catch (error) {
            console.error('OpenWeather API错误:', error);
            return this.generateMockWeatherData(coordinates, date);
        }
    }

    // 获取Stormglass数据
    async getStormglassData(coordinates, date) {
        const cacheKey = this.getCacheKey('stormglass', coordinates, date);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            // 模拟Stormglass API调用
            const mockData = this.generateMockOceanData(coordinates, date);
            this.setCache(cacheKey, mockData);
            return mockData;
        } catch (error) {
            console.error('Stormglass API错误:', error);
            return this.generateMockOceanData(coordinates, date);
        }
    }

    // 综合获取所有数据
    async getAllData(coordinates, date) {
        try {
            const [windyData, weatherData, oceanData] = await Promise.all([
                this.getWindyData(coordinates, date),
                this.getOpenWeatherData(coordinates, date),
                this.getStormglassData(coordinates, date)
            ]);

            return {
                windy: windyData,
                weather: weatherData,
                ocean: oceanData,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('获取数据失败:', error);
            throw error;
        }
    }

    // 生成模拟Windy数据
    generateMockWindyData(coordinates, date) {
        const baseWind = Math.random() * 15 + 5; // 5-20 knots
        const baseWave = Math.random() * 2 + 0.5; // 0.5-2.5m
        
        return {
            windSpeed: Math.round(baseWind * 10) / 10,
            windDirection: Math.round(Math.random() * 360),
            windGust: Math.round((baseWind + Math.random() * 5) * 10) / 10,
            waveHeight: Math.round(baseWave * 10) / 10,
            wavePeriod: Math.round((Math.random() * 8 + 6) * 10) / 10,
            waveDirection: Math.round(Math.random() * 360),
            swellHeight: Math.round((baseWave * 0.7) * 10) / 10,
            swellPeriod: Math.round((Math.random() * 5 + 8) * 10) / 10,
            swellDirection: Math.round(Math.random() * 360)
        };
    }

    // 生成模拟天气数据
    generateMockWeatherData(coordinates, date) {
        const temp = Math.random() * 15 + 15; // 15-30°C
        const conditions = ['晴朗', '多云', '阴天', '小雨', '中雨'];
        
        return {
            temperature: Math.round(temp),
            humidity: Math.round(Math.random() * 40 + 40), // 40-80%
            pressure: Math.round(Math.random() * 50 + 1000), // 1000-1050 hPa
            visibility: Math.round(Math.random() * 5 + 5), // 5-10 km
            cloudCover: Math.round(Math.random() * 100), // 0-100%
            condition: conditions[Math.floor(Math.random() * conditions.length)],
            uvIndex: Math.round(Math.random() * 10)
        };
    }

    // 生成模拟海洋数据
    generateMockOceanData(coordinates, date) {
        return {
            waterTemperature: Math.round((Math.random() * 10 + 18) * 10) / 10, // 18-28°C
            tideHeight: Math.round((Math.random() * 4 + 1) * 10) / 10, // 1-5m
            tideLevel: ['低潮', '涨潮', '高潮', '落潮'][Math.floor(Math.random() * 4)],
            currentSpeed: Math.round((Math.random() * 2) * 10) / 10, // 0-2 m/s
            currentDirection: Math.round(Math.random() * 360),
            seaState: Math.floor(Math.random() * 6) + 1 // 1-6级海况
        };
    }

    // 获取潮汐预测 (简化版天文算法)
    getTideData(coordinates, date) {
        // 简化的潮汐计算 - 实际应用中应使用专业的潮汐算法
        const hour = date.getHours();
        const tidePhase = (hour + Math.random() * 2) % 12;
        
        let tideLevel, tideHeight;
        if (tidePhase < 3) {
            tideLevel = '低潮';
            tideHeight = 0.5 + Math.random() * 1;
        } else if (tidePhase < 6) {
            tideLevel = '涨潮';
            tideHeight = 1.5 + Math.random() * 1.5;
        } else if (tidePhase < 9) {
            tideLevel = '高潮';
            tideHeight = 3 + Math.random() * 1.5;
        } else {
            tideLevel = '落潮';
            tideHeight = 1.5 + Math.random() * 1.5;
        }

        return {
            level: tideLevel,
            height: Math.round(tideHeight * 10) / 10,
            nextChange: new Date(date.getTime() + (3 + Math.random() * 3) * 60 * 60 * 1000)
        };
    }
}

// 创建全局数据服务实例
const dataService = new DataService();