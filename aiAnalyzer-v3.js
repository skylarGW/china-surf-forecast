// AI分析器 V3.0 - 表格版本
class AIAnalyzerV3 {
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
        
        if (analysis.scores.waveScore >= 8) {
            reasons.push(`浪况极佳(${data.windy.waveHeight}m)`);
        } else if (analysis.scores.waveScore >= 6) {
            reasons.push(`浪况良好(${data.windy.waveHeight}m)`);
        }
        
        if (analysis.scores.windScore >= 8) {
            reasons.push(`风况理想(${data.windy.windSpeed}节)`);
        } else if (analysis.scores.windScore >= 6) {
            reasons.push(`风况适宜(${data.windy.windSpeed}节)`);
        }
        
        if (analysis.scores.tideScore >= 7) {
            reasons.push(`潮汐${data.ocean.tideLevel}`);
        }
        
        if (data.weather.condition === '晴朗') {
            reasons.push(`天气${data.weather.condition}`);
        }
        
        if (rank === 1) {
            reasons.push('综合条件最佳');
        } else if (rank === 2) {
            reasons.push('次优选择');
        } else if (rank === 3) {
            reasons.push('第三推荐');
        }
        
        return reasons.slice(0, 3).join('，');
    }

    // 分析单个浪点
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

    // 生成24小时数据表格HTML
    generateHourlyTableHTML(hourlyData) {
        if (!hourlyData) {
            return '<p>暂无24小时数据</p>';
        }

        const labels = UTILS.generate24HourLabels();
        
        let tableHTML = `
            <table class="hourly-table">
                <thead>
                    <tr>
                        <th>时间</th>
                        <th>浪高(m)</th>
                        <th>涌浪高度(m)</th>
                        <th>涌浪周期(s)</th>
                        <th>风力(节)</th>
                        <th>风向</th>
                        <th>水温(°C)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        for (let i = 0; i < 24; i++) {
            const waveHeight = hourlyData.waveHeight[i] || 0;
            const swellHeight = hourlyData.swell[i] || 0;
            const swellPeriod = this.calculateSwellPeriod(i); // 计算涌浪周期
            const windSpeed = hourlyData.windSpeed[i] || 0;
            const windDirection = UTILS.degreeToDirection(hourlyData.windDirection[i] || 0);
            const waterTemp = this.calculateWaterTemp(i); // 计算水温

            tableHTML += `
                <tr>
                    <td class="time-col">${labels[i]}</td>
                    <td>${waveHeight}</td>
                    <td>${swellHeight}</td>
                    <td>${swellPeriod}</td>
                    <td>${windSpeed}</td>
                    <td>${windDirection}</td>
                    <td>${waterTemp}</td>
                </tr>
            `;
        }

        tableHTML += `
                </tbody>
            </table>
        `;

        return tableHTML;
    }

    // 计算涌浪周期（基于时间的模拟）
    calculateSwellPeriod(hour) {
        // 涌浪周期通常在8-15秒之间，有一定的周期性变化
        const basePeriod = 10;
        const variation = Math.sin(hour * Math.PI / 12) * 3;
        const randomFactor = (Math.random() - 0.5) * 2;
        return Math.round((basePeriod + variation + randomFactor) * 10) / 10;
    }

    // 计算水温（基于时间的模拟）
    calculateWaterTemp(hour) {
        // 水温相对稳定，但有轻微的日变化
        const baseTemp = 22;
        const dailyVariation = Math.sin((hour - 14) * Math.PI / 12) * 2; // 下午2点最高
        const randomFactor = (Math.random() - 0.5) * 1;
        return Math.round((baseTemp + dailyVariation + randomFactor) * 10) / 10;
    }

    // 计算浪况评分
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

    // 计算风况评分
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

    // 计算潮汐评分
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

    // 计算天气评分
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

    // 获取最佳时间建议
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
const aiAnalyzer = new AIAnalyzerV3();