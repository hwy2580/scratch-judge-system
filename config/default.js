module.exports = {
  // 服务器端口（可通过环境变量 PORT 覆盖）
  port: parseInt(process.env.PORT, 10) || 3000,

  // 默认超时时间（毫秒）
  defaultTimeLimit: 10000,

  // 默认最大执行步数
  defaultStepLimit: 500000,

  // 默认最大内存（MB）
  defaultMemoryLimit: 256,

  // 题目配置文件目录
  problemsDir: 'problems',

  // 题目资源（图片等）目录
  assetsDir: 'problems/assets',

  // 图片上传限制
  maxImageSize: 5 * 1024 * 1024, // 5MB
  maxImagesPerUpload: 10,
  allowedImageTypes: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/gif']
};
