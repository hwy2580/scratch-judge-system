const express = require('express');
const multer = require('multer');
const db = require('../db');
const judgeClient = require('../services/judgeClient');
const config = require('../../config/default');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxSb3Size },
  fileFilter: (req, file, cb) => {
    const filename = (file.originalname || '').toLowerCase();
    if (filename.endsWith('.sb3')) {
      cb(null, true);
      return;
    }
    cb(new Error('仅支持 sb3 文件'));
  }
});

function handleSb3Upload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `sb3 文件大小超过限制 (${config.maxSb3Size / 1024 / 1024}MB)` });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}

// 预编译 SQL
const getProblem = db.prepare('SELECT test_cases, time_limit, step_limit FROM problems WHERE id = ?');

/**
 * POST /api/judge
 * 判题代理：接收 file + problemId，从数据库读取配置，转发到评测机
 *
 * 请求 (multipart/form-data):
 *   - file: sb3 文件
 *   - problemId: 题目 ID
 *
 * 响应: 评测机返回的判题结果
 */
router.post('/', handleSb3Upload, async (req, res) => {
  try {
    // 校验文件
    if (!req.file) {
      return res.status(400).json({ error: '请上传 sb3 文件' });
    }

    // 校验题目 ID
    const problemId = req.body.problemId;
    if (!problemId) {
      return res.status(400).json({ error: '请提供题目 ID (problemId)' });
    }

    // 从数据库读取题目配置
    const problem = getProblem.get(problemId);
    if (!problem) {
      return res.status(404).json({ error: `题目 ${problemId} 不存在` });
    }

    // 组装评测机所需的配置
    const judgeConfig = {
      testCases: JSON.parse(problem.test_cases),
      timeLimit: problem.time_limit,
      stepLimit: problem.step_limit
    };

    // 调用评测机
    const result = await judgeClient.judge(
      req.file.buffer,
      req.file.originalname,
      judgeConfig
    );

    res.json(result);
  } catch (err) {
    console.error('判题错误:', err);

    // 评测机不可达
    if (err.message.includes('fetch failed') || err.message.includes('ECONNREFUSED')) {
      return res.status(503).json({ error: '评测机不可达，请检查评测机是否已启动' });
    }

    res.status(500).json({ error: `判题失败: ${err.message}` });
  }
});

module.exports = router;
