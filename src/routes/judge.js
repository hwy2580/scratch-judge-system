const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Judge = require('../judge');
const config = require('../../config/default');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });



/**
 * POST /api/judge
 * 接收 sb3 文件和题目 ID，返回判题结果
 *
 * 请求 (multipart/form-data):
 *   - file: sb3 文件
 *   - problemId: 题目 ID（对应 problems/ 目录下的 JSON 文件名）
 *
 * 响应:
 *   {
 *     verdict: "AC" | "WA" | "TLE" | "MLE" | "RE",
 *     details: [...],
 *     totalTime: number,
 *     totalSteps: number
 *   }
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

    // 加载题目配置
    const problemPath = path.resolve(config.problemsDir, `${problemId}.json`);
    if (!fs.existsSync(problemPath)) {
      return res.status(404).json({ error: `题目 ${problemId} 不存在` });
    }

    const problem = JSON.parse(fs.readFileSync(problemPath, 'utf-8'));

    // 创建判题器并执行
    const judge = new Judge({
      timeLimit: config.defaultTimeLimit,
      stepLimit: config.defaultStepLimit,
      memoryLimit: config.defaultMemoryLimit
    });

    const result = await judge.judge(req.file.buffer, problem);

    res.json(result);
  } catch (err) {
    console.error('判题错误:', err);
    res.status(500).json({ error: `服务器内部错误: ${err.message}` });
  }
});

module.exports = router;
