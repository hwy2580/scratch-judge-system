const express = require('express');
const path = require('path');
const config = require('./config/default');
const judgeRoutes = require('./src/routes/judge');
const problemsRoutes = require('./src/routes/problems');

const app = express();

// JSON 解析
app.use(express.json());

// 注册 API 路由（必须在静态文件之前）
app.use('/api/judge', judgeRoutes);
app.use('/api/problems', problemsRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 静态文件服务（前端页面）
app.use(express.static(path.join(__dirname, 'public')));

// 启动服务器
const port = config.port;
app.listen(port, () => {
  console.log(`Scratch 判题系统已启动，端口: ${port}`);
  console.log(`前端页面: http://localhost:${port}/`);
  console.log(`判题接口: http://localhost:${port}/api/judge`);
  console.log(`题目管理: http://localhost:${port}/api/problems`);
  console.log(`健康检查: http://localhost:${port}/api/health`);
});

module.exports = app;
