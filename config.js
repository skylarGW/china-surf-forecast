// 配置文件 - 包含API密钥和浪点数据
const CONFIG = {
    // API配置 (请替换为你的实际API密钥)
    APIs: {
        WINDY: {
            key: 'YOUR_WINDY_API_KEY',
            baseUrl: 'https://api.windy.com/api'
        },
        OPENWEATHER: {
            key: 'YOUR_OPENWEATHER_API_KEY',
            baseUrl: 'https://api.openweathermap.org/data/2.5'
        },
        STORMGLASS: {
            key: 'YOUR_STORMGLASS_API_KEY',
            baseUrl: 'https://api.stormglass.io/v2'
        }
    },

    // 浪点数据配置
    SURF_SPOTS: {
        zhoushan: [
            {
                id: 'dongsha',
                name: '东沙冲浪公园',
                location: '舟山·朱家尖',
                coordinates: { lat: 29.8626, lng: 122.3394 },
                description: '舟山最受欢迎的冲浪点，设施完善',
                difficulty: 'beginner-intermediate',
                bestConditions: {
                    windDirection: ['NE', 'E', 'SE'],
                    waveHeight: [0.8, 2.5],
                    tideLevel: 'mid-high'
                }
            },
            {
                id: 'lulan',
                name: '岱山鹿栏晴沙',
                location: '舟山·岱山',
                coordinates: { lat: 30.2644, lng: 122.2267 },
                description: '天然海滩，适合进阶冲浪者',
                difficulty: 'intermediate-advanced',
                bestConditions: {
                    windDirection: ['N', 'NE', 'E'],
                    waveHeight: [1.0, 3.0],
                    tideLevel: 'mid'
                }
            }
        ],
        qingdao: [
            {
                id: 'shilaoren',
                name: '石老人海水浴场',
                location: '青岛·崂山区',
                coordinates: { lat: 36.1045, lng: 120.4651 },
                description: '青岛经典冲浪点，交通便利',
                difficulty: 'beginner-intermediate',
                bestConditions: {
                    windDirection: ['S', 'SE', 'E'],
                    waveHeight: [0.6, 2.0],
                    tideLevel: 'mid-high'
                }
            },
            {
                id: 'liuqinghe',
                name: '流清河沙滩',
                location: '青岛·崂山区',
                coordinates: { lat: 36.1789, lng: 120.5234 },
                description: '相对安静的冲浪点，适合练习',
                difficulty: 'beginner',
                bestConditions: {
                    windDirection: ['S', 'SW', 'SE'],
                    waveHeight: [0.5, 1.8],
                    tideLevel: 'mid'
                }
            },
            {
                id: 'huangdao',
                name: '黄岛两河口',
                location: '青岛·黄岛浪行者冲浪俱乐部',
                coordinates: { lat: 35.9617, lng: 120.1619 },
                description: '专业冲浪俱乐部，设施齐全',
                difficulty: 'intermediate-advanced',
                bestConditions: {
                    windDirection: ['SE', 'S', 'SW'],
                    waveHeight: [1.2, 3.5],
                    tideLevel: 'all'
                }
            }
        ]
    },

    // 评分权重配置
    SCORING_WEIGHTS: {
        waveHeight: 0.3,
        windSpeed: 0.25,
        windDirection: 0.2,
        tideLevel: 0.15,
        weather: 0.1
    },

    // 评分等级
    SCORE_LEVELS: {
        excellent: { min: 8.0, label: '极佳', class: 'score-excellent' },
        good: { min: 6.0, label: '良好', class: 'score-good' },
        fair: { min: 4.0, label: '一般', class: 'score-fair' },
        poor: { min: 0, label: '较差', class: 'score-poor' }
    }
};

// 工具函数
const UTILS = {
    // 格式化日期
    formatDate: (date) => {
        const options = { 
            month: 'short', 
            day: 'numeric',
            weekday: 'short'
        };
        return date.toLocaleDateString('zh-CN', options);
    },

    // 获取未来7天日期
    getNext7Days: () => {
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            dates.push({
                date: date,
                formatted: UTILS.formatDate(date),
                isToday: i === 0
            });
        }
        return dates;
    },

    // 风向转换
    degreeToDirection: (degree) => {
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        return directions[Math.round(degree / 22.5) % 16];
    },

    // 获取评分等级
    getScoreLevel: (score) => {
        for (const [level, config] of Object.entries(CONFIG.SCORE_LEVELS)) {
            if (score >= config.min) {
                return { level, ...config };
            }
        }
        return CONFIG.SCORE_LEVELS.poor;
    }
};