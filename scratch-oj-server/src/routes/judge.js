const express = require('express');
const multer = require('multer');
const db = require('../db');
const judgeClient = require('../services/judgeClient');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

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
router.post('/', upload.single('file'), async (req, res) => {
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
