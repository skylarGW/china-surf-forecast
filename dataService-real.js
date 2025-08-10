// 数据服务 - 真实API版本
class DataServiceReal extends DataServiceV2 {
    constructor() {
        super();
        this.useRealAPI = false; // 默认使用模拟数据
    }

    // 启用真实API
    enableRealAPI() {
        this.useRealAPI = true;
        console.log('已启用真实API模式');
    }

    // 禁用真实API
    disableRealAPI() {
        this.useRealAPI = false;
        console.log('已切换到模拟数据模式');
    }

    // 检查真实API状态
    isRealAPIEnabled() {
        return this.useRealAPI && realAPIService.isConfigured();
    }

    // 获取综合数据（真实API + 模拟数据混合）
    async getAllData(coordinates, date) {
        try {
            let realData = null;
            
            // 尝试获取真实API数据
            if (this.useRealAPI) {
                realData = await realAPIService.getAllRealData(coordinates, date);
            }

            // 如果真实API数据获取成功，使用真实数据
            if (realData) {
                console.log('✅ 使用真实API数据');
                return realData;
            }

            // 否则使用模拟数据
            console.log('📊 使用模拟数据');
            return await super.getAllData(coordinates, date);

        } catch (error) {
            console.error('数据获取失败，回退到模拟数据:', error);
            return await super.getAllData(coordinates, date);
        }
    }

    // 获取数据源信息
    getDataSourceInfo() {
        if (this.isRealAPIEnabled()) {
            return {
                type: 'real-api',
                sources: [
                    'OpenWeatherMap - 天气数据',
                    'Stormglass.io - 海洋数据',
                    'NOAA - 潮汐数据'
                ],
                status: '真实API数据'
            };
        } else {
            return {
                type: 'simulation',
                sources: [
                    '智能模拟算法 - 天气数据',
                    '智能模拟算法 - 海洋数据',
                    '天文算法 - 潮汐数据'
                ],
                status: '模拟数据'
            };
        }
    }
}

// 创建全局数据服务实例（真实API版本）
const dataService = new DataServiceReal();