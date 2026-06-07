const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const config = require('../../config/default');

const router = express.Router();

// ==================== 工具函数 ====================

/** 获取题目文件路径 */
function getProblemPath(id) {
  return path.join(config.problemsDir, `${id}.json`);
}

/** 获取题目资源目录 */
function getAssetsPath(problemId) {
  return path.join(config.assetsDir, problemId);
}

/** 确保目录存在 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** 读取单个题目 */
function readProblem(id) {
  const filePath = getProblemPath(id);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/** 读取所有题目 */
function readAllProblems() {
  ensureDir(config.problemsDir);
  const files = fs.readdirSync(config.problemsDir).filter(f => f.endsWith('.json'));
  return files.map(f => {
    try {
      return JSON.parse(fs.readFileSync(path.join(config.problemsDir, f), 'utf-8'));
    } catch (e) {
      return null;
    }
  }).filter(Boolean);
}

/** 提取题目摘要（列表用） */
function summarize(problem) {
  return {
    id: problem.id,
    name: problem.name,
    description: problem.description || '',
    category: problem.category || '',
    difficulty: problem.difficulty || '',
    source: problem.source || '',
    tags: problem.tags || [],
    testCasesCount: (problem.testCases || []).length,
    timeLimit: problem.timeLimit,
    stepLimit: problem.stepLimit,
    hasContent: !!problem.content,
    hasAssets: fs.existsSync(getAssetsPath(problem.id))
  };
}

// ==================== 图片上传配置 ====================

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = getAssetsPath(req.params.id);
      ensureDir(dir);
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      // 保留原始文件名，避免冲突加上时间戳
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext);
      cb(null, `${base}${ext}`);
    }
  }),
  limits: { fileSize: config.maxImageSize },
  fileFilter: (req, file, cb) => {
    if (config.allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${file.mimetype}，允许: ${config.allowedImageTypes.join(', ')}`));
    }
  }
});

// ==================== 路由 ====================

/**
 * GET /api/problems
 * 获取题目列表，支持筛选参数：
 *   ?category=GESP-1  按分类
 *   ?difficulty=easy   按难度
 *   ?source=真题       按来源
 *   ?tag=循环          按标签（模糊匹配）
 */
router.get('/', (req, res) => {
  try {
    let problems = readAllProblems();

    // 筛选
    const { category, difficulty, source, tag } = req.query;

    if (category) {
      problems = problems.filter(p => (p.category || '') === category);
    }
    if (difficulty) {
      problems = problems.filter(p => (p.difficulty || '') === difficulty);
    }
    if (source) {
      problems = problems.filter(p => (p.source || '') === source);
    }
    if (tag) {
      const tagLower = tag.toLowerCase();
      problems = problems.filter(p =>
        (p.tags || []).some(t => t.toLowerCase().includes(tagLower))
      );
    }

    res.json(problems.map(summarize));
  } catch (err) {
    res.status(500).json({ error: '读取题目列表失败', detail: err.message });
  }
});

/**
 * GET /api/problems/:id
 * 获取单个题目详情
 */
router.get('/:id', (req, res) => {
  const problem = readProblem(req.params.id);
  if (!problem) {
    return res.status(404).json({ error: `题目 ${req.params.id} 不存在` });
  }
  res.json(problem);
});

/**
 * POST /api/problems
 * 创建新题目
 */
router.post('/', (req, res) => {
  const problem = req.body;

  // 校验必填字段
  if (!problem.id || !problem.name) {
    return res.status(400).json({ error: '缺少必填字段: id, name' });
  }
  if (!Array.isArray(problem.testCases) || problem.testCases.length === 0) {
    return res.status(400).json({ error: 'testCases 必须是非空数组' });
  }

  // 校验 ID 格式（只允许字母、数字、连字符、下划线）
  if (!/^[a-zA-Z0-9_-]+$/.test(problem.id)) {
    return res.status(400).json({ error: 'id 只能包含字母、数字、连字符、下划线' });
  }

  // 检查是否已存在
  if (fs.existsSync(getProblemPath(problem.id))) {
    return res.status(409).json({ error: `题目 ${problem.id} 已存在` });
  }

  // 校验测试用例
  for (let i = 0; i < problem.testCases.length; i++) {
    const tc = problem.testCases[i];
    if (!tc.input || typeof tc.input !== 'object' ||
        !tc.output || typeof tc.output !== 'object') {
      return res.status(400).json({ error: `测试用例 ${i + 1} 格式错误: input 和 output 必须是对象` });
    }
  }

  // 确保目录存在并写入
  ensureDir(config.problemsDir);
  fs.writeFileSync(getProblemPath(problem.id), JSON.stringify(problem, null, 2), 'utf-8');

  res.status(201).json({ message: '创建成功', problem: summarize(problem) });
});

/**
 * PUT /api/problems/:id
 * 更新题目
 */
router.put('/:id', (req, res) => {
  const id = req.params.id;
  const filePath = getProblemPath(id);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `题目 ${id} 不存在` });
  }

  const problem = req.body;
  problem.id = id; // 强制 ID 一致

  if (!problem.name) {
    return res.status(400).json({ error: '缺少必填字段: name' });
  }
  if (!Array.isArray(problem.testCases) || problem.testCases.length === 0) {
    return res.status(400).json({ error: 'testCases 必须是非空数组' });
  }

  // 校验测试用例
  for (let i = 0; i < problem.testCases.length; i++) {
    const tc = problem.testCases[i];
    if (!tc.input || typeof tc.input !== 'object' ||
        !tc.output || typeof tc.output !== 'object') {
      return res.status(400).json({ error: `测试用例 ${i + 1} 格式错误` });
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(problem, null, 2), 'utf-8');
  res.json({ message: '更新成功', problem: summarize(problem) });
});

/**
 * DELETE /api/problems/:id
 * 删除题目
 */
router.delete('/:id', (req, res) => {
  const filePath = getProblemPath(req.params.id);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `题目 ${req.params.id} 不存在` });
  }

  fs.unlinkSync(filePath);

  // 同时删除资源目录
  const assetsDir = getAssetsPath(req.params.id);
  if (fs.existsSync(assetsDir)) {
    fs.rmSync(assetsDir, { recursive: true, force: true });
  }

  res.json({ message: '删除成功' });
});

/**
 * POST /api/problems/:id/assets
 * 上传题目图片资源
 */
router.post('/:id/assets', (req, res) => {
  // 先检查题目是否存在
  if (!fs.existsSync(getProblemPath(req.params.id))) {
    return res.status(404).json({ error: `题目 ${req.params.id} 不存在` });
  }

  const uploadMiddleware = upload.array('images', config.maxImagesPerUpload);

  uploadMiddleware(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: `文件大小超过限制 (${config.maxImageSize / 1024 / 1024}MB)` });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: `一次最多上传 ${config.maxImagesPerUpload} 个文件` });
        }
        return res.status(400).json({ error: `上传错误: ${err.message}` });
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '请选择至少一个图片文件' });
    }

    const urls = req.files.map(f => `/api/problems/assets/${req.params.id}/${f.filename}`);
    res.json({
      message: `成功上传 ${req.files.length} 个文件`,
      files: urls
    });
  });
});

/**
 * GET /api/problems/:id/assets
 * 获取题目的资源文件列表
 */
router.get('/:id/assets', (req, res) => {
  const dir = getAssetsPath(req.params.id);
  if (!fs.existsSync(dir)) {
    return res.json([]);
  }

  const files = fs.readdirSync(dir).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.svg', '.gif'].includes(ext);
  });

  res.json(files.map(f => ({
    name: f,
    url: `/api/problems/assets/${req.params.id}/${f}`
  })));
});

/**
 * DELETE /api/problems/:id/assets/:filename
 * 删除指定资源文件
 */
router.delete('/:id/assets/:filename', (req, res) => {
  const filePath = path.join(getAssetsPath(req.params.id), req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '文件不存在' });
  }

  fs.unlinkSync(filePath);
  res.json({ message: '删除成功' });
});

module.exports = router;
