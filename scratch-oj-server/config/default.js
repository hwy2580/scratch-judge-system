module.exports = {
  // 服务器端口
  port: parseInt(process.env.PORT, 10) || 3000,

  // 评测机地址
  judgeUrl: process.env.JUDGE_URL || 'http://localhost:3001',

  // 数据库路径
  dbPath: process.env.DB_PATH || './data/judge.db',

  // 图片上传
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxImageSize: 5 * 1024 * 1024, // 5MB
  maxImagesPerUpload: 10,
  maxSb3Size: parseInt(process.env.MAX_SB3_SIZE_MB || '50', 10) * 1024 * 1024,
  allowedImageTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
};
