// API集成示例 - 展示如何接入真实API
// 注意：这个文件仅供参考，实际使用时需要处理CORS和API密钥安全问题

class RealAPIService {
    constructor() {
        this.config = CONFIG.APIs;
    }

    // 真实的OpenWeatherMap API调用示例
    async getRealOpenWeatherData(coordinates, date) {
        const { lat, lng } = coordinates;
        const apiKey = this.config.OPENWEATHER.key;
        
        try {
            // 当前天气
            const currentWeatherUrl = `${this.config.OPENWEATHER.baseUrl}/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=zh_cn`;
            const currentResponse = await fetch(currentWeatherUrl);
            const currentData = await currentResponse.json();

            // 5天预报
            const forecastUrl = `${this.config.OPENWEATHER.baseUrl}/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=zh_cn`;
            const forecastResponse = await fetch(forecastUrl);
            const forecastData = await forecastResponse.json();

            return {
                temperature: Math.round(currentData.main.temp),
                humidity: currentData.main.humidity,
                pressure: currentData.main.pressure,
                visibility: currentData.visibility / 1000, // 转换为km
                cloudCover: currentData.clouds.all,
                condition: currentData.weather[0].description,
                uvIndex: 0, // OpenWeather免费版不提供UV指数
                windSpeed: currentData.wind.speed * 1.94384, // 转换为节
                windDirection: currentData.wind.deg
            };
        } catch (error) {
            console.error('OpenWeather API调用失败:', error);
            throw error;
        }
    }

