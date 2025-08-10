// AI分析器 - 负责分析数据并生成推荐
class AIAnalyzer {
    constructor() {
        this.weights = CONFIG.SCORING_WEIGHTS;
    }

    // 主要分析函数 - 分析单个浪点
    async analyzeSpot(spot, data, selectedDate) {
        try {
            const scores = {
                waveScore: this.calculateWaveScore(spot, data),
                windScore: this.calculateWindScore(spot, data),
                tideScore: this.calculateTideScore(spot, data),
                weatherScore: this.calculateWeatherScore(data),
                overallScore: 0
            };

            // 计算综合评分
            scores.overallScore = this.calculateOverallScore(scores);

            // 生成AI建议
            const suggestion = this.generateSuggestion(spot, data, scores);

            return {
                spot: spot,
                scores: scores,
                suggestion: suggestion,
                data: data,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error(`分析浪点 ${spot.name} 时出错:`, error);
            return this.getDefaultAnalysis(spot);
        }
    }

    // 计算浪况评分
    calculateWaveScore(spot, data) {
        const waveHeight = data.windy.waveHeight;
        const swellHeight = data.windy.swellHeight;
        const wavePeriod = data.windy.wavePeriod;
        const waveDirection = data.windy.waveDirection;

        let score = 0;

        // 浪高评分 (根据浪点适合的浪高范围)
        const [minHeight, maxHeight] = spot.bestConditions.waveHeight;
        if (waveHeight >= minHeight && waveHeight <= maxHeight) {
            score += 4; // 满分4分
        } else if (waveHeight < minHeight) {
            score += Math.max(0, 4 * (waveHeight / minHeight));
        } else {
            score += Math.max(0, 4 * (maxHeight / waveHeight));
        }

        // 涌浪评分 (涌浪越大越好，但要适中)
        if (swellHeight > 0.5 && swellHeight < 3) {
            score += 2;
        } else {
            score += Math.max(0, 2 * (1 - Math.abs(swellHeight - 1.5) / 1.5));
        }

        // 周期评分 (8-14秒为最佳)
        if (wavePeriod >= 8 && wavePeriod <= 14) {
            score += 2;
        } else {
            score += Math.max(0, 2 * (1 - Math.abs(wavePeriod - 11) / 6));
        }

        // 浪向评分 (简化处理)
        score += 2; // 基础分

        return Math.min(10, Math.max(0, score));
    }

    // 计算风况评分
    calculateWindScore(spot, data) {
        const windSpeed = data.windy.windSpeed;
        const windDirection = UTILS.degreeToDirection(data.windy.windDirection);
        const windGust = data.windy.windGust;

        let score = 0;

        // 风速评分 (5-15节为最佳)
        if (windSpeed >= 5 && windSpeed <= 15) {
            score += 4;
        } else if (windSpeed < 5) {
            score += windSpeed; // 无风扣分
        } else {
            score += Math.max(0, 4 - (windSpeed - 15) * 0.2);
        }

        // 风向评分
        if (spot.bestConditions.windDirection.includes(windDirection)) {
            score += 3;
        } else {
            score += 1; // 非最佳风向给基础分
        }

        // 阵风评分 (阵风不宜过大)
        const gustDiff = windGust - windSpeed;
        if (gustDiff < 5) {
            score += 2;
        } else {
            score += Math.max(0, 2 - gustDiff * 0.2);
        }

        // 稳定性评分
        score += 1;

        return Math.min(10, Math.max(0, score));
    }

    // 计算潮汐评分
    calculateTideScore(spot, data) {
        const tideLevel = data.ocean.tideLevel;
        const tideHeight = data.ocean.tideHeight;

        let score = 5; // 基础分

        // 根据浪点最佳潮汐条件评分
        const bestTide = spot.bestConditions.tideLevel;
        
        if (bestTide === 'all') {
            score += 3;
        } else if (bestTide === 'mid' && (tideLevel === '涨潮' || tideLevel === '落潮')) {
            score += 3;
        } else if (bestTide === 'mid-high' && (tideLevel === '涨潮' || tideLevel === '高潮')) {
            score += 3;
        } else if (bestTide === tideLevel) {
            score += 3;
        } else {
            score += 1;
        }

        // 潮高评分 (1.5-3.5米为最佳)
        if (tideHeight >= 1.5 && tideHeight <= 3.5) {
            score += 2;
        } else {
            score += Math.max(0, 2 - Math.abs(tideHeight - 2.5) * 0.4);
        }

        return Math.min(10, Math.max(0, score));
    }

    // 计算天气评分
    calculateWeatherScore(data) {
        const weather = data.weather;
        let score = 5; // 基础分

        // 天气条件评分
        const weatherScores = {
            '晴朗': 3,
            '多云': 2,
            '阴天': 1,
            '小雨': 0,
            '中雨': -1,
            '大雨': -2
        };
        score += weatherScores[weather.condition] || 0;

        // 能见度评分
        if (weather.visibility >= 8) {
            score += 1;
        } else if (weather.visibility >= 5) {
            score += 0.5;
        }

        // 温度评分 (20-28度为最佳)
        if (weather.temperature >= 20 && weather.temperature <= 28) {
            score += 1;
        }

        return Math.min(10, Math.max(0, score));
    }

    // 计算综合评分
    calculateOverallScore(scores) {
        return (
            scores.waveScore * this.weights.waveHeight +
            scores.windScore * this.weights.windSpeed +
            scores.tideScore * this.weights.tideLevel +
            scores.weatherScore * this.weights.weather
        );
    }

    // 生成AI建议
    generateSuggestion(spot, data, scores) {
        const suggestions = [];
        const warnings = [];

        // 浪况建议
        if (scores.waveScore >= 8) {
            suggestions.push(`🌊 浪况极佳！浪高${data.windy.waveHeight}米，周期${data.windy.wavePeriod}秒，非常适合冲浪`);
        } else if (scores.waveScore >= 6) {
            suggestions.push(`🌊 浪况良好，浪高${data.windy.waveHeight}米，适合练习`);
        } else if (scores.waveScore < 4) {
            warnings.push(`⚠️ 浪况较差，浪高仅${data.windy.waveHeight}米，建议选择其他时间`);
        }

        // 风况建议
        if (scores.windScore >= 8) {
            suggestions.push(`💨 风况理想！${data.windy.windSpeed}节${UTILS.degreeToDirection(data.windy.windDirection)}风，有利于冲浪`);
        } else if (scores.windScore < 4) {
            warnings.push(`💨 风况不佳，${data.windy.windSpeed}节风速，可能影响冲浪体验`);
        }

        // 潮汐建议
        if (scores.tideScore >= 7) {
            suggestions.push(`🌊 潮汐条件好，当前${data.ocean.tideLevel}，潮高${data.ocean.tideHeight}米`);
        }

        // 天气建议
        if (data.weather.condition === '晴朗') {
            suggestions.push(`☀️ 天气晴朗，气温${data.weather.temperature}°C，冲浪条件舒适`);
        } else if (data.weather.condition.includes('雨')) {
            warnings.push(`🌧️ 有降雨，注意安全，建议携带防水装备`);
        }

        // 安全提醒
        if (data.windy.windSpeed > 20) {
            warnings.push(`⚠️ 风速较大(${data.windy.windSpeed}节)，请注意安全`);
        }
        if (data.windy.waveHeight > 2.5) {
            warnings.push(`⚠️ 浪高较大(${data.windy.waveHeight}米)，建议有经验的冲浪者参与`);
        }

        // 最佳时间建议
        const bestTime = this.getBestTimeAdvice(data);
        if (bestTime) {
            suggestions.push(bestTime);
        }

        return {
            suggestions: suggestions,
            warnings: warnings,
            summary: this.generateSummary(scores.overallScore, spot.difficulty)
        };
    }

    // 获取最佳时间建议
    getBestTimeAdvice(data) {
        const currentHour = new Date().getHours();
        
        if (data.ocean.tideLevel === '涨潮') {
            return `⏰ 当前涨潮期，建议在接下来2-3小时内冲浪`;
        } else if (data.ocean.tideLevel === '高潮') {
            return `⏰ 当前高潮期，是冲浪的黄金时间`;
        } else if (data.ocean.tideLevel === '落潮') {
            return `⏰ 当前落潮期，可能有不错的浪况`;
        }
        
        return null;
    }

    // 生成总结
    generateSummary(score, difficulty) {
        const level = UTILS.getScoreLevel(score);
        
        let summary = `综合评分 ${score.toFixed(1)}/10 - ${level.label}`;
        
        if (difficulty === 'beginner' && score >= 6) {
            summary += '，适合初学者';
        } else if (difficulty === 'intermediate' && score >= 7) {
            summary += '，适合中级冲浪者';
        } else if (difficulty === 'advanced' && score >= 8) {
            summary += '，适合高级冲浪者';
        } else if (score < 5) {
            summary += '，建议选择其他时间或地点';
        }
        
        return summary;
    }

    // 分析所有浪点并排序
    async analyzeAllSpots(region, selectedDate) {
        const spots = CONFIG.SURF_SPOTS[region];
        const analyses = [];

        for (const spot of spots) {
            try {
                const data = await dataService.getAllData(spot.coordinates, selectedDate);
                const analysis = await this.analyzeSpot(spot, data, selectedDate);
                analyses.push(analysis);
            } catch (error) {
                console.error(`分析浪点 ${spot.name} 失败:`, error);
                analyses.push(this.getDefaultAnalysis(spot));
            }
        }

        // 按评分排序
        analyses.sort((a, b) => b.scores.overallScore - a.scores.overallScore);
        
        return analyses;
    }

    // 生成最佳推荐
    generateBestRecommendations(analyses) {
        const top3 = analyses.slice(0, 3);
        
        return top3.map((analysis, index) => ({
            rank: index + 1,
            spot: analysis.spot,
            score: analysis.scores.overallScore,
            reason: this.getBestReason(analysis, index + 1),
            level: UTILS.getScoreLevel(analysis.scores.overallScore)
        }));
    }

    // 获取推荐理由
    getBestReason(analysis, rank) {
        const reasons = [];
        
        if (analysis.scores.waveScore >= 8) {
            reasons.push('浪况极佳');
        } else if (analysis.scores.waveScore >= 6) {
            reasons.push('浪况良好');
        }
        
        if (analysis.scores.windScore >= 8) {
            reasons.push('风况理想');
        }
        
        if (analysis.scores.tideScore >= 7) {
            reasons.push('潮汐适宜');
        }
        
        if (analysis.data.weather.condition === '晴朗') {
            reasons.push('天气晴朗');
        }
        
        if (reasons.length === 0) {
            reasons.push('综合条件相对较好');
        }
        
        return reasons.join('，');
    }

    // 获取默认分析结果
    getDefaultAnalysis(spot) {
        return {
            spot: spot,
            scores: {
                waveScore: 5,
                windScore: 5,
                tideScore: 5,
                weatherScore: 5,
                overallScore: 5
            },
            suggestion: {
                suggestions: ['数据获取中，请稍后刷新'],
                warnings: [],
                summary: '暂无数据'
            },
            data: null,
            timestamp: Date.now()
        };
    }
}

// 创建全局AI分析器实例
const aiAnalyzer = new AIAnalyzer();