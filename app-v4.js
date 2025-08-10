// 主应用程序 V4.0 - 真实API版本
class SurfForecastAppV4 extends SurfForecastAppV3 {
    constructor() {
        super();
        this.initRealAPI();
    }

    // 初始化真实API功能
    initRealAPI() {
        // 检查是否启用真实API
        const useRealAPI = localStorage.getItem('use_real_api') === 'true';
        if (useRealAPI) {
            this.enableRealAPIMode();
        }
        
        // 更新数据源状态显示
        this.updateDataSourceStatus();
        
        // 每5分钟更新一次状态
        setInterval(() => {
            this.updateDataSourceStatus();
        }, 5 * 60 * 1000);
    }

    // 启用真实API模式
    enableRealAPIMode() {
        const success = dataService.enableRealAPI();
        if (success) {
            console.log('🌐 真实API模式已启用');
            this.updateDataSourceStatus();
            // 重新加载数据
            this.loadData();
        }
    }

    // 更新数据源状态显示
    updateDataSourceStatus() {
        const statusElement = document.getElementById('dataSourceIndicator');
        const sourceInfo = dataService.getDataSourceInfo();
        
        if (sourceInfo.mode === 'real-api') {
            statusElement.innerHTML = '🌐 真实API数据';
            statusElement.className = 'data-source-real';
            statusElement.title = `数据来源: ${sourceInfo.sources.map(s => s.name).join(', ')}`;
        } else {
            statusElement.innerHTML = '📊 模拟数据模式';
            statusElement.className = 'data-source-sim';
            statusElement.title = '使用智能算法模拟数据';
        }
    }

    // 显示浪点详情（增强版，包含数据源信息）
    async showSpotDetail(spotId) {
        let analysis = this.currentAnalyses.find(a => a.spot.id === spotId);
        
        if (!analysis) {
            const topSpot = this.globalTop3.find(t => t.spot.id === spotId);
            if (topSpot) {
                const data = await dataService.getAllData(topSpot.spot.coordinates, this.selectedDate);
                analysis = await aiAnalyzer.analyzeSpot(topSpot.spot, data, this.selectedDate);
            }
        }
        
        if (!analysis) return;

        const modal = document.getElementById('detailModal');
        const content = document.getElementById('modalContent');
        
        const data = analysis.data;
        const spot = analysis.spot;
        const scores = analysis.scores;
        const suggestion = analysis.suggestion;
        
        if (!data || !data.hourly) {
            content.innerHTML = '<p>数据加载中...</p>';
            modal.style.display = 'block';
            return;
        }

        // 获取数据源信息
        const dataSourceInfo = data.dataSource || { type: 'unknown', sources: [], timestamp: '未知' };

        content.innerHTML = `
            <h2>${spot.name} - 专业分析报告</h2>
            <p class="spot-description">${spot.description}</p>
            <p class="spot-coordinates">📍 坐标: ${UTILS.formatCoordinates(spot.coordinates)}</p>
            
            <!-- 数据源信息 -->
            <div class="data-source-info">
                <h3>📡 数据源信息</h3>
                <div class="source-details">
                    <div class="source-type">
                        <strong>数据类型:</strong> 
                        <span class="${dataSourceInfo.type === 'real-api' ? 'source-real' : 'source-sim'}">
                            ${dataSourceInfo.type === 'real-api' ? '🌐 真实API数据' : '📊 智能模拟数据'}
                        </span>
                        ${dataSourceInfo.calibrated ? '<span class="calibrated-badge">✨ Windy校正</span>' : ''}
                    </div>
                    <div class="source-list">
                        <strong>数据来源:</strong>
                        <ul>
                            ${dataSourceInfo.sources.map(source => `<li>${source}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="source-timestamp">
                        <strong>更新时间:</strong> ${dataSourceInfo.timestamp}
                    </div>
                </div>
            </div>
            
            <!-- 24小时详细数据表格 -->
            <div class="hourly-data-section">
                <h3 class="hourly-data-title">📊 24小时详细预测数据</h3>
                <div class="hourly-table-container">
                    ${aiAnalyzer.generateHourlyTableHTML(data.hourly)}
                </div>
            </div>
            
            <div class="detail-section">
                <h3>🌊 当前浪况分析 (评分: ${scores.waveScore.toFixed(1)}/10)</h3>
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
                <h3>💨 当前风况分析 (评分: ${scores.windScore.toFixed(1)}/10)</h3>
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
                <h3>🌊 当前潮汐分析 (评分: ${scores.tideScore.toFixed(1)}/10)</h3>
                <div class="tide-info">
                    <div class="current-tide">
                        <strong>当前状态:</strong> ${data.ocean.tideLevel} (${data.ocean.tideHeight}m)
                    </div>
                    <div class="tide-times">
                        ${this.formatTideSchedule(data.hourly.tideSchedule || data.tideSchedule)}
                    </div>
                    <div class="water-temp">
                        <strong>水温:</strong> ${data.ocean.waterTemperature}°C
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>☀️ 当前天气分析 (评分: ${scores.weatherScore.toFixed(1)}/10)</h3>
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

// 打开API配置页面
function openConfig() {
    window.open('api-config.html', '_blank');
}

// 启动应用
const app = new SurfForecastAppV4();

// 添加V4版本的额外样式
const v4Styles = `
<style>
.data-source-status {
    margin-top: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 15px;
    flex-wrap: wrap;
}

.data-source-real {
    color: #4CAF50;
    font-weight: bold;
}

.data-source-sim {
    color: #FF9800;
    font-weight: bold;
}

.config-btn {
    padding: 8px 15px;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 15px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.3s;
}

.config-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
}

.data-source-info {
    margin: 25px 0;
    padding: 20px;
    background: linear-gradient(135deg, #e8f5e8, #f0f8ff);
    border-radius: 12px;
    border-left: 5px solid #4CAF50;
}

.data-source-info h3 {
    color: #2e7d32;
    margin-bottom: 15px;
    font-size: 1.2em;
}

.source-details {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.source-type {
    font-size: 1.1em;
}

.source-real {
    color: #4CAF50;
    font-weight: bold;
}

.source-sim {
    color: #FF9800;
    font-weight: bold;
}

.calibrated-badge {
    background: #FFD700;
    color: #333;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 0.8em;
    margin-left: 10px;
}

.source-list ul {
    margin: 5px 0 0 20px;
    color: #666;
}

.source-list li {
    margin: 2px 0;
}

.source-timestamp {
    color: #888;
    font-size: 0.9em;
}

@media (max-width: 768px) {
    .data-source-status {
        flex-direction: column;
        gap: 10px;
    }
    
    .source-details {
        font-size: 0.9em;
    }
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', v4Styles);