    // 真实的Stormglass API调用示例
    async getRealStormglassData(coordinates, date) {
        const { lat, lng } = coordinates;
        const apiKey = this.config.STORMGLASS.key;
        
        // 获取当前时间和24小时后的时间
        const start = Math.floor(date.getTime() / 1000);
        const end = start + 24 * 60 * 60; // 24小时后

        try {
            const params = [
                'waveHeight',
                'wavePeriod',
                'waveDirection',
                'windWaveHeight',
                'windWavePeriod',
                'swellHeight',
                'swellPeriod',
                'swellDirection',
                'waterTemperature',
                'currentSpeed',
                'currentDirection'
            ].join(',');

            const url = `${this.config.STORMGLASS.baseUrl}/weather/point?lat=${lat}&lng=${lng}&params=${params}&start=${start}&end=${end}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': apiKey
                }
            });

            const data = await response.json();
            const firstHour = data.hours[0]; // 获取第一个小时的数据

            return {
                waveHeight: firstHour.waveHeight?.noaa || 0,
                wavePeriod: firstHour.wavePeriod?.noaa || 0,
                waveDirection: firstHour.waveDirection?.noaa || 0,
                swellHeight: firstHour.swellHeight?.noaa || 0,
                swellPeriod: firstHour.swellPeriod?.noaa || 0,
                swellDirection: firstHour.swellDirection?.noaa || 0,
                waterTemperature: firstHour.waterTemperature?.noaa || 20,
                currentSpeed: firstHour.currentSpeed?.noaa || 0,
                currentDirection: firstHour.currentDirection?.noaa || 0
            };
        } catch (error) {
            console.error('Stormglass API调用失败:', error);
            throw error;
        }
    }

    // Windy API调用示例（需要特殊处理，因为Windy API结构复杂）
    async getRealWindyData(coordinates, date) {
        // 注意：Windy API的使用需要特殊的认证和请求格式
        // 这里提供一个基本的结构示例
        
        const { lat, lng } = coordinates;
        const apiKey = this.config.WINDY.key;

        try {
            // Windy API通常需要POST请求
            const requestBody = {
                lat: lat,
                lon: lng,
                model: 'gfs', // 使用GFS模型
                parameters: ['wind', 'waves'],
                levels: ['surface'],
                key: apiKey
            };

            const response = await fetch(`${this.config.WINDY.baseUrl}/point-forecast/v2`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            
            // 处理Windy返回的数据格式
            return this.processWindyResponse(data);
        } catch (error) {
            console.error('Windy API调用失败:', error);
            throw error;
        }
    }

    // 处理Windy API响应
    processWindyResponse(data) {
        // Windy API返回的数据格式比较复杂，需要根据实际API文档进行处理
        // 这里提供一个基本的处理示例
        
        return {
            windSpeed: data.wind_u?.[0] || 0,
            windDirection: data.wind_v?.[0] || 0,
            windGust: data.gust?.[0] || 0,
            waveHeight: data.waves?.[0] || 0,
            wavePeriod: data.period?.[0] || 0,
            waveDirection: data.waveDirection?.[0] || 0
        };
    }

    // 潮汐数据获取（可以使用免费的天文算法或第三方服务）
    async getTideData(coordinates, date) {
        // 可以使用以下免费服务：
        // 1. NOAA Tides & Currents API (美国海域)
        // 2. 天文算法计算（适用于全球）
        // 3. WorldTides API (有免费额度)

        try {
            // 示例：使用简化的天文算法
            return this.calculateTideFromAstronomy(coordinates, date);
        } catch (error) {
            console.error('潮汐数据获取失败:', error);
            return {
                level: '中潮',
                height: 2.0,
                nextChange: new Date(date.getTime() + 6 * 60 * 60 * 1000)
            };
        }
    }

    // 简化的天文潮汐计算
    calculateTideFromAstronomy(coordinates, date) {
        // 这是一个非常简化的潮汐计算示例
        // 实际应用中应该使用专业的潮汐预测算法
        
        const { lat, lng } = coordinates;
        const hour = date.getHours();
        const day = date.getDate();
        
        // 基于月相和时间的简单计算
        const lunarPhase = (day % 29.5) / 29.5;
        const tidePhase = (hour + lunarPhase * 12) % 12;
        
        let level, height;
        if (tidePhase < 3) {
            level = '低潮';
            height = 0.5 + Math.sin(tidePhase * Math.PI / 3) * 0.5;
        } else if (tidePhase < 6) {
            level = '涨潮';
            height = 1.0 + Math.sin((tidePhase - 3) * Math.PI / 3) * 1.5;
        } else if (tidePhase < 9) {
            level = '高潮';
            height = 2.5 + Math.sin((tidePhase - 6) * Math.PI / 3) * 1.0;
        } else {
            level = '落潮';
            height = 2.5 - Math.sin((tidePhase - 9) * Math.PI / 3) * 1.5;
        }

        return {
            level: level,
            height: Math.round(height * 10) / 10,
            nextChange: new Date(date.getTime() + (3 - (tidePhase % 3)) * 60 * 60 * 1000)
        };
    }
}

// 使用示例
/*
const realAPIService = new RealAPIService();

// 替换dataService.js中的模拟数据调用
async function getRealData(coordinates, date) {
    try {
        const [weatherData, oceanData, tideData] = await Promise.all([
            realAPIService.getRealOpenWeatherData(coordinates, date),
            realAPIService.getRealStormglassData(coordinates, date),
            realAPIService.getTideData(coordinates, date)
        ]);

        return {
            weather: weatherData,
            ocean: {
                ...oceanData,
                ...tideData
            },
            windy: oceanData, // Stormglass包含了风浪数据
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('获取真实数据失败:', error);
        throw error;
    }
}
*/

// CORS解决方案提示
/*
由于浏览器的CORS限制，直接从前端调用第三方API可能会遇到问题。
解决方案：

1. 使用代理服务器：
   - 创建一个简单的Node.js后端服务
   - 后端调用API并返回数据给前端
   - 避免CORS问题和API密钥暴露

2. 使用CORS代理服务：
   - https://cors-anywhere.herokuapp.com/
   - https://api.allorigins.win/
   - 注意：生产环境不建议使用公共代理

3. 服务器端渲染：
   - 使用Next.js、Nuxt.js等框架
   - 在服务器端获取数据后渲染页面

推荐方案：创建简单的Node.js后端API
*/