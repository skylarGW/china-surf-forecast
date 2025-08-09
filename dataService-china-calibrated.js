// 中国校准版数据服务 - 集成官方数据校准
class ChinaCalibratedDataService extends HybridDataService {
    constructor() {
        super();
        this.enableChinaCalibration = true;
        this.calibrationCache = new Map();
    }

    // 启用/禁用中国数据校准
    toggleChinaCalibration(enabled) {
        this.enableChinaCalibration = enabled;
        console.log(enabled ? '✅ 已启用中国官方数据校准' : '❌ 已禁用中国官方数据校准');
    }

    // 获取校准后的数据
    async getAllData(coordinates, date) {
        try {
            // 首先获取基础数据（国外API或模拟数据）
            const baseData = await super.getAllData(coordinates, date);
            
            // 如果启用中国校准，则进行数据校准
            if (this.enableChinaCalibration) {
                const spotId = this.getSpotIdFromCoordinates(coordinates);
                if (spotId) {
                    const chinaData = await chinaMarineScraper.getChinaMarineData(spotId, date);
                    if (chinaData) {
                        const calibratedData = chinaMarineScraper.calibrateWithChinaData(baseData, chinaData);
                        
                        // 添加校准信息到数据源标识
                        calibratedData.dataSource = {
                            ...baseData.dataSource,
                            calibrated: true,
                            calibrationSource: chinaData.source,
                            calibrationTime: new Date().toLocaleString('zh-CN')
                        };
                        
                        console.log(`🇨🇳 数据已使用${chinaData.source}进行校准`);
                        return calibratedData;
                    }
                }
            }
            
            // 如果没有校准数据，返回原始数据
            return baseData;
            
        } catch (error) {
            console.error('获取校准数据失败:', error);
            return await super.getAllData(coordinates, date);
        }
    }

    // 根据坐标获取浪点ID
    getSpotIdFromCoordinates(coordinates) {
        const spots = CONFIG.getAllSpots();
        
        for (const spot of spots) {
            const latDiff = Math.abs(spot.coordinates.lat - coordinates.lat);
            const lngDiff = Math.abs(spot.coordinates.lng - coordinates.lng);
            
            // 如果坐标差异很小，认为是同一个浪点
            if (latDiff < 0.01 && lngDiff < 0.01) {
                return spot.id;
            }
        }
        
        return null;
    }

    // 获取校准状态信息
    getCalibrationStatus() {
        return {
            enabled: this.enableChinaCalibration,
            description: this.enableChinaCalibration ? 
                '使用中国官方海洋数据进行校准' : 
                '未启用中国数据校准',
            sources: [
                '国家海洋预报台',
                '浙江省海洋监测预报中心',
                '山东省海洋预报台'
            ]
        };
    }

    // 手动触发校准
    async manualCalibration(spotId, date) {
        try {
            console.log(`🔄 手动校准${spotId}的数据...`);
            
            const chinaData = await chinaMarineScraper.getChinaMarineData(spotId, date);
            if (chinaData) {
                console.log(`✅ 获取到${chinaData.source}的官方数据`);
                return {
                    success: true,
                    source: chinaData.source,
                    data: chinaData,
                    message: `成功获取${chinaData.source}数据`
                };
            } else {
                return {
                    success: false,
                    message: '未能获取中国官方数据'
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `校准失败: ${error.message}`
            };
        }
    }

    // 获取数据源信息（增强版）
    getDataSourceInfo() {
        const baseInfo = super.getDataSourceInfo();
        
        if (this.enableChinaCalibration) {
            return {
                ...baseInfo,
                calibration: {
                    enabled: true,
                    type: '中国官方数据校准',
                    sources: [
                        '国家海洋预报台',
                        '浙江省海洋监测预报中心', 
                        '山东省海洋预报台'
                    ],
                    description: '使用中国权威海洋数据对预测结果进行校准，提高准确性'
                }
            };
        }
        
        return baseInfo;
    }

    // 比较校准前后的数据差异
    async getCalibrationComparison(coordinates, date) {
        try {
            // 获取未校准的数据
            const originalEnabled = this.enableChinaCalibration;
            this.enableChinaCalibration = false;
            const originalData = await this.getAllData(coordinates, date);
            
            // 获取校准后的数据
            this.enableChinaCalibration = true;
            const calibratedData = await this.getAllData(coordinates, date);
            
            // 恢复原设置
            this.enableChinaCalibration = originalEnabled;
            
            // 计算差异
            const comparison = {
                waveHeight: {
                    original: originalData.windy.waveHeight,
                    calibrated: calibratedData.windy.waveHeight,
                    difference: Math.round((calibratedData.windy.waveHeight - originalData.windy.waveHeight) * 100) / 100
                },
                windSpeed: {
                    original: originalData.windy.windSpeed,
                    calibrated: calibratedData.windy.windSpeed,
                    difference: Math.round((calibratedData.windy.windSpeed - originalData.windy.windSpeed) * 100) / 100
                },
                waterTemp: {
                    original: originalData.ocean.waterTemperature,
                    calibrated: calibratedData.ocean.waterTemperature,
                    difference: Math.round((calibratedData.ocean.waterTemperature - originalData.ocean.waterTemperature) * 100) / 100
                },
                calibrationSource: calibratedData.calibration?.source || '未校准'
            };
            
            return comparison;
            
        } catch (error) {
            console.error('获取校准对比数据失败:', error);
            return null;
        }
    }
}

// 创建全局中国校准版数据服务实例
const dataService = new ChinaCalibratedDataService();