const express = require('express');
const multer = require('multer');
const Judge = require('../judge');
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

/**
 * POST /api/judge
 * 判题接口
 *
 * 请求 (multipart/form-data):
 *   - file: sb3 文件
 *   - config: JSON 字符串，结构如下：
 *     {
 *       "testCases": [{ "input": {...}, "output": {...} }],
 *       "timeLimit": 5000,
 *       "stepLimit": 100000
 *     }
 *
 * 响应:
 *   {
 *     verdict: "AC" | "WA" | "TLE" | "MLE" | "RE",
 *     details: [...],
 *     totalTime: number,
 *     totalSteps: number
 *   }
 */
router.post('/', handleSb3Upload, async (req, res) => {
  try {
    // 校验文件
    if (!req.file) {
      return res.status(400).json({ error: '请上传 sb3 文件' });
    }

    // 解析配置
    let problemConfig;
    try {
      problemConfig = JSON.parse(req.body.config);
    } catch (e) {
      return res.status(400).json({ error: 'config 字段必须是有效的 JSON 字符串' });
    }

    // 校验配置
    if (!Array.isArray(problemConfig.testCases) || problemConfig.testCases.length === 0) {
      return res.status(400).json({ error: 'config.testCases 必须是非空数组' });
    }

    for (let i = 0; i < problemConfig.testCases.length; i++) {
      const tc = problemConfig.testCases[i];
      if (!tc.input || typeof tc.input !== 'object' ||
          !tc.output || typeof tc.output !== 'object') {
        return res.status(400).json({ error: `测试用例 ${i + 1} 格式错误: input 和 output 必须是对象` });
      }
    }

    // 构造题目对象（兼容现有 Judge 接口）
    const problem = {
      testCases: problemConfig.testCases,
      timeLimit: problemConfig.timeLimit || config.defaultTimeLimit,
      stepLimit: problemConfig.stepLimit || config.defaultStepLimit
    };

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
    res.status(500).json({ error: `判题失败: ${err.message}` });
  }
});

module.exports = router;
