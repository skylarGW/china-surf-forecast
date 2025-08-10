// 数据服务 V2.0 - 增加24小时详细数据生成
class DataServiceV2 {
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

    // 获取24小时详细数据
    async get24HourData(coordinates, date) {
        const cacheKey = this.getCacheKey('24hour', coordinates, date);
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            console.log('使用缓存的24小时数据');
            return cached;
        }

        try {
            console.log('生成24小时数据');
            const hourlyData = this.generate24HourMockData(coordinates, date);
            console.log('生成的24小时数据:', hourlyData);
            this.setCache(cacheKey, hourlyData);
            return hourlyData;
        } catch (error) {
            console.error('获取24小时数据失败:', error);
            return this.generate24HourMockData(coordinates, date);
        }
    }

    // 生成24小时模拟数据
    generate24HourMockData(coordinates, date) {
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

        // 基础参数
        const baseWave = 0.8 + Math.random() * 1.5;
        const baseWind = 8 + Math.random() * 10;
        const baseTide = 2.0;

        // 生成24小时数据
        for (let hour = 0; hour < 24; hour++) {
            // 浪高变化 (考虑潮汐影响)
            const tideInfluence = Math.sin((hour + 6) * Math.PI / 12) * 0.5;
            const waveHeight = Math.max(0.2, baseWave + tideInfluence + (Math.random() - 0.5) * 0.4);
            
            // 风浪和涌浪分解
            const windWaveRatio = 0.6 + Math.random() * 0.3;
            const windWave = waveHeight * windWaveRatio;
            const swell = waveHeight * (1 - windWaveRatio);

            // 风速变化 (白天通常更大)
            const dayFactor = hour >= 6 && hour <= 18 ? 1.2 : 0.8;
            const windSpeed = Math.max(2, baseWind * dayFactor + (Math.random() - 0.5) * 4);
            const windGust = windSpeed + Math.random() * 5;

            // 风向 (相对稳定，小幅变化)
            const baseDirection = 120 + Math.sin(hour * Math.PI / 12) * 30;
            const windDirection = (baseDirection + (Math.random() - 0.5) * 20 + 360) % 360;

            // 潮汐高度 (半日潮，12小时周期)
            const tideHeight = baseTide + Math.sin(hour * Math.PI / 6) * 1.5 + Math.random() * 0.2;

            hourlyData.waveHeight.push(Math.round(waveHeight * 10) / 10);
            hourlyData.windWave.push(Math.round(windWave * 10) / 10);
            hourlyData.swell.push(Math.round(swell * 10) / 10);
            hourlyData.windSpeed.push(Math.round(windSpeed * 10) / 10);
            hourlyData.windGust.push(Math.round(windGust * 10) / 10);
            hourlyData.windDirection.push(Math.round(windDirection));
            hourlyData.tideHeight.push(Math.round(tideHeight * 10) / 10);
        }

        // 生成潮汐时间表
        hourlyData.tideSchedule = this.generateTideSchedule(date, hourlyData.tideHeight);

        return hourlyData;
    }

    // 生成潮汐时间表
    generateTideSchedule(date, tideHeights) {
        const schedule = [];
        
        // 寻找潮汐转折点
        for (let i = 1; i < tideHeights.length - 1; i++) {
            const prev = tideHeights[i - 1];
            const curr = tideHeights[i];
            const next = tideHeights[i + 1];
            
            // 检测高潮点（峰值）
            if (prev < curr && curr > next && curr > 2.5) {
                schedule.push({
                    time: `${i.toString().padStart(2, '0')}:00`,
                    type: '高潮',
                    height: Math.round(curr * 10) / 10,
                    timestamp: new Date(date.getTime() + i * 60 * 60 * 1000)
                });
            }
            // 检测低潮点（谷值）
            else if (prev > curr && curr < next && curr < 2.0) {
                schedule.push({
                    time: `${i.toString().padStart(2, '0')}:00`,
                    type: '低潮',
                    height: Math.round(curr * 10) / 10,
                    timestamp: new Date(date.getTime() + i * 60 * 60 * 1000)
                });
            }
        }

        // 确保至少有2-4个潮汐点
        if (schedule.length < 2) {
            schedule.length = 0; // 清空
            schedule.push(
                { time: '05:30', type: '低潮', height: 1.1, timestamp: new Date(date.getTime() + 5.5 * 60 * 60 * 1000) },
                { time: '11:45', type: '高潮', height: 3.7, timestamp: new Date(date.getTime() + 11.75 * 60 * 60 * 1000) },
                { time: '17:20', type: '低潮', height: 1.3, timestamp: new Date(date.getTime() + 17.33 * 60 * 60 * 1000) },
                { time: '23:50', type: '高潮', height: 3.9, timestamp: new Date(date.getTime() + 23.83 * 60 * 60 * 1000) }
            );
        }

        return schedule.sort((a, b) => a.timestamp - b.timestamp);
    }

    // 获取综合数据 (保持与V1兼容)
    async getAllData(coordinates, date) {
        try {
            const [windyData, weatherData, oceanData, hourlyData] = await Promise.all([
                this.getWindyData(coordinates, date),
                this.getOpenWeatherData(coordinates, date),
                this.getStormglassData(coordinates, date),
                this.get24HourData(coordinates, date)
            ]);

            return {
                windy: windyData,
                weather: weatherData,
                ocean: oceanData,
                hourly: hourlyData,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('获取数据失败:', error);
            throw error;
        }
    }

    // 获取Windy数据 (与V1相同)
    async getWindyData(coordinates, date) {
        const cacheKey = this.getCacheKey('windy', coordinates, date);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const mockData = this.generateMockWindyData(coordinates, date);
            this.setCache(cacheKey, mockData);
            return mockData;
        } catch (error) {
            console.error('Windy API错误:', error);
            return this.generateMockWindyData(coordinates, date);
        }
    }

    // 获取OpenWeatherMap数据 (与V1相同)
    async getOpenWeatherData(coordinates, date) {
        const cacheKey = this.getCacheKey('openweather', coordinates, date);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const mockData = this.generateMockWeatherData(coordinates, date);
            this.setCache(cacheKey, mockData);
            return mockData;
        } catch (error) {
            console.error('OpenWeather API错误:', error);
            return this.generateMockWeatherData(coordinates, date);
        }
    }

    // 获取Stormglass数据 (与V1相同)
    async getStormglassData(coordinates, date) {
        const cacheKey = this.getCacheKey('stormglass', coordinates, date);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const mockData = this.generateMockOceanData(coordinates, date);
            this.setCache(cacheKey, mockData);
            return mockData;
        } catch (error) {
            console.error('Stormglass API错误:', error);
            return this.generateMockOceanData(coordinates, date);
        }
    }

    // 生成模拟Windy数据 (与V1相同)
    generateMockWindyData(coordinates, date) {
        const baseWind = Math.random() * 15 + 5;
        const baseWave = Math.random() * 2 + 0.5;
        
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

    // 生成模拟天气数据 (与V1相同)
    generateMockWeatherData(coordinates, date) {
        const temp = Math.random() * 15 + 15;
        const conditions = ['晴朗', '多云', '阴天', '小雨', '中雨'];
        
        return {
            temperature: Math.round(temp),
            humidity: Math.round(Math.random() * 40 + 40),
            pressure: Math.round(Math.random() * 50 + 1000),
            visibility: Math.round(Math.random() * 5 + 5),
            cloudCover: Math.round(Math.random() * 100),
            condition: conditions[Math.floor(Math.random() * conditions.length)],
            uvIndex: Math.round(Math.random() * 10)
        };
    }

    // 生成模拟海洋数据 (与V1相同)
    generateMockOceanData(coordinates, date) {
        return {
            waterTemperature: Math.round((Math.random() * 10 + 18) * 10) / 10,
            tideHeight: Math.round((Math.random() * 4 + 1) * 10) / 10,
            tideLevel: ['低潮', '涨潮', '高潮', '落潮'][Math.floor(Math.random() * 4)],
            currentSpeed: Math.round((Math.random() * 2) * 10) / 10,
            currentDirection: Math.round(Math.random() * 360),
            seaState: Math.floor(Math.random() * 6) + 1
        };
    }
}

// 创建全局数据服务实例
const dataService = new DataServiceV2();