// 主应用程序 V5.0 - 独立版本（无依赖）
class SurfForecastAppV5 {
    constructor() {
        this.selectedDate = new Date();
        this.selectedRegion = 'all';
        this.currentAnalyses = [];
        this.globalTop3 = [];
        this.calibrationEnabled = true;
        
        this.init();
    }

    // 初始化应用
    init() {
        this.initDateSelector();
        this.initRegionSelector();
        this.initModal();
        this.initChinaCalibration();
        this.loadData();
    }

    // 初始化日期选择器
    initDateSelector() {
        const dateButtons = document.getElementById('dateButtons');
        const today = new Date();
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            
            const button = document.createElement('button');
            button.className = `date-btn ${i === 0 ? 'active' : ''}`;
            button.textContent = i === 0 ? '今天' : 
                               i === 1 ? '明天' : 
                               `${date.getMonth() + 1}/${date.getDate()}`;
            button.onclick = () => this.selectDate(date, button);
            
            dateButtons.appendChild(button);
        }
    }

    // 初始化地区选择器
    initRegionSelector() {
        const regionBtns = document.querySelectorAll('.region-btn');
        regionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                regionBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedRegion = e.target.dataset.region;
                this.filterSpotsByRegion();
            });
        });
    }

    // 初始化模态框
    initModal() {
        const modal = document.getElementById('detailModal');
        const closeBtn = modal.querySelector('.close');
        
        closeBtn.onclick = () => modal.style.display = 'none';
        window.onclick = (e) => {
            if (e.target === modal) modal.style.display = 'none';
        };
    }

    // 初始化中国数据校准功能
    initChinaCalibration() {
        const savedCalibration = localStorage.getItem('china_calibration_enabled');
        if (savedCalibration !== null) {
            this.calibrationEnabled = savedCalibration === 'true';
        }
        
        this.updateCalibrationStatus();
        this.updateDataSourceStatus();
    }

    // 选择日期
    selectDate(date, button) {
        document.querySelectorAll('.date-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        this.selectedDate = date;
        this.loadData();
    }

    // 加载数据
    async loadData() {
        try {
            await this.loadGlobalTop3();
            await this.loadRegionalData();
        } catch (error) {
            console.error('加载数据失败:', error);
            this.showError('数据加载失败，请稍后重试');
        }
    }

    // 加载全国TOP3推荐
    async loadGlobalTop3() {
        const globalAnalysis = document.getElementById('globalAiAnalysis');
        globalAnalysis.innerHTML = '<div class="loading">正在分析全国最佳冲浪条件...</div>';

        try {
            const allSpots = CONFIG.getAllSpots();
            const analyses = [];

            for (const spot of allSpots) {
                const data = await dataService.getAllData(spot.coordinates, this.selectedDate);
                const analysis = await aiAnalyzer.analyzeSpot(spot, data, this.selectedDate);
                analyses.push(analysis);
            }

            // 按总分排序，取前3名
            this.globalTop3 = analyses
                .sort((a, b) => b.scores.totalScore - a.scores.totalScore)
                .slice(0, 3);

            this.displayGlobalTop3();
        } catch (error) {
            console.error('加载全国TOP3失败:', error);
            globalAnalysis.innerHTML = '<div class="error">加载失败，请稍后重试</div>';
        }
    }

    // 显示全国TOP3
    displayGlobalTop3() {
        const globalAnalysis = document.getElementById('globalAiAnalysis');
        
        if (this.globalTop3.length === 0) {
            globalAnalysis.innerHTML = '<div class="no-data">暂无推荐数据</div>';
            return;
        }

        const html = this.globalTop3.map((analysis, index) => {
            const spot = analysis.spot;
            const scores = analysis.scores;
            const medal = ['🥇', '🥈', '🥉'][index];
            
            return `
                <div class="top-spot-card" onclick="app.showSpotDetail(${spot.id})">
                    <div class="rank-badge">${medal} TOP ${index + 1}</div>
                    <div class="spot-info">
                        <h3>${spot.name}</h3>
                        <p class="region">${spot.region === 'zhoushan' ? '舟山群岛' : '青岛海岸'}</p>
                        <div class="score-display">
                            <span class="total-score">${scores.totalScore.toFixed(1)}</span>
                            <span class="score-label">综合评分</span>
                        </div>
                    </div>
                    <div class="quick-stats">
                        <div class="stat">🌊 ${analysis.data.windy.waveHeight}m</div>
                        <div class="stat">💨 ${analysis.data.windy.windSpeed}节</div>
                        <div class="stat">🌡️ ${analysis.data.ocean.waterTemperature}°C</div>
                    </div>
                </div>
            `;
        }).join('');

        globalAnalysis.innerHTML = html;
    }

    // 加载地区数据
    async loadRegionalData() {
        const spotsGrid = document.getElementById('spotsGrid');
        spotsGrid.innerHTML = '<div class="loading">正在加载浪点数据...</div>';

        try {
            const allSpots = CONFIG.getAllSpots();
            const analyses = [];

            for (const spot of allSpots) {
                const data = await dataService.getAllData(spot.coordinates, this.selectedDate);
                const analysis = await aiAnalyzer.analyzeSpot(spot, data, this.selectedDate);
                analyses.push(analysis);
            }

            this.currentAnalyses = analyses;
            this.filterSpotsByRegion();
        } catch (error) {
            console.error('加载地区数据失败:', error);
            spotsGrid.innerHTML = '<div class="error">加载失败，请稍后重试</div>';
        }
    }

    // 按地区过滤浪点
    filterSpotsByRegion() {
        const spotsGrid = document.getElementById('spotsGrid');
        
        let filteredAnalyses = this.currentAnalyses;
        if (this.selectedRegion !== 'all') {
            filteredAnalyses = this.currentAnalyses.filter(
                analysis => analysis.spot.region === this.selectedRegion
            );
        }

        if (filteredAnalyses.length === 0) {
            spotsGrid.innerHTML = '<div class="no-data">该地区暂无数据</div>';
            return;
        }

        const html = filteredAnalyses.map(analysis => {
            const spot = analysis.spot;
            const scores = analysis.scores;
            const data = analysis.data;
            
            return `
                <div class="spot-card" onclick="app.showSpotDetail(${spot.id})">
                    <div class="spot-header">
                        <h3>${spot.name}</h3>
                        <div class="score ${this.getScoreClass(scores.totalScore)}">
                            ${scores.totalScore.toFixed(1)}
                        </div>
                    </div>
                    <div class="spot-stats">
                        <div class="stat-item">
                            <span class="stat-label">浪高</span>
                            <span class="stat-value">${data.windy.waveHeight}m</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">风速</span>
                            <span class="stat-value">${data.windy.windSpeed}节</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">水温</span>
                            <span class="stat-value">${data.ocean.waterTemperature}°C</span>
                        </div>
                    </div>
                    <div class="spot-condition">
                        ${analysis.suggestion.summary}
                    </div>
                </div>
            `;
        }).join('');

        spotsGrid.innerHTML = html;
    }

    // 获取评分样式类
    getScoreClass(score) {
        if (score >= 8) return 'excellent';
        if (score >= 6) return 'good';
        if (score >= 4) return 'fair';
        return 'poor';
    }

    // 显示浪点详情
    async showSpotDetail(spotId) {
        let analysis = this.currentAnalyses.find(a => a.spot.id === spotId);
        
        if (!analysis) {
            const topSpot = this.globalTop3.find(t => t.spot.id === spotId);
            if (topSpot) {
                analysis = topSpot;
            }
        }
        
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
                <h3>🌊 浪况分析 (${scores.waveScore.toFixed(1)}/10)</h3>
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
                </div>
            </div>
            
            <div class="detail-section">
                <h3>💨 风况分析 (${scores.windScore.toFixed(1)}/10)</h3>
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
                <h3>🌊 潮汐分析 (${scores.tideScore.toFixed(1)}/10)</h3>
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
                <h3>🤖 AI建议</h3>
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

    // 更新校准状态显示
    updateCalibrationStatus() {
        const statusElement = document.getElementById('calibrationStatus');
        const btnElement = document.getElementById('calibrationBtn');
        const panelElement = document.getElementById('calibrationPanel');
        
        if (this.calibrationEnabled) {
            btnElement.innerHTML = '🇨🇳 校准开启';
            btnElement.className = 'config-btn calibration-on';
            panelElement.style.display = 'block';
            
            statusElement.innerHTML = `
                <div class="calibration-info">
                    <div class="calibration-status-item">
                        <span class="status-label">校准状态:</span>
                        <span class="status-value enabled">✅ 已启用</span>
                    </div>
                    <div class="calibration-status-item">
                        <span class="status-label">数据来源:</span>
                        <span class="status-value">国家海洋预报台、浙江海洋监测中心</span>
                    </div>
                    <div class="calibration-status-item">
                        <span class="status-label">校准说明:</span>
                        <span class="status-value">结合中国官方海洋数据，提高预测准确性</span>
                    </div>
                </div>
            `;
        } else {
            btnElement.innerHTML = '🇨🇳 校准关闭';
            btnElement.className = 'config-btn calibration-off';
            panelElement.style.display = 'none';
        }
    }

    // 更新数据源状态
    updateDataSourceStatus() {
        const statusElement = document.getElementById('dataSourceIndicator');
        const useRealAPI = localStorage.getItem('use_real_api') === 'true';
        
        if (useRealAPI) {
            statusElement.innerHTML = '🌐 真实API数据';
            statusElement.className = 'data-source-real';
        } else {
            statusElement.innerHTML = '📊 模拟数据模式';
            statusElement.className = 'data-source-sim';
        }
    }

    // 切换校准状态
    toggleCalibration() {
        this.calibrationEnabled = !this.calibrationEnabled;
        localStorage.setItem('china_calibration_enabled', this.calibrationEnabled.toString());
        
        this.updateCalibrationStatus();
        this.loadData();
        
        const message = this.calibrationEnabled ? 
            '✅ 中国数据校准已启用！' : 
            '❌ 中国数据校准已关闭';
        
        alert(message);
    }

    // 显示错误信息
    showError(message) {
        console.error(message);
        alert(message);
    }

    // 格式化潮汐时间表
    formatTideSchedule(schedule) {
        if (!schedule || schedule.length === 0) {
            return '<div class="no-tide-data">暂无潮汐数据</div>';
        }
        
        return schedule.map(tide => 
            `<div class="tide-time">${tide.time} ${tide.type} ${tide.height}m</div>`
        ).join('');
    }
}

// 全局函数
function toggleCalibration() {
    if (window.app) {
        app.toggleCalibration();
    }
}

function openConfig() {
    window.open('api-config.html', '_blank');
}

// 启动应用
const app = new SurfForecastAppV5();

// 添加样式
const appStyles = `
<style>
.top-spot-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 15px;
    padding: 20px;
    margin: 10px;
    cursor: pointer;
    transition: transform 0.3s;
    position: relative;
    overflow: hidden;
}

.top-spot-card:hover {
    transform: translateY(-5px);
}

.rank-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(255,255,255,0.2);
    padding: 5px 10px;
    border-radius: 15px;
    font-size: 12px;
}

.spot-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    cursor: pointer;
    transition: transform 0.3s;
}

.spot-card:hover {
    transform: translateY(-3px);
}

.score.excellent { background: #4CAF50; }
.score.good { background: #FF9800; }
.score.fair { background: #FFC107; }
.score.poor { background: #F44336; }

.calibration-on {
    background: rgba(76, 175, 80, 0.2) !important;
    color: #4CAF50 !important;
}

.calibration-off {
    background: rgba(158, 158, 158, 0.2) !important;
    color: #9E9E9E !important;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', appStyles);