// 混合数据服务 - 真实API + 模拟数据无缝切换
class HybridDataService extends DataServiceV2 {
    constructor() {
        super();
        this.useRealAPI = false;
        this.apiStatus = {
            openweather: false,
            stormglass: false,
            noaa: false,
            windy: false
        };
    }

    // 启用真实API模式
    enableRealAPI() {
        if (!realAPIService.isConfigured()) {
            console.warn('⚠️ API密钥未配置，请先配置API密钥');
            return false;
        }
        
        this.useRealAPI = true;
        console.log('🌐 已启用真实API模式');
        return true;
    }

    // 切换到模拟数据模式
    disableRealAPI() {
        this.useRealAPI = false;
        console.log('📊 已切换到模拟数据模式');
    }

    // 获取API状态
    getAPIStatus() {
        return {
            enabled: this.useRealAPI,
            configured: realAPIService.isConfigured(),
            services: this.apiStatus,
            lastUpdate: new Date().toLocaleString('zh-CN')
        };
    }

    // 主数据获取方法
    async getAllData(coordinates, date) {
        try {
            // 如果启用真实API且配置正确
            if (this.useRealAPI && realAPIService.isConfigured()) {
                const realData = await this.getRealAPIData(coordinates, date);
                if (realData) {
                    return realData;
                }
                console.warn('⚠️ 真实API获取失败，回退到模拟数据');
            }

            // 使用模拟数据
            return await this.getSimulatedData(coordinates, date);

        } catch (error) {
            console.error('❌ 数据获取失败:', error);
            return await this.getSimulatedData(coordinates, date);
        }
    }

    // 获取真实API数据
    async getRealAPIData(coordinates, date) {
        try {
            const realData = await realAPIService.getAllRealData(coordinates, date);
            
            if (realData) {
                // 更新API状态
                this.updateAPIStatus(true);
                
                // 添加数据源标识
                realData.dataSource = {
                    type: 'real-api',
                    sources: [
                        'OpenWeatherMap (天气)',
                        'Stormglass.io (海洋)',
                        'NOAA (潮汐)',
                        realData.calibrated ? 'Windy (校正)' : null
                    ].filter(Boolean),
                    timestamp: new Date().toLocaleString('zh-CN'),
                    calibrated: realData.calibrated || false
                };
                
                console.log('✅ 真实API数据获取成功');
                return realData;
            }
            
            return null;

        } catch (error) {
            console.error('❌ 真实API数据获取失败:', error);
            this.updateAPIStatus(false);
            return null;
        }
    }

    // 获取模拟数据
    async getSimulatedData(coordinates, date) {
        const data = await super.getAllData(coordinates, date);
        
        // 添加数据源标识
        data.dataSource = {
            type: 'simulation',
            sources: [
                '智能算法 (天气模拟)',
                '智能算法 (海洋模拟)',
                '天文算法 (潮汐计算)'
            ],
            timestamp: new Date().toLocaleString('zh-CN'),
            calibrated: false
        };
        
        console.log('📊 使用模拟数据');
        return data;
    }

    // 更新API状态
    updateAPIStatus(success) {
        const now = Date.now();
        this.apiStatus = {
            openweather: success,
            stormglass: success,
            noaa: success,
            windy: success && now - realAPIService.lastWindyCalibration < realAPIService.windyCalibrationInterval,
            lastCheck: new Date().toLocaleString('zh-CN')
        };
    }

    // 测试API连接
    async testAPIConnection() {
        if (!realAPIService.isConfigured()) {
            return {
                success: false,
                message: 'API密钥未配置',
                details: {}
            };
        }

        const testCoords = { lat: 29.8626, lng: 122.3394 }; // 东沙冲浪公园
        const testDate = new Date();
        
        console.log('🧪 测试API连接...');
        
        try {
            const testData = await realAPIService.getAllRealData(testCoords, testDate);
            
            if (testData) {
                return {
                    success: true,
                    message: 'API连接测试成功',
                    details: {
                        openweather: '✅ 连接正常',
                        stormglass: '✅ 连接正常',
                        noaa: '✅ 连接正常',
                        windy: testData.calibrated ? '✅ 校正数据可用' : '⏳ 等待校正'
                    }
                };
            } else {
                return {
                    success: false,
                    message: 'API连接测试失败',
                    details: {
                        openweather: '❌ 连接失败',
                        stormglass: '❌ 连接失败',
                        noaa: '❌ 连接失败',
                        windy: '❌ 未配置'
                    }
                };
            }

        } catch (error) {
            return {
                success: false,
                message: `API测试失败: ${error.message}`,
                details: {}
            };
        }
    }

    // 获取数据源信息（用于UI显示）
    getDataSourceInfo() {
        if (this.useRealAPI && realAPIService.isConfigured()) {
            return {
                mode: 'real-api',
                title: '真实API数据',
                description: '来自专业气象和海洋数据服务',
                sources: [
                    { name: 'OpenWeatherMap', status: this.apiStatus.openweather, type: '天气数据' },
                    { name: 'Stormglass.io', status: this.apiStatus.stormglass, type: '海洋数据' },
                    { name: 'NOAA', status: this.apiStatus.noaa, type: '潮汐数据' },
                    { name: 'Windy', status: this.apiStatus.windy, type: '校正数据' }
                ],
                lastUpdate: this.apiStatus.lastCheck
            };
        } else {
            return {
                mode: 'simulation',
                title: '智能模拟数据',
                description: '基于气象学和海洋学原理的智能算法',
                sources: [
                    { name: '天气模拟', status: true, type: '智能算法' },
                    { name: '海洋模拟', status: true, type: '智能算法' },
                    { name: '潮汐计算', status: true, type: '天文算法' }
                ],
                lastUpdate: new Date().toLocaleString('zh-CN')
            };
        }
    }

    // 强制刷新Windy校正
    async forceWindyCalibration() {
        if (!this.useRealAPI || !realAPIService.isConfigured()) {
            return { success: false, message: '真实API模式未启用' };
        }

        try {
            console.log('🔄 强制执行Windy校正...');
            realAPIService.lastWindyCalibration = 0; // 重置校正时间
            
            const testCoords = { lat: 29.8626, lng: 122.3394 };
            await realAPIService.getWindyCalibration(testCoords);
            
            return { success: true, message: 'Windy校正完成' };
        } catch (error) {
            return { success: false, message: `校正失败: ${error.message}` };
        }
    }
}

// 创建全局混合数据服务实例
const dataService = new HybridDataService();