// AI分析器 V2.0 - 增加全国TOP3推荐功能
class AIAnalyzerV2 {
    constructor() {
        this.weights = CONFIG.SCORING_WEIGHTS;
    }

    // 分析所有浪点并生成全国TOP3推荐
    async analyzeAllSpotsGlobally(selectedDate) {
        const allSpots = CONFIG.getAllSpots();
        const analyses = [];

        for (const spot of allSpots) {
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

    // 生成全国TOP3推荐
    generateGlobalTop3(analyses) {
        const top3 = analyses.slice(0, 3);
        
        return top3.map((analysis, index) => ({
            rank: index + 1,
            spot: analysis.spot,
            score: analysis.scores.overallScore,
            reason: this.getGlobalReason(analysis, index + 1),
            level: UTILS.getScoreLevel(analysis.scores.overallScore),
            region: this.getSpotRegion(analysis.spot.id)
        }));
    }

    // 获取浪点所属地区
    getSpotRegion(spotId) {
        if (CONFIG.SURF_SPOTS.zhoushan.some(spot => spot.id === spotId)) {
            return '舟山群岛';
        } else if (CONFIG.SURF_SPOTS.qingdao.some(spot => spot.id === spotId)) {
            return '青岛海岸';
        }
        return '未知地区';
    }

    // 获取全国推荐理由
    getGlobalReason(analysis, rank) {
        const reasons = [];
        const data = analysis.data;
        
        // 浪况分析
        if (analysis.scores.waveScore >= 8) {
            reasons.push(`浪况极佳(${data.windy.waveHeight}m)`);
        } else if (analysis.scores.waveScore >= 6) {
            reasons.push(`浪况良好(${data.windy.waveHeight}m)`);
        }
        
        // 风况分析
        if (analysis.scores.windScore >= 8) {
            reasons.push(`风况理想(${data.windy.windSpeed}节)`);
        } else if (analysis.scores.windScore >= 6) {
            reasons.push(`风况适宜(${data.windy.windSpeed}节)`);
        }
        
        // 潮汐分析
        if (analysis.scores.tideScore >= 7) {
            reasons.push(`潮汐${data.ocean.tideLevel}`);
        }
        
        // 天气分析
        if (data.weather.condition === '晴朗') {
            reasons.push(`天气${data.weather.condition}`);
        }
        
        // 特殊优势
        if (rank === 1) {
            reasons.push('综合条件最佳');
        } else if (rank === 2) {
            reasons.push('次优选择');
        } else if (rank === 3) {
            reasons.push('第三推荐');
        }
        
        return reasons.slice(0, 3).join('，');
    }

    // 分析单个浪点 (与V1相同，但增加了小时数据处理)
    async analyzeSpot(spot, data, selectedDate) {
        try {
            const scores = {
                waveScore: this.calculateWaveScore(spot, data),
                windScore: this.calculateWindScore(spot, data),
                tideScore: this.calculateTideScore(spot, data),
                weatherScore: this.calculateWeatherScore(data),
                overallScore: 0
            };

            scores.overallScore = this.calculateOverallScore(scores);
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

    // 分析地区浪点
    async analyzeRegionSpots(region, selectedDate) {
        if (region === 'all') {
            return await this.analyzeAllSpotsGlobally(selectedDate);
        }
        
        const spots = CONFIG.SURF_SPOTS[region] || [];
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

        analyses.sort((a, b) => b.scores.overallScore - a.scores.overallScore);
        return analyses;
    }

    // 生成小时图表数据
    generateHourlyChartData(hourlyData) {
        if (!hourlyData) {
            console.error('hourlyData is null or undefined');
            return null;
        }
        
        const labels = UTILS.generate24HourLabels();
        
        // 简化的颜色配置
        const colors = {
            waveHeight: '#2196F3',
            windWave: '#1976D2', 
            swell: '#42A5F5',
            windSpeed: '#FF9800',
            windGust: '#F57C00',
            tide: '#4CAF50'
        };
        
        return {
            // 浪高图表数据
            waveChart: {
                labels: labels,
                datasets: [
                    {
                        label: '总浪高',
                        data: hourlyData.waveHeight || [],
                        borderColor: colors.waveHeight,
                        backgroundColor: colors.waveHeight + '20',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: '风浪',
                        data: hourlyData.windWave || [],
                        borderColor: colors.windWave,
                        backgroundColor: colors.windWave + '20',
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: '涌浪',
                        data: hourlyData.swell || [],
                        borderColor: colors.swell,
                        backgroundColor: colors.swell + '20',
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            
            // 风速图表数据
            windChart: {
                labels: labels,
                datasets: [
                    {
                        label: '风速',
                        data: hourlyData.windSpeed || [],
                        borderColor: colors.windSpeed,
                        backgroundColor: colors.windSpeed + '20',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: '阵风',
                        data: hourlyData.windGust || [],
                        borderColor: colors.windGust,
                        backgroundColor: colors.windGust + '20',
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            
            // 潮汐图表数据
            tideChart: {
                labels: labels,
                datasets: [
                    {
                        label: '潮高',
                        data: hourlyData.tideHeight || [],
                        borderColor: colors.tide,
                        backgroundColor: colors.tide + '20',
                        fill: true,
                        tension: 0.4
                    }
                ]
            }
        };
    }

    // 计算浪况评分 (与V1相同)
    calculateWaveScore(spot, data) {
        const waveHeight = data.windy.waveHeight;
        const swellHeight = data.windy.swellHeight;
        const wavePeriod = data.windy.wavePeriod;

        let score = 0;

        const [minHeight, maxHeight] = spot.bestConditions.waveHeight;
        if (waveHeight >= minHeight && waveHeight <= maxHeight) {
            score += 4;
        } else if (waveHeight < minHeight) {
            score += Math.max(0, 4 * (waveHeight / minHeight));
        } else {
            score += Math.max(0, 4 * (maxHeight / waveHeight));
        }

        if (swellHeight > 0.5 && swellHeight < 3) {
            score += 2;
        } else {
            score += Math.max(0, 2 * (1 - Math.abs(swellHeight - 1.5) / 1.5));
        }

        if (wavePeriod >= 8 && wavePeriod <= 14) {
            score += 2;
        } else {
            score += Math.max(0, 2 * (1 - Math.abs(wavePeriod - 11) / 6));
        }

        score += 2;
        return Math.min(10, Math.max(0, score));
    }

    // 计算风况评分 (与V1相同)
    calculateWindScore(spot, data) {
        const windSpeed = data.windy.windSpeed;
        const windDirection = UTILS.degreeToDirection(data.windy.windDirection);
        const windGust = data.windy.windGust;

        let score = 0;

        if (windSpeed >= 5 && windSpeed <= 15) {
            score += 4;
        } else if (windSpeed < 5) {
            score += windSpeed;
        } else {
            score += Math.max(0, 4 - (windSpeed - 15) * 0.2);
        }

        if (spot.bestConditions.windDirection.includes(windDirection)) {
            score += 3;
        } else {
            score += 1;
        }

        const gustDiff = windGust - windSpeed;
        if (gustDiff < 5) {
            score += 2;
        } else {
            score += Math.max(0, 2 - gustDiff * 0.2);
        }

        score += 1;
        return Math.min(10, Math.max(0, score));
    }

    // 计算潮汐评分 (与V1相同)
    calculateTideScore(spot, data) {
        const tideLevel = data.ocean.tideLevel;
        const tideHeight = data.ocean.tideHeight;

        let score = 5;
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

        if (tideHeight >= 1.5 && tideHeight <= 3.5) {
            score += 2;
        } else {
            score += Math.max(0, 2 - Math.abs(tideHeight - 2.5) * 0.4);
        }

        return Math.min(10, Math.max(0, score));
    }

    // 计算天气评分 (与V1相同)
    calculateWeatherScore(data) {
        const weather = data.weather;
        let score = 5;

        const weatherScores = {
            '晴朗': 3,
            '多云': 2,
            '阴天': 1,
            '小雨': 0,
            '中雨': -1,
            '大雨': -2
        };
        score += weatherScores[weather.condition] || 0;

        if (weather.visibility >= 8) {
            score += 1;
        } else if (weather.visibility >= 5) {
            score += 0.5;
        }

        if (weather.temperature >= 20 && weather.temperature <= 28) {
            score += 1;
        }

        return Math.min(10, Math.max(0, score));
    }

    // 计算综合评分 (与V1相同)
    calculateOverallScore(scores) {
        return (
            scores.waveScore * this.weights.waveHeight +
            scores.windScore * this.weights.windSpeed +
            scores.tideScore * this.weights.tideLevel +
            scores.weatherScore * this.weights.weather
        );
    }

    // 生成AI建议 (与V1相同)
    generateSuggestion(spot, data, scores) {
        const suggestions = [];
        const warnings = [];

        if (scores.waveScore >= 8) {
            suggestions.push(`🌊 浪况极佳！浪高${data.windy.waveHeight}米，周期${data.windy.wavePeriod}秒，非常适合冲浪`);
        } else if (scores.waveScore >= 6) {
            suggestions.push(`🌊 浪况良好，浪高${data.windy.waveHeight}米，适合练习`);
        } else if (scores.waveScore < 4) {
            warnings.push(`⚠️ 浪况较差，浪高仅${data.windy.waveHeight}米，建议选择其他时间`);
        }

        if (scores.windScore >= 8) {
            suggestions.push(`💨 风况理想！${data.windy.windSpeed}节${UTILS.degreeToDirection(data.windy.windDirection)}风，有利于冲浪`);
        } else if (scores.windScore < 4) {
            warnings.push(`💨 风况不佳，${data.windy.windSpeed}节风速，可能影响冲浪体验`);
        }

        if (scores.tideScore >= 7) {
            suggestions.push(`🌊 潮汐条件好，当前${data.ocean.tideLevel}，潮高${data.ocean.tideHeight}米`);
        }

        if (data.weather.condition === '晴朗') {
            suggestions.push(`☀️ 天气晴朗，气温${data.weather.temperature}°C，冲浪条件舒适`);
        } else if (data.weather.condition.includes('雨')) {
            warnings.push(`🌧️ 有降雨，注意安全，建议携带防水装备`);
        }

        if (data.windy.windSpeed > 20) {
            warnings.push(`⚠️ 风速较大(${data.windy.windSpeed}节)，请注意安全`);
        }
        if (data.windy.waveHeight > 2.5) {
            warnings.push(`⚠️ 浪高较大(${data.windy.waveHeight}米)，建议有经验的冲浪者参与`);
        }

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

    // 获取最佳时间建议 (与V1相同)
    getBestTimeAdvice(data) {
        if (data.ocean.tideLevel === '涨潮') {
            return `⏰ 当前涨潮期，建议在接下来2-3小时内冲浪`;
        } else if (data.ocean.tideLevel === '高潮') {
            return `⏰ 当前高潮期，是冲浪的黄金时间`;
        } else if (data.ocean.tideLevel === '落潮') {
            return `⏰ 当前落潮期，可能有不错的浪况`;
        }
        return null;
    }

    // 生成总结 (与V1相同)
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

    // 获取默认分析结果 (与V1相同)
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
const aiAnalyzer = new AIAnalyzerV2();