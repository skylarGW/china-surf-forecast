// 主应用程序 V5.0 - 中国数据校准版
class SurfForecastAppV5 extends SurfForecastAppV4 {
    constructor() {
        super();
        this.calibrationEnabled = true;
        this.initChinaCalibration();
    }

    // 初始化中国数据校准功能
    initChinaCalibration() {
        // 检查本地存储的校准设置
        const savedCalibration = localStorage.getItem('china_calibration_enabled');
        if (savedCalibration !== null) {
            this.calibrationEnabled = savedCalibration === 'true';
            dataService.toggleChinaCalibration(this.calibrationEnabled);
        }
        
        // 更新校准状态显示
        this.updateCalibrationStatus();
        
        // 每10分钟更新一次校准状态
        setInterval(() => {
            this.updateCalibrationStatus();
        }, 10 * 60 * 1000);
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
            
            const calibrationInfo = dataService.getCalibrationStatus();
            statusElement.innerHTML = `
                <div class="calibration-info">
                    <div class="calibration-status-item">
                        <span class="status-label">校准状态:</span>
                        <span class="status-value enabled">✅ 已启用</span>
                    </div>
                    <div class="calibration-status-item">
                        <span class="status-label">数据来源:</span>
                        <span class="status-value">${calibrationInfo.sources.join('、')}</span>
                    </div>
                    <div class="calibration-status-item">
                        <span class="status-label">校准说明:</span>
                        <span class="status-value">${calibrationInfo.description}</span>
                    </div>
                    <div class="calibration-actions">
                        <button class="mini-btn" onclick="app.testCalibration()">🧪 测试校准</button>
                        <button class="mini-btn" onclick="app.showCalibrationComparison()">📊 对比数据</button>
                    </div>
                </div>
            `;
        } else {
            btnElement.innerHTML = '🇨🇳 校准关闭';
            btnElement.className = 'config-btn calibration-off';
            panelElement.style.display = 'none';
        }
    }

    // 切换校准状态
    toggleCalibration() {
        this.calibrationEnabled = !this.calibrationEnabled;
        dataService.toggleChinaCalibration(this.calibrationEnabled);
        localStorage.setItem('china_calibration_enabled', this.calibrationEnabled.toString());
        
        this.updateCalibrationStatus();
        this.updateDataSourceStatus();
        
        // 重新加载数据以应用校准
        this.loadData();
        
        const message = this.calibrationEnabled ? 
            '✅ 中国数据校准已启用，预测将更准确！' : 
            '❌ 中国数据校准已关闭，使用原始数据';
        
        // 简单的消息提示
        this.showMessage(message);
    }

    // 测试校准功能
    async testCalibration() {
        const testSpot = CONFIG.getAllSpots()[0]; // 使用第一个浪点测试
        
        this.showMessage('🧪 正在测试中国数据校准...');
        
        try {
            const result = await dataService.manualCalibration(testSpot.id, this.selectedDate);
            
            if (result.success) {
                this.showMessage(`✅ 校准测试成功！\n数据来源: ${result.source}`);
            } else {
                this.showMessage(`❌ 校准测试失败: ${result.message}`);
            }
        } catch (error) {
            this.showMessage(`❌ 校准测试出错: ${error.message}`);
        }
    }

    // 显示校准前后数据对比
    async showCalibrationComparison() {
        const testSpot = CONFIG.getAllSpots()[0];
        
        this.showMessage('📊 正在获取数据对比...');
        
        try {
            const comparison = await dataService.getCalibrationComparison(
                testSpot.coordinates, 
                this.selectedDate
            );
            
            if (comparison) {
                const message = `📊 数据校准对比 (${testSpot.name}):\n\n` +
                    `🌊 浪高: ${comparison.waveHeight.original}m → ${comparison.waveHeight.calibrated}m (${comparison.waveHeight.difference >= 0 ? '+' : ''}${comparison.waveHeight.difference}m)\n` +
                    `💨 风速: ${comparison.windSpeed.original}节 → ${comparison.windSpeed.calibrated}节 (${comparison.windSpeed.difference >= 0 ? '+' : ''}${comparison.windSpeed.difference}节)\n` +
                    `🌡️ 水温: ${comparison.waterTemp.original}°C → ${comparison.waterTemp.calibrated}°C (${comparison.waterTemp.difference >= 0 ? '+' : ''}${comparison.waterTemp.difference}°C)\n\n` +
                    `📡 校准数据源: ${comparison.calibrationSource}`;
                
                this.showMessage(message);
            } else {
                this.showMessage('❌ 无法获取对比数据');
            }
        } catch (error) {
            this.showMessage(`❌ 获取对比数据失败: ${error.message}`);
        }
    }

    // 显示浪点详情（增强版，包含校准信息）
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

        // 获取数据源和校准信息
        const dataSourceInfo = data.dataSource || { type: 'unknown', sources: [], timestamp: '未知' };
        const calibrationInfo = data.calibration || null;

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
                        ${dataSourceInfo.calibrated ? '<span class="calibrated-badge">🇨🇳 中国数据校准</span>' : ''}
                    </div>
                    <div class="source-list">
                        <strong>数据来源:</strong>
                        <ul>
                            ${dataSourceInfo.sources.map(source => `<li>${source}</li>`).join('')}
                        </ul>
                    </div>
                    ${calibrationInfo ? `
                    <div class="calibration-details">
                        <strong>校准信息:</strong>
                        <div class="calibration-source">📡 校准数据源: ${calibrationInfo.source}</div>
                        <div class="calibration-factors">
                            🌊 浪高校准: ${calibrationInfo.waveCalibration}x | 
                            💨 风速校准: ${calibrationInfo.windCalibration}x | 
                            🌡️ 水温校准: ${calibrationInfo.tempCalibration}x
                        </div>
                        <div class="china-forecast">🇨🇳 官方预报: ${calibrationInfo.chinaForecast}</div>
                    </div>
                    ` : ''}
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

    // 简单的消息提示
    showMessage(message) {
        alert(message);
    }
}

