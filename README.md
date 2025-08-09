# 中国冲浪预测系统 MVP版本

## 项目概述
这是一个专为中国冲浪爱好者设计的浪报解读和浪点推荐工具，覆盖舟山群岛和青岛海岸的主要冲浪点，提供1-7天的专业预测分析。

## 功能特点
- 🤖 **AI智能分析**: 基于多维度数据的智能评分和推荐
- 🌊 **专业浪报**: 风浪、潮汐、天气综合分析
- 📍 **精选浪点**: 覆盖5个优质冲浪点
- 📱 **响应式设计**: 支持手机和电脑访问
- ⚡ **实时更新**: 数据缓存机制，快速响应

## 覆盖浪点

### 舟山群岛
1. **东沙冲浪公园** - 舟山·朱家尖
   - 适合初中级冲浪者
   - 设施完善，交通便利

2. **岱山鹿栏晴沙** - 舟山·岱山
   - 适合中高级冲浪者
   - 天然海滩，浪况多变

### 青岛海岸
1. **石老人海水浴场** - 青岛·崂山区
   - 适合初中级冲浪者
   - 经典冲浪点，交通便利

2. **流清河沙滩** - 青岛·崂山区
   - 适合初学者
   - 相对安静，适合练习

3. **黄岛两河口** - 青岛·黄岛浪行者冲浪俱乐部
   - 适合中高级冲浪者
   - 专业俱乐部，设施齐全

## 数据源
1. **Windy API** - 风浪数据（有限免费调用）
2. **OpenWeatherMap** - 天气和基础海洋数据（免费）
3. **Stormglass.io** - 综合海洋数据（每月10,000次免费调用）

## 快速开始

### 1. 获取API密钥
在使用前，请先获取以下API密钥：

- **Windy API**: 访问 [api.windy.com](https://api.windy.com) 注册获取
- **OpenWeatherMap**: 访问 [openweathermap.org](https://openweathermap.org/api) 注册获取
- **Stormglass**: 访问 [stormglass.io](https://stormglass.io) 注册获取

### 2. 配置API密钥
编辑 `config.js` 文件，将你的API密钥填入：

```javascript
const CONFIG = {
    APIs: {
        WINDY: {
            key: 'YOUR_WINDY_API_KEY',  // 替换为你的Windy API密钥
            baseUrl: 'https://api.windy.com/api'
        },
        OPENWEATHER: {
            key: 'YOUR_OPENWEATHER_API_KEY',  // 替换为你的OpenWeather API密钥
            baseUrl: 'https://api.openweathermap.org/data/2.5'
        },
        STORMGLASS: {
            key: 'YOUR_STORMGLASS_API_KEY',  // 替换为你的Stormglass API密钥
            baseUrl: 'https://api.stormglass.io/v2'
        }
    }
    // ... 其他配置
};
```

### 3. 启动应用
直接在浏览器中打开 `index.html` 文件即可使用。

## 文件结构
```
surf recommendation/
├── index.html          # 主页面
├── styles.css          # 样式文件
├── config.js           # 配置文件（浪点数据、API配置）
├── dataService.js      # 数据服务（API调用、数据缓存）
├── aiAnalyzer.js       # AI分析器（智能评分、推荐算法）
├── app.js              # 主应用程序（页面控制、交互逻辑）
└── README.md           # 说明文档
```

## AI评分算法
系统采用多维度评分机制：

- **浪况评分 (30%)**: 浪高、周期、浪向、涌浪
- **风况评分 (25%)**: 风速、风向、阵风、稳定性
- **潮汐评分 (15%)**: 潮汐时机、潮高
- **天气评分 (10%)**: 天气条件、能见度、温度

## 评分等级
- **8.0-10.0**: 极佳 🟢
- **6.0-7.9**: 良好 🔵
- **4.0-5.9**: 一般 🟡
- **0.0-3.9**: 较差 🔴

## 注意事项
1. **API限制**: 免费API有调用次数限制，请合理使用
2. **数据精度**: 模拟数据仅供演示，实际使用需接入真实API
3. **安全提醒**: 系统提供参考建议，实际冲浪请注意安全
4. **缓存机制**: 数据缓存30分钟，避免频繁API调用

## 后续开发计划
- [ ] 接入真实API数据
- [ ] 添加更多浪点
- [ ] 用户反馈系统
- [ ] 历史数据分析
- [ ] 移动端APP
- [ ] 社区功能

## 技术支持
如有问题或建议，请联系开发团队。

---
*本项目为MVP版本，持续优化中...*