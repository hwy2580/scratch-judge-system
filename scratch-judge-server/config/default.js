module.exports = {
  // 服务器端口（可通过 --port 参数或环境变量 PORT 覆盖）
  port: parseInt(process.env.PORT, 10) || 3001,

  // 默认超时时间（毫秒）
  defaultTimeLimit: 10000,

  // 默认最大执行步数
  defaultStepLimit: 500000,

  // 默认最大内存（MB）
  defaultMemoryLimit: 256,

  // 默认最大 SB3 文件大小（MB）
  maxSb3Size: parseInt(process.env.MAX_SB3_SIZE_MB || '50', 10) * 1024 * 1024
};