// 全局函数
function toggleCalibration() {
    app.toggleCalibration();
}

function openConfig() {
    window.open('api-config.html', '_blank');
}

// 启动应用
const app = new SurfForecastAppV5();

// 添加V5版本的额外样式
const v5Styles = `
<style>
.calibration-panel {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 15px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    border-left: 5px solid #FF6B35;
}

.calibration-panel h3 {
    color: #FF6B35;
    margin-bottom: 15px;
    font-size: 1.2em;
}

.calibration-content {
    min-height: 60px;
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

.calibration-actions {
    margin-top: 15px;
    display: flex;
    gap: 10px;
}

.mini-btn {
    padding: 6px 12px;
    background: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 15px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.3s;
}

.mini-btn:hover {
    background: #e0e0e0;
    transform: translateY(-1px);
}

.calibration-on {
    background: rgba(76, 175, 80, 0.2) !important;
    color: #4CAF50 !important;
    border-color: #4CAF50 !important;
}

.calibration-off {
    background: rgba(158, 158, 158, 0.2) !important;
    color: #9E9E9E !important;
    border-color: #9E9E9E !important;
}

.calibration-details {
    background: #f0f8ff;
    padding: 15px;
    border-radius: 8px;
    margin: 10px 0;
    border-left: 4px solid #2196F3;
}

.calibration-source {
    font-weight: bold;
    color: #1976d2;
    margin-bottom: 8px;
}

.calibration-factors {
    color: #666;
    font-size: 0.9em;
    margin-bottom: 8px;
}

.china-forecast {
    color: #FF6B35;
    font-weight: bold;
    font-style: italic;
}

@media (max-width: 768px) {
    .calibration-status-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 5px;
    }
    
    .status-label {
        min-width: auto;
    }
    
    .calibration-actions {
        flex-direction: column;
    }
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', v5Styles);