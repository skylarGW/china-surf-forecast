// 主应用程序 V5.0 - 增强版（包含AI智能推荐和24小时详细数据）
class SurfForecastAppV5 {
    constructor() {
        this.selectedDate = new Date();
        this.selectedRegion = 'all';
        this.currentAnalyses = [];
        this.globalTop3 = [];
        this.calibrationEnabled = true;
        
        this.init();
    }

    init() {
        this.initDateSelector();
        this.initRegionSelector();
        this.initModal();
        this.initChinaCalibration();
        this.loadData();
    }

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

    initModal() {
        const modal = document.getElementById('detailModal');
        const closeBtn = modal.querySelector('.close');
        
        closeBtn.onclick = () => modal.style.display = 'none';
        window.onclick = (e) => {
            if (e.target === modal) modal.style.display = 'none';
        };
    }

    initChinaCalibration() {
        const savedCalibration = localStorage.getItem('china_calibration_enabled');
        if (savedCalibration !== null) {
            this.calibrationEnabled = savedCalibration === 'true';
        }
        
        this.updateCalibrationStatus();
        this.updateDataSourceStatus();
    }

    selectDate(date, button) {
        document.querySelectorAll('.date-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        this.selectedDate = date;
        this.loadData();
    }

    async loadData() {
        try {
            await this.loadGlobalTop3();
            await this.loadRegionalData();
        } catch (error) {
            console.error('加载数据失败:', error);
            this.showError('数据加载失败，请稍后重试');
        }
    }

    async loadGlobalTop3() {
        const globalAnalysis = document.getElementById('globalAiAnalysis');
        globalAnalysis.innerHTML = '<div class="loading">正在分析全国最佳冲浪条件...</div>';

        try {
            const allSpots = CONFIG.getAllSpots();
            const analyses = [];

            for (const spot of allSpots) {
                const data = await dataService.getAllData(spot.coordinates, this.selectedDate);
                const analysis = await aiAnalyzer.analyzeSpot(spot, data, this.selectedDate);
                
                if (analysis && analysis.scores && typeof analysis.scores.totalScore === 'number') {
                    analyses.push(analysis);
                } else {
                    console.warn(`浪点 ${spot.name} 分析结果无效:`, analysis);
                    analyses.push({
                        spot: spot,
                        data: data,
                        scores: {
                            waveScore: 50,
                            windScore: 50,
                            tideScore: 50,
                            weatherScore: 50,
                            totalScore: 50
                        },
                        suggestion: {
                            suggestions: ['数据分析中'],
                            warnings: [],
                            equipment: ['数据加载中...'],
                            skillLevel: ['分析中...'],
                            summary: '数据分析中...'
                        }
                    });
                }
            }

            this.globalTop3 = analyses
                .sort((a, b) => (b.scores.totalScore || 0) - (a.scores.totalScore || 0))
                .slice(0, 3);

            this.displayGlobalTop3();
        } catch (error) {
            console.error('加载全国TOP3失败:', error);
            globalAnalysis.innerHTML = '<div class="error">加载失败，请稍后重试</div>';
        }
    }

    displayGlobalTop3() {
        const globalAnalysis = document.getElementById('globalAiAnalysis');
        
        if (this.globalTop3.length === 0) {
            globalAnalysis.innerHTML = '<div class="no-data">暂无推荐数据</div>';
            return;
        }

        const html = this.globalTop3.map((analysis, index) => {
            const spot = analysis.spot;
            const scores = analysis.scores || {};
            const suggestion = analysis.suggestion || {};
            const totalScore = scores.totalScore || 0;
            const medal = ['🥇', '🥈', '🥉'][index];
            
            return `
                <div class="top-spot-card" onclick="app.showSpotDetail(${spot.id})">
                    <div class="rank-badge">${medal} TOP ${index + 1}</div>
                    <div class="spot-info">
                        <h3>${spot.name}</h3>
                        <p class="region">${spot.region === 'zhoushan' ? '舟山群岛' : '青岛海岸'}</p>
                        <div class="score-display">
                            <span class="total-score">${totalScore.toFixed(1)}</span>
                            <span class="score-label">综合评分</span>
                        </div>
                    </div>
                    <div class="quick-stats">
                        <div class="stat">🌊 ${analysis.data.windy.waveHeight}m</div>
                        <div class="stat">💨 ${analysis.data.windy.windSpeed}节</div>
                        <div class="stat">🌡️ ${analysis.data.ocean.waterTemperature}°C</div>
                    </div>
                    <div class="ai-preview">
                        <div class="equipment-preview">🏄 ${(suggestion.equipment || ['分析中...'])[0]}</div>
                        <div class="skill-preview">👤 ${(suggestion.skillLevel || ['分析中...'])[0]}</div>
                    </div>
                </div>
            `;
        }).join('');

        globalAnalysis.innerHTML = html;
    }

    async loadRegionalData() {
        const spotsGrid = document.getElementById('spotsGrid');
        spotsGrid.innerHTML = '<div class="loading">正在加载浪点数据...</div>';

        try {
            const allSpots = CONFIG.getAllSpots();
            const analyses = [];

            for (const spot of allSpots) {
                const data = await dataService.getAllData(spot.coordinates, this.selectedDate);
                const analysis = await aiAnalyzer.analyzeSpot(spot, data, this.selectedDate);
                
                if (analysis && analysis.scores && typeof analysis.scores.totalScore === 'number') {
                    analyses.push(analysis);
                } else {
                    analyses.push({
                        spot: spot,
                        data: data,
                        scores: {
                            waveScore: 50,
                            windScore: 50,
                            tideScore: 50,
                            weatherScore: 50,
                            totalScore: 50
                        },
                        suggestion: {
                            suggestions: ['数据分析中'],
                            warnings: [],
                            equipment: ['数据加载中...'],
                            skillLevel: ['分析中...'],
                            summary: '数据分析中...'
                        }
                    });
                }
            }

            this.currentAnalyses = analyses;
            this.filterSpotsByRegion();
        } catch (error) {
            console.error('加载地区数据失败:', error);
            spotsGrid.innerHTML = '<div class="error">加载失败，请稍后重试</div>';
        }
    }

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
            const scores = analysis.scores || {};
            const data = analysis.data;
            const suggestion = analysis.suggestion || {};
            const totalScore = scores.totalScore || 0;
            
            return `
                <div class="spot-card" onclick="app.showSpotDetail(${spot.id})">
                    <div class="spot-header">
                        <h3>${spot.name}</h3>
                        <div class="score ${this.getScoreClass(totalScore)}">
                            ${totalScore.toFixed(1)}
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
                        ${suggestion.summary || '数据分析中...'}
                    </div>
                    <div class="ai-quick-tips">
                        <div class="quick-tip">🏄 ${(suggestion.equipment || ['分析中...'])[0]}</div>
                    </div>
                </div>
            `;
        }).join('');

        spotsGrid.innerHTML = html;
    }

    getScoreClass(score) {
        if (score >= 8) return 'excellent';
        if (score >= 6) return 'good';
        if (score >= 4) return 'fair';
        return 'poor';
    }

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
        const scores = analysis.scores || {};
        const suggestion = analysis.suggestion || {};

        content.innerHTML = `
            <h2>${spot.name} - 专业分析报告</h2>
            <p class="spot-description">${spot.description}</p>
            <p class="spot-coordinates">📍 坐标: ${UTILS.formatCoordinates(spot.coordinates)}</p>
            
            <!-- 24小时详细数据表格 -->
            <div class="hourly-data-section">
                <h3 class="hourly-data-title">📊 24小时详细预测数据</h3>
                <div class="hourly-table-container">
                    ${aiAnalyzer.generateHourlyTableHTML(data.hourly)}
                </div>
            </div>
            
            <div class="detail-section">
                <h3>🌊 当前浪况分析 (评分: ${(scores.waveScore || 0).toFixed(1)}/10)</h3>
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
                <h3>💨 当前风况分析 (评分: ${(scores.windScore || 0).toFixed(1)}/10)</h3>
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
                <h3>🌊 当前潮汐分析 (评分: ${(scores.tideScore || 0).toFixed(1)}/10)</h3>
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
                <h3>☀️ 当前天气分析 (评分: ${(scores.weatherScore || 0).toFixed(1)}/10)</h3>
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
                <h3>🤖 AI智能推荐</h3>
                
                <!-- 装备建议 -->
                <div class="ai-subsection">
                    <h4>🏄 装备建议</h4>
                    <div class="suggestions-list">
                        ${(suggestion.equipment || ['数据加载中...']).map(e => `<div class="equipment-item">🏄 ${e}</div>`).join('')}
                    </div>
                </div>
                
                <!-- 技能等级建议 -->
                <div class="ai-subsection">
                    <h4>📈 适合人群</h4>
                    <div class="suggestions-list">
                        ${(suggestion.skillLevel || ['分析中...']).map(s => `<div class="skill-item">👤 ${s}</div>`).join('')}
                    </div>
                </div>
                
                <!-- 一般建议 -->
                <div class="ai-subsection">
                    <h4>💡 冲浪建议</h4>
                    <div class="suggestions-list">
                        ${(suggestion.suggestions || ['数据分析中']).map(s => `<div class="suggestion-item">✅ ${s}</div>`).join('')}
                        ${(suggestion.warnings || []).map(w => `<div class="warning-item">⚠️ ${w}</div>`).join('')}
                    </div>
                </div>
                
                <div class="final-summary">
                    <strong>AI总结:</strong> ${suggestion.summary || '数据分析中...'}
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
    }

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

    toggleCalibration() {
        this.calibrationEnabled = !this.calibrationEnabled;
        dataService.toggleChinaCalibration(this.calibrationEnabled);
        localStorage.setItem('china_calibration_enabled', this.calibrationEnabled.toString());
        
        this.updateCalibrationStatus();
        this.loadData();
        
        const message = this.calibrationEnabled ? 
            '✅ 中国数据校准已启用！' : 
            '❌ 中国数据校准已关闭';
        
        alert(message);
    }

    showError(message) {
        console.error(message);
        alert(message);
    }

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
    } else {
        console.warn('应用未初始化完成，请稍后重试');
    }
}

function openConfig() {
    window.open('api-config.html', '_blank');
}

// 等待所有依赖加载完成后启动应用
let app;

function checkDependencies() {
    if (typeof CONFIG !== 'undefined' && 
        typeof dataService !== 'undefined' && 
        typeof aiAnalyzer !== 'undefined' && 
        typeof UTILS !== 'undefined') {
        app = new SurfForecastAppV5();
        console.log('✅ 应用启动成功');
    } else {
        setTimeout(checkDependencies, 100);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkDependencies);
} else {
    checkDependencies();
}

// 增强版样式
const enhancedStyles = `
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

