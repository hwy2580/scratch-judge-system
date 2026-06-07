const express = require('express');
const path = require('path');
const fs = require('fs');
const config = require('../../config/default');

const router = express.Router();

// 获取题目文件的绝对路径
function getProblemPath(id) {
  return path.resolve(config.problemsDir, `${id}.json`);
}

// 确保题目目录存在
function ensureProblemsDir() {
  const dir = path.resolve(config.problemsDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * GET /api/problems
 * 获取所有题目列表
 */
router.get('/', (req, res) => {
  try {
    ensureProblemsDir();
    const problemsDir = path.resolve(config.problemsDir);
    const files = fs.readdirSync(problemsDir).filter(f => f.endsWith('.json'));

    const problems = files.map(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(problemsDir, f), 'utf-8'));
        return {
          id: data.id,
          name: data.name,
          description: data.description || '',
          testCases: data.testCases.length,
          timeLimit: data.timeLimit || config.defaultTimeLimit,
          stepLimit: data.stepLimit || config.defaultStepLimit
        };
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    res.json(problems);
  } catch (err) {
    console.error('获取题目列表错误:', err);
    res.status(500).json({ error: `服务器内部错误: ${err.message}` });
  }
});

/**
 * GET /api/problems/:id
 * 获取单个题目详情（含完整测试用例）
 */
router.get('/:id', (req, res) => {
  try {
    const problemPath = getProblemPath(req.params.id);
    if (!fs.existsSync(problemPath)) {
      return res.status(404).json({ error: `题目 ${req.params.id} 不存在` });
    }

    const data = JSON.parse(fs.readFileSync(problemPath, 'utf-8'));
    res.json(data);
  } catch (err) {
    console.error('获取题目详情错误:', err);
    res.status(500).json({ error: `服务器内部错误: ${err.message}` });
  }
});

/**
 * POST /api/problems
 * 创建新题目
 * 请求体: JSON 题目配置（含 testCases）
 */
router.post('/', (req, res) => {
  try {
    const problem = req.body;

    // 校验必填字段
    if (!problem.id || typeof problem.id !== 'string') {
      return res.status(400).json({ error: '缺少必填字段: id' });
    }
    if (!problem.name || typeof problem.name !== 'string') {
      return res.status(400).json({ error: '缺少必填字段: name' });
    }
    if (!Array.isArray(problem.testCases) || problem.testCases.length === 0) {
      return res.status(400).json({ error: '缺少测试用例: testCases 不能为空' });
    }

    // 校验测试用例格式
    for (let i = 0; i < problem.testCases.length; i++) {
      const tc = problem.testCases[i];
      if (!tc.input || typeof tc.input !== 'object') {
        return res.status(400).json({ error: `测试用例 ${i + 1}: input 必须是对象` });
      }
      if (!tc.output || typeof tc.output !== 'object') {
        return res.status(400).json({ error: `测试用例 ${i + 1}: output 必须是对象` });
      }
    }

    // 检查 ID 唯一性
    ensureProblemsDir();
    const problemPath = getProblemPath(problem.id);
    if (fs.existsSync(problemPath)) {
      return res.status(409).json({ error: `题目 ID "${problem.id}" 已存在` });
    }

    // 写入文件
    fs.writeFileSync(problemPath, JSON.stringify(problem, null, 2), 'utf-8');

    res.status(201).json({ message: '题目创建成功', id: problem.id });
  } catch (err) {
    console.error('创建题目错误:', err);
    res.status(500).json({ error: `服务器内部错误: ${err.message}` });
  }
});

/**
 * PUT /api/problems/:id
 * 更新题目
 * 请求体: JSON 完整题目配置
 */
router.put('/:id', (req, res) => {
  try {
    const problemPath = getProblemPath(req.params.id);
    if (!fs.existsSync(problemPath)) {
      return res.status(404).json({ error: `题目 ${req.params.id} 不存在` });
    }

    const problem = req.body;

    // 校验必填字段
    if (!problem.name || typeof problem.name !== 'string') {
      return res.status(400).json({ error: '缺少必填字段: name' });
    }
    if (!Array.isArray(problem.testCases) || problem.testCases.length === 0) {
      return res.status(400).json({ error: '缺少测试用例: testCases 不能为空' });
    }

    // 校验测试用例格式
    for (let i = 0; i < problem.testCases.length; i++) {
      const tc = problem.testCases[i];
      if (!tc.input || typeof tc.input !== 'object') {
        return res.status(400).json({ error: `测试用例 ${i + 1}: input 必须是对象` });
      }
      if (!tc.output || typeof tc.output !== 'object') {
        return res.status(400).json({ error: `测试用例 ${i + 1}: output 必须是对象` });
      }
    }

    // 确保 id 一致
    problem.id = req.params.id;

    // 写入文件
    fs.writeFileSync(problemPath, JSON.stringify(problem, null, 2), 'utf-8');

    res.json({ message: '题目更新成功', id: problem.id });
  } catch (err) {
    console.error('更新题目错误:', err);
    res.status(500).json({ error: `服务器内部错误: ${err.message}` });
  }
});

/**
 * DELETE /api/problems/:id
 * 删除题目
 */
router.delete('/:id', (req, res) => {
  try {
    const problemPath = getProblemPath(req.params.id);
    if (!fs.existsSync(problemPath)) {
      return res.status(404).json({ error: `题目 ${req.params.id} 不存在` });
    }

    fs.unlinkSync(problemPath);

    res.json({ message: '题目删除成功', id: req.params.id });
  } catch (err) {
    console.error('删除题目错误:', err);
    res.status(500).json({ error: `服务器内部错误: ${err.message}` });
  }
});

module.exports = router;
