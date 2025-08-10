// 主应用程序 V2.0 - 增加全国TOP3推荐和图表功能
class SurfForecastAppV2 {
    constructor() {
        this.currentRegion = 'all';
        this.selectedDate = new Date();
        this.currentAnalyses = [];
        this.globalTop3 = [];
        this.charts = {};
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
            this.closeModal();
        });

        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('detailModal');
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    // 关闭模态框并清理图表
    closeModal() {
        document.getElementById('detailModal').style.display = 'none';
        // 清理图表实例
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
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
            
            // 分析浪点数据
            this.currentAnalyses = await aiAnalyzer.analyzeRegionSpots(this.currentRegion, this.selectedDate);
            
            // 生成全国TOP3推荐
            if (this.currentRegion === 'all') {
                this.globalTop3 = aiAnalyzer.generateGlobalTop3(this.currentAnalyses);
            } else {
                // 为地区视图也生成全国TOP3作为参考
                const globalAnalyses = await aiAnalyzer.analyzeAllSpotsGlobally(this.selectedDate);
                this.globalTop3 = aiAnalyzer.generateGlobalTop3(globalAnalyses);
            }
            
            // 渲染界面
            this.renderGlobalTop3();
            this.renderSpotCards();
            
        } catch (error) {
            console.error('加载数据失败:', error);
            this.showError('数据加载失败，请稍后重试');
        }
    }

    // 显示加载状态
    showLoading() {
        document.getElementById('globalAiAnalysis').innerHTML = '<div class="loading">🤖 AI正在分析全国最佳冲浪条件...</div>';
        document.getElementById('spotsGrid').innerHTML = '<div class="loading">加载浪点数据中...</div>';
    }

    // 显示错误信息
    showError(message) {
        document.getElementById('globalAiAnalysis').innerHTML = `<div class="error">❌ ${message}</div>`;
    }

    // 渲染全国TOP3推荐
    renderGlobalTop3() {
        const container = document.getElementById('globalAiAnalysis');
        
        if (this.globalTop3.length === 0) {
            container.innerHTML = '<div class="no-data">暂无推荐数据</div>';
            return;
        }

        const html = `
            <div class="ai-intro">
                <p>🎯 基于全国浪点的综合数据分析，为您推荐当日最佳冲浪点：</p>
            </div>
            <div class="global-top3">
                ${this.globalTop3.map(rec => `
                    <div class="top-spot rank-${rec.rank}" onclick="app.showSpotDetail('${rec.spot.id}')">
                        <div class="top-spot-header">
                            <div class="top-spot-rank">
                                ${rec.rank === 1 ? '🥇' : rec.rank === 2 ? '🥈' : '🥉'}
                            </div>
                            <div class="top-spot-score">
                                ${rec.score.toFixed(1)}/10
                            </div>
                        </div>
                        <div class="top-spot-name">${rec.spot.name}</div>
                        <div class="top-spot-location">${rec.region} · ${rec.spot.location}</div>
                        <div class="top-spot-reason">
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

    // 显示浪点详情（增强版，包含图表）
    async showSpotDetail(spotId) {
        let analysis = this.currentAnalyses.find(a => a.spot.id === spotId);
        
        // 如果在当前分析中找不到，从全局TOP3中查找
        if (!analysis) {
            const topSpot = this.globalTop3.find(t => t.spot.id === spotId);
            if (topSpot) {
                // 重新获取完整的分析数据
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

        content.innerHTML = `
            <h2>${spot.name} - 专业分析报告</h2>
            <p class="spot-description">${spot.description}</p>
            <p class="spot-coordinates">📍 坐标: ${UTILS.formatCoordinates(spot.coordinates)}</p>
            
            <!-- 24小时图表分析 -->
            <div class="charts-section">
                <h3 class="charts-title">📊 24小时详细预测</h3>
                <div class="charts-container">
                    <div class="chart-panel">
                        <div class="chart-title">浪高变化 (米)</div>
                        <canvas id="waveChart" class="chart-canvas"></canvas>
                    </div>
                    <div class="tide-schedule">
                        <div class="chart-title">潮汐时间表</div>
                        <div id="tideSchedule"></div>
                    </div>
                </div>
                <div class="charts-container">
                    <div class="chart-panel">
                        <div class="chart-title">风速变化 (节)</div>
                        <canvas id="windChart" class="chart-canvas"></canvas>
                    </div>
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
                        ${this.formatTideSchedule(data.hourly.tideSchedule)}
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
        
        // 渲染图表
        setTimeout(() => {
            if (data.hourly) {
                console.log('Hourly data:', data.hourly); // 调试信息
                this.renderCharts(data.hourly);
                this.renderTideSchedule(data.hourly.tideSchedule);
            } else {
                console.error('没有hourly数据');
            }
        }, 300);
    }

    // 渲染图表
    renderCharts(hourlyData) {
        if (!hourlyData) {
            console.error('没有小时数据');
            return;
        }
        
        console.log('开始渲染图表:', hourlyData);
        const chartData = aiAnalyzer.generateHourlyChartData(hourlyData);
        console.log('图表数据:', chartData);
        
        if (!chartData) {
            console.error('图表数据生成失败');
            return;
        }
        
        // 浪高图表
        const waveCtx = document.getElementById('waveChart');
        if (waveCtx) {
            try {
                console.log('渲染浪高图表');
                this.charts.wave = new Chart(waveCtx, {
                    type: 'line',
                    data: chartData.waveChart,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'top' }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: { display: true, text: '浪高 (米)' }
                            }
                        }
                    }
                });
                console.log('浪高图表渲染成功');
            } catch (error) {
                console.error('浪高图表渲染失败:', error);
            }
        } else {
            console.error('找不到waveChart元素');
        }

        // 风速图表
        const windCtx = document.getElementById('windChart');
        if (windCtx) {
            try {
                console.log('渲染风速图表');
                this.charts.wind = new Chart(windCtx, {
                    type: 'line',
                    data: chartData.windChart,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'top' }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: { display: true, text: '风速 (节)' }
                            }
                        }
                    }
                });
                console.log('风速图表渲染成功');
            } catch (error) {
                console.error('风速图表渲染失败:', error);
            }
        } else {
            console.error('找不到windChart元素');
        }
    }

    // 渲染潮汐时间表
    renderTideSchedule(tideSchedule) {
        const container = document.getElementById('tideSchedule');
        if (!container) return;
        
        if (!tideSchedule || tideSchedule.length === 0) {
            container.innerHTML = '<div class="no-tide-data">潮汐数据加载中...</div>';
            return;
        }

        const html = tideSchedule.map(tide => `
            <div class="tide-item">
                <div class="tide-time">${tide.time}</div>
                <div class="tide-type">${tide.type}</div>
                <div class="tide-height">${tide.height}m</div>
            </div>
        `).join('');

        container.innerHTML = html;
    }
    
    // 格式化潮汐时间表显示
    formatTideSchedule(tideSchedule) {
        if (!tideSchedule || tideSchedule.length === 0) {
            return '<div>潮汐数据加载中...</div>';
        }
        
        return tideSchedule.map(tide => `
            <div class="tide-schedule-item">
                <span class="tide-time-label">${tide.time}</span>
                <span class="tide-type-label ${tide.type === '高潮' ? 'high-tide' : 'low-tide'}">
                    ${tide.type === '高潮' ? '满潮' : '干潮'}
                </span>
                <span class="tide-height-label">${tide.height}m</span>
            </div>
        `).join('');
    }
}

// 启动应用
const app = new SurfForecastAppV2();

// 添加额外的CSS样式
const additionalStyles = `
<style>
.detail-section {
    margin: 25px 0;
    padding: 20px;
    background: linear-gradient(135deg, #f8f9fa, #e9ecef);
    border-radius: 12px;
    border-left: 5px solid #2196F3;
}

.detail-section h3 {
    color: #1e3c72;
    margin-bottom: 15px;
    font-size: 1.2em;
}

.detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
}

.detail-item {
    background: white;
    padding: 12px;
    border-radius: 8px;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.suggestions-list {
    margin: 15px 0;
}

.suggestion-item {
    color: #2e7d32;
    margin: 8px 0;
    padding: 5px 0;
}

.warning-item {
    color: #d32f2f;
    margin: 8px 0;
    padding: 5px 0;
}

.final-summary {
    margin-top: 20px;
    padding: 15px;
    background: linear-gradient(135deg, #e3f2fd, #bbdefb);
    border-radius: 8px;
    border-left: 5px solid #2196F3;
}

.ai-intro {
    margin-bottom: 20px;
    color: #555;
    font-style: italic;
    text-align: center;
    font-size: 1.05em;
}

.no-data, .error {
    text-align: center;
    padding: 30px;
    color: #666;
    font-size: 1.1em;
}

.error {
    color: #d32f2f;
}

.spot-coordinates {
    color: #666;
    font-size: 0.9em;
    margin-bottom: 20px;
    text-align: center;
}

.tide-info {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.current-tide {
    background: white;
    padding: 12px;
    border-radius: 8px;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tide-times {
    background: #f0f8ff;
    padding: 15px;
    border-radius: 8px;
    border-left: 4px solid #2196F3;
}

.tide-schedule-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #e0e0e0;
}

.tide-schedule-item:last-child {
    border-bottom: none;
}

.tide-time-label {
    font-weight: bold;
    color: #1976d2;
    min-width: 60px;
}

.tide-type-label {
    font-weight: bold;
    padding: 4px 8px;
    border-radius: 12px;
    color: white;
    min-width: 50px;
    text-align: center;
}

.tide-type-label.high-tide {
    background: #4CAF50;
}

.tide-type-label.low-tide {
    background: #FF9800;
}

.tide-height-label {
    color: #2e7d32;
    font-weight: bold;
    min-width: 40px;
    text-align: right;
}

.water-temp {
    background: white;
    padding: 12px;
    border-radius: 8px;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.no-tide-data {
    text-align: center;
    color: #666;
    font-style: italic;
    padding: 20px;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', additionalStyles);