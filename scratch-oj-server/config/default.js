module.exports = {
  // 服务器端口
  port: parseInt(process.env.PORT, 10) || 3000,

  // 评测机地址
  judgeUrl: process.env.JUDGE_URL || 'http://localhost:3001',

  // 数据库路径
  dbPath: process.env.DB_PATH || './data/judge.db',

  // 图片上传
  uploadDir: './uploads',
  maxImageSize: 5 * 1024 * 1024, // 5MB
  maxImagesPerUpload: 10,
  allowedImageTypes: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/gif']
};