.ai-preview {
    margin-top: 10px;
    font-size: 0.85em;
    opacity: 0.9;
}

.equipment-preview, .skill-preview {
    margin: 3px 0;
    background: rgba(255,255,255,0.1);
    padding: 3px 8px;
    border-radius: 10px;
    display: inline-block;
    margin-right: 5px;
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

.ai-quick-tips {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #eee;
}

.quick-tip {
    font-size: 0.85em;
    color: #666;
    background: #f0f8ff;
    padding: 5px 10px;
    border-radius: 10px;
    display: inline-block;
}

.score {
    color: white;
    padding: 5px 10px;
    border-radius: 15px;
    font-weight: bold;
}

.score.excellent { background: #4CAF50; }
.score.good { background: #FF9800; }
.score.fair { background: #FFC107; }
.score.poor { background: #F44336; }

/* 24小时数据表格样式 */
.hourly-data-section {
    margin: 25px 0;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 12px;
    border-left: 5px solid #2196F3;
}

.hourly-data-title {
    color: #1976d2;
    margin-bottom: 15px;
    font-size: 1.2em;
}

.hourly-table-container {
    overflow-x: auto;
    max-height: 400px;
    overflow-y: auto;
}

.hourly-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    background: white;
    border-radius: 8px;
    overflow: hidden;
}

.hourly-table th {
    background: #2196F3;
    color: white;
    padding: 8px 6px;
    text-align: center;
    font-weight: bold;
    position: sticky;
    top: 0;
    z-index: 10;
}

.hourly-table td {
    padding: 6px;
    text-align: center;
    border-bottom: 1px solid #eee;
}

.hourly-table tr:nth-child(even) {
    background: #f9f9f9;
}

.hourly-table tr:hover {
    background: #e3f2fd;
}

/* AI建议样式增强 */
.ai-subsection {
    margin: 20px 0;
    padding: 15px;
    background: white;
    border-radius: 8px;
    border-left: 3px solid #4CAF50;
}

.ai-subsection h4 {
    color: #2e7d32;
    margin-bottom: 10px;
    font-size: 1.1em;
}

.equipment-item {
    background: #e8f5e8;
    color: #2e7d32;
    padding: 8px 12px;
    margin: 5px 0;
    border-radius: 15px;
    font-size: 0.9em;
}

.skill-item {
    background: #fff3e0;
    color: #f57c00;
    padding: 8px 12px;
    margin: 5px 0;
    border-radius: 15px;
    font-size: 0.9em;
}

.suggestion-item {
    background: #e8f5e8;
    color: #2e7d32;
    padding: 8px 12px;
    margin: 5px 0;
    border-radius: 15px;
    font-size: 0.9em;
}

.warning-item {
    background: #fff3e0;
    color: #f57c00;
    padding: 8px 12px;
    margin: 5px 0;
    border-radius: 15px;
    font-size: 0.9em;
}

.final-summary {
    margin-top: 15px;
    padding: 15px;
    background: #e3f2fd;
    border-radius: 8px;
    font-weight: bold;
    color: #1976d2;
}

.calibration-on {
    background: rgba(76, 175, 80, 0.2) !important;
    color: #4CAF50 !important;
}

.calibration-off {
    background: rgba(158, 158, 158, 0.2) !important;
    color: #9E9E9E !important;
}

.loading, .error, .no-data {
    text-align: center;
    padding: 20px;
    color: #666;
}

.error {
    color: #f44336;
}

.calibration-panel {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 15px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    border-left: 5px solid #FF6B35;
}

.calibration-info {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.calibration-status-item {
    display: flex;
    align-items: center;
    gap: 10px;
}

.status-label {
    font-weight: bold;
    color: #333;
    min-width: 80px;
}

.status-value {
    color: #666;
}

.status-value.enabled {
    color: #4CAF50;
    font-weight: bold;
}

@media (max-width: 768px) {
    .hourly-table {
        font-size: 10px;
    }
    
    .hourly-table th,
    .hourly-table td {
        padding: 4px 2px;
    }
    
    .ai-subsection {
        padding: 10px;
    }
    
    .ai-preview {
        font-size: 0.8em;
    }
    
    .equipment-preview, .skill-preview {
        display: block;
        margin: 2px 0;
    }
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', enhancedStyles);