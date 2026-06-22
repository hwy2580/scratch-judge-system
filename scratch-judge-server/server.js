const express = require('express');
const config = require('./config/default');
const judgeRoutes = require('./src/routes/judge');

const app = express();

// JSON 解析
app.use(express.json());

// 版本信息
const pkg = require('./package.json');
const startTime = Date.now();

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: pkg.version,
    uptime: Math.floor((Date.now() - startTime) / 1000)
  });
});

// 判题路由
app.use('/api/judge', judgeRoutes);

// 启动服务器（优先级：--port 参数 > 环境变量 > 配置文件默认值）
const args = process.argv.slice(2);
const portArg = args.indexOf('--port');
const port = portArg !== -1 && args[portArg + 1]
  ? parseInt(args[portArg + 1], 10)
  : config.port;

app.listen(port, () => {
  console.log(`Scratch 评测机已启动，端口: ${port}`);
  console.log(`判题接口: http://localhost:${port}/api/judge`);
  console.log(`健康检查: http://localhost:${port}/api/health`);
});

module.exports = app;
