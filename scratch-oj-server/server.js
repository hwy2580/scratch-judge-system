const express = require('express');
const path = require('path');
const config = require('./config/default');
const problemsRoutes = require('./src/routes/problems');
const judgeRoutes = require('./src/routes/judge');
const judgeClient = require('./src/services/judgeClient');

const app = express();

// JSON 解析
app.use(express.json());

// 静态文件服务（前端页面）
app.use(express.static(path.join(__dirname, 'public')));

// 图片资源静态服务
app.use('/api/assets', express.static(path.resolve(config.uploadDir)));

// API 路由
app.use('/api/problems', problemsRoutes);
app.use('/api/judge', judgeRoutes);

// 健康检查
app.get('/api/health', async (req, res) => {
  const judgeHealth = await judgeClient.healthCheck();
  res.json({
    status: 'ok',
    judge: judgeHealth ? {
      status: 'ok',
      version: judgeHealth.version
    } : {
      status: 'unreachable'
    }
  });
});

// 启动服务器
const args = process.argv.slice(2);
const portArg = args.indexOf('--port');
const port = portArg !== -1 && args[portArg + 1]
  ? parseInt(args[portArg + 1], 10)
  : config.port;

app.listen(port, () => {
  console.log(`Scratch OJ 主服务已启动，端口: ${port}`);
  console.log(`题目管理: http://localhost:${port}/api/problems`);
  console.log(`判题接口: http://localhost:${port}/api/judge`);
  console.log(`健康检查: http://localhost:${port}/api/health`);
  console.log(`评测机地址: ${config.judgeUrl}`);
});

module.exports = app;
