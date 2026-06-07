const express = require('express');
const config = require('./config/default');
const judgeRoutes = require('./src/routes/judge');

const app = express();

// JSON 解析
app.use(express.json());

// 注册路由
app.use('/api/judge', judgeRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 启动服务器
const port = config.port;
app.listen(port, () => {
  console.log(`Scratch 判题系统已启动，端口: ${port}`);
  console.log(`API 地址: http://localhost:${port}/api/judge`);
  console.log(`题目列表: http://localhost:${port}/api/judge/problems`);
  console.log(`健康检查: http://localhost:${port}/api/health`);
});

module.exports = app;
