// 主应用程序 - 控制页面交互和数据展示
class SurfForecastApp {
    constructor() {
        this.currentRegion = 'zhoushan';
        this.selectedDate = new Date();
        this.currentAnalyses = [];
        this.init();
    }

    // 初始化应用
    init() {
        this.setupEventListeners();
        this.renderDateSelector();
        this.loadData();
    }

    // 设置事件监听器
    setupEventListeners() {
        // 地区切换
        document.querySelectorAll('.region-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchRegion(e.target.dataset.region);
            });
        });

        // 模态框关闭
        document.querySelector('.close').addEventListener('click', () => {
            document.getElementById('detailModal').style.display = 'none';
        });

        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('detailModal');
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // 渲染日期选择器
    renderDateSelector() {
        const dates = UTILS.getNext7Days();
        const container = document.getElementById('dateButtons');
        
        container.innerHTML = dates.map((dateInfo, index) => `
            <button class="date-btn ${index === 0 ? 'active' : ''} ${dateInfo.isToday ? 'today' : ''}" 
                    data-date="${dateInfo.date.toISOString()}">
                ${dateInfo.formatted}
            </button>
        `).join('');

        // 添加日期切换事件
        container.querySelectorAll('.date-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchDate(new Date(e.target.dataset.date));
            });
        });
    }

    // 切换地区
    switchRegion(region) {
        this.currentRegion = region;
        
        // 更新按钮状态
        document.querySelectorAll('.region-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.region === region);
        });

        this.loadData();
    }

    // 切换日期
    switchDate(date) {
        this.selectedDate = date;
        
        // 更新按钮状态
        document.querySelectorAll('.date-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.date === date.toISOString());
        });

        this.loadData();
    }

    // 加载数据
    async loadData() {
        try {
            this.showLoading();
            
            // 分析所有浪点
            this.currentAnalyses = await aiAnalyzer.analyzeAllSpots(this.currentRegion, this.selectedDate);
            
            // 渲染AI推荐
            this.renderAIRecommendations();
            
            // 渲染浪点卡片
            this.renderSpotCards();
            
        } catch (error) {
            console.error('加载数据失败:', error);
            this.showError('数据加载失败，请稍后重试');
        }
    }

    // 显示加载状态
    showLoading() {
        document.getElementById('aiAnalysis').innerHTML = '<div class="loading">🤖 AI正在分析最佳冲浪条件...</div>';
        document.getElementById('spotsGrid').innerHTML = '<div class="loading">加载浪点数据中...</div>';
    }

    // 显示错误信息
    showError(message) {
        document.getElementById('aiAnalysis').innerHTML = `<div class="error">❌ ${message}</div>`;
    }

    // 渲染AI推荐
    renderAIRecommendations() {
        const recommendations = aiAnalyzer.generateBestRecommendations(this.currentAnalyses);
        const container = document.getElementById('aiAnalysis');
        
        if (recommendations.length === 0) {
            container.innerHTML = '<div class="no-data">暂无推荐数据</div>';
            return;
        }

        const html = `
            <div class="ai-intro">
                <p>🎯 基于风浪、潮汐、天气等多维度数据分析，为您推荐今日最佳冲浪点：</p>
            </div>
            <div class="best-spots">
                ${recommendations.map(rec => `
                    <div class="best-spot rank-${rec.rank}">
                        <div class="spot-rank">
                            ${rec.rank === 1 ? '🥇' : rec.rank === 2 ? '🥈' : '🥉'} 
                            ${rec.spot.name}
                        </div>
                        <div class="spot-score">
                            评分: ${rec.score.toFixed(1)}/10 (${rec.level.label})
                        </div>
                        <div class="ai-reason">
                            💡 ${rec.reason}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.innerHTML = html;
    }

    // 渲染浪点卡片
    renderSpotCards() {
        const container = document.getElementById('spotsGrid');
        
        if (this.currentAnalyses.length === 0) {
            container.innerHTML = '<div class="no-data">暂无浪点数据</div>';
            return;
        }

        const html = this.currentAnalyses.map(analysis => {
            const level = UTILS.getScoreLevel(analysis.scores.overallScore);
            const data = analysis.data;
            
            return `
                <div class="spot-card" onclick="app.showSpotDetail('${analysis.spot.id}')">
                    <div class="spot-header">
                        <div>
                            <div class="spot-name">${analysis.spot.name}</div>
                            <div class="spot-location">${analysis.spot.location}</div>
                        </div>
                        <div class="score-badge ${level.class}">
                            ${analysis.scores.overallScore.toFixed(1)}
                        </div>
                    </div>
                    
                    <div class="weather-grid">
                        <div class="weather-item">
                            <div class="weather-value">${data ? data.windy.waveHeight : '--'}m</div>
                            <div class="weather-label">浪高</div>
                        </div>
                        <div class="weather-item">
                            <div class="weather-value">${data ? data.windy.windSpeed : '--'}</div>
                            <div class="weather-label">风速(节)</div>
                        </div>
                        <div class="weather-item">
                            <div class="weather-value">${data ? data.weather.temperature : '--'}°C</div>
                            <div class="weather-label">气温</div>
                        </div>
                    </div>
                    
                    <div class="wave-details">
                        <div class="wave-item">
                            <strong>周期:</strong> ${data ? data.windy.wavePeriod : '--'}s
                        </div>
                        <div class="wave-item">
                            <strong>潮汐:</strong> ${data ? data.ocean.tideLevel : '--'}
                        </div>
                    </div>
                    
                    <div class="ai-suggestion">
                        <div class="suggestion-title">AI建议</div>
                        <div class="suggestion-text">
                            ${analysis.suggestion.summary}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    }

    // 显示浪点详情
    showSpotDetail(spotId) {
        const analysis = this.currentAnalyses.find(a => a.spot.id === spotId);
        if (!analysis) return;

        const modal = document.getElementById('detailModal');
        const content = document.getElementById('modalContent');
        
        const data = analysis.data;
        const spot = analysis.spot;
        const scores = analysis.scores;
        const suggestion = analysis.suggestion;
        
        content.innerHTML = `
            <h2>${spot.name} - 详细分析</h2>
            <p class="spot-description">${spot.description}</p>
            
            <div class="detail-section">
                <h3>🌊 浪况分析 (评分: ${scores.waveScore.toFixed(1)}/10)</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>浪高:</strong> ${data.windy.waveHeight}m
                    </div>
                    <div class="detail-item">
                        <strong>周期:</strong> ${data.windy.wavePeriod}s
                    </div>
                    <div class="detail-item">
                        <strong>浪向:</strong> ${UTILS.degreeToDirection(data.windy.waveDirection)}
                    </div>
                    <div class="detail-item">
                        <strong>涌浪:</strong> ${data.windy.swellHeight}m
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>💨 风况分析 (评分: ${scores.windScore.toFixed(1)}/10)</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>风速:</strong> ${data.windy.windSpeed}节
                    </div>
                    <div class="detail-item">
                        <strong>风向:</strong> ${UTILS.degreeToDirection(data.windy.windDirection)}
                    </div>
                    <div class="detail-item">
                        <strong>阵风:</strong> ${data.windy.windGust}节
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>🌊 潮汐分析 (评分: ${scores.tideScore.toFixed(1)}/10)</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>潮汐:</strong> ${data.ocean.tideLevel}
                    </div>
                    <div class="detail-item">
                        <strong>潮高:</strong> ${data.ocean.tideHeight}m
                    </div>
                    <div class="detail-item">
                        <strong>水温:</strong> ${data.ocean.waterTemperature}°C
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>☀️ 天气分析 (评分: ${scores.weatherScore.toFixed(1)}/10)</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>天气:</strong> ${data.weather.condition}
                    </div>
                    <div class="detail-item">
                        <strong>气温:</strong> ${data.weather.temperature}°C
                    </div>
                    <div class="detail-item">
                        <strong>湿度:</strong> ${data.weather.humidity}%
                    </div>
                    <div class="detail-item">
                        <strong>能见度:</strong> ${data.weather.visibility}km
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>🤖 AI综合建议</h3>
                <div class="suggestions-list">
                    ${suggestion.suggestions.map(s => `<div class="suggestion-item">✅ ${s}</div>`).join('')}
                    ${suggestion.warnings.map(w => `<div class="warning-item">⚠️ ${w}</div>`).join('')}
                </div>
                <div class="final-summary">
                    <strong>总结:</strong> ${suggestion.summary}
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
    }
}

// 启动应用
const app = new SurfForecastApp();

// 添加一些额外的CSS样式到页面
const additionalStyles = `
<style>
.detail-section {
    margin: 20px 0;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 10px;
}

.detail-section h3 {
    color: #2a5298;
    margin-bottom: 10px;
}

.detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
}

.detail-item {
    background: white;
    padding: 8px;
    border-radius: 5px;
    text-align: center;
}

.suggestions-list {
    margin: 10px 0;
}

.suggestion-item {
    color: #2e7d32;
    margin: 5px 0;
}

.warning-item {
    color: #d32f2f;
    margin: 5px 0;
}

.final-summary {
    margin-top: 15px;
    padding: 10px;
    background: #e3f2fd;
    border-radius: 5px;
    border-left: 4px solid #2196F3;
}

.ai-intro {
    margin-bottom: 15px;
    color: #555;
    font-style: italic;
}

.no-data, .error {
    text-align: center;
    padding: 20px;
    color: #666;
}

.error {
    color: #d32f2f;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', additionalStyles);