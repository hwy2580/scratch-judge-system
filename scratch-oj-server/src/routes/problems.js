// src/routes/problems.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dns = require('dns');
const net = require('net');
const http = require('http');
const https = require('https');
const db = require('../db');
const config = require('../../config/default');
const { validateProblem } = require('../middleware/validate');

const router = express.Router();

// ==================== SSRF 防护 ====================

/**
 * 检查 IP 是否为私有/保留地址
 * @param {string} ip - IP 地址
 * @returns {boolean} 如果是私有/保留地址则返回 true
 */
function isPrivateOrReservedIP(ip) {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 0) return true; // 本网络
    if (parts[0] === 10) return true; // 私有地址
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true; // CGNAT
    if (parts[0] === 127) return true; // 回环
    if (parts[0] === 169 && parts[1] === 254) return true; // 链路本地
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 私有地址
    if (parts[0] === 192 && parts[1] === 168) return true; // 私有地址
    if (parts[0] === 192 && parts[1] === 0 && parts[2] === 0) return true; // IETF 协议分配
    if (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) return true; // 文档示例
    if (parts[0] === 192 && parts[1] === 88 && parts[2] === 99) return true; // 6to4 中继
    if (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) return true; // 基准测试
    if (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) return true; // 文档示例
    if (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) return true; // 文档示例
    if (parts[0] >= 224) return true; // 组播/保留地址
    return false;
  }
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    if (normalized === '::' || normalized === '::1') return true;
    if (normalized.startsWith('::ffff:')) {
      return isPrivateOrReservedIP(normalized.substring(7));
    }
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // 唯一本地地址
    if (normalized.startsWith('fe8') || normalized.startsWith('fe9') ||
        normalized.startsWith('fea') || normalized.startsWith('feb')) return true; // 链路本地
    if (normalized.startsWith('ff')) return true; // 组播
    if (normalized.startsWith('2001:db8')) return true; // 文档示例
    return false;
  }
  return false;
}

/**
 * 验证 URL 的主机名不解析到私有/保留 IP（防 SSRF）
 * @param {string} hostname - 主机名
 * @returns {Promise<void>} 如果安全则 resolve，否则 reject
 */
async function resolvePublicHostname(hostname) {
  const normalizedHostname = hostname.replace(/^\[|\]$/g, '');

  // 先检查是否直接是 IP 地址
  if (net.isIPv4(normalizedHostname) || net.isIPv6(normalizedHostname)) {
    if (isPrivateOrReservedIP(normalizedHostname)) {
      throw new Error('不允许访问私有/保留地址');
    }
    return [{
      address: normalizedHostname,
      family: net.isIPv4(normalizedHostname) ? 4 : 6
    }];
  }

  // DNS 解析主机名
  const addresses = await dns.promises.lookup(normalizedHostname, { all: true, family: 0 });
  for (const addr of addresses) {
    if (isPrivateOrReservedIP(addr.address)) {
      throw new Error('不允许访问私有/保留地址');
    }
  }

  return addresses;
}

const RESERVED_FILENAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
]);

const MIME_EXTENSIONS = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp'
};

function isAllowedImageMimeType(mimeType) {
  return config.allowedImageTypes.includes(mimeType);
}

function sanitizeAssetFilename(originalName, mimeType, fallback = 'image') {
  const rawName = path.basename(originalName || '');
  const parsed = path.parse(rawName);
  const safeExt = MIME_EXTENSIONS[mimeType] || '.bin';
  let base = (parsed.name || fallback).replace(/[^a-zA-Z0-9._-]/g, '_');
  base = base.replace(/^\.+/, '').substring(0, 80);

  if (!base || RESERVED_FILENAMES.has(base.toUpperCase())) {
    base = fallback;
  }

  return `${base}${safeExt}`;
}

function getUniqueFilename(dir, filename) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  let finalName = filename;
  let counter = 1;

  while (fs.existsSync(path.join(dir, finalName))) {
    finalName = `${base}-${counter}${ext}`;
    counter++;
  }

  return finalName;
}

async function downloadUrlWithoutRedirect(parsedUrl, maxBytes) {
  const addresses = await resolvePublicHostname(parsedUrl.hostname);
  const pinnedAddress = addresses[0];
  const client = parsedUrl.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (!settled) {
        settled = true;
        fn(value);
      }
    };

    const req = client.request({
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || undefined,
      path: `${parsedUrl.pathname}${parsedUrl.search}`,
      method: 'GET',
      timeout: 10000,
      servername: parsedUrl.hostname,
      headers: {
        Host: parsedUrl.host,
        'User-Agent': 'scratch-oj-server/1.0'
      },
      lookup: (hostname, options, cb) => {
        cb(null, pinnedAddress.address, pinnedAddress.family);
      }
    }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400) {
        response.resume();
        finish(reject, Object.assign(new Error('不允许重定向，请提供最终图片地址'), { code: 'REDIRECT' }));
        return;
      }

      const chunks = [];
      let total = 0;

      response.on('data', (chunk) => {
        total += chunk.length;
        if (total > maxBytes) {
          req.destroy(Object.assign(new Error('文件大小超过限制'), { code: 'TOO_LARGE' }));
          return;
        }
        chunks.push(chunk);
      });

      response.on('end', () => {
        finish(resolve, {
          statusCode: response.statusCode,
          headers: response.headers,
          buffer: Buffer.concat(chunks)
        });
      });
    });

    req.on('timeout', () => {
      req.destroy(Object.assign(new Error('下载超时（10 秒）'), { code: 'TIMEOUT' }));
    });
    req.on('error', (err) => finish(reject, err));
    req.end();
  });
}

// ==================== 图片上传配置 ====================

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(config.uploadDir, req.params.id);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const dir = path.join(config.uploadDir, req.params.id);
      const safeName = sanitizeAssetFilename(file.originalname, file.mimetype);
      cb(null, getUniqueFilename(dir, safeName));
    }
  }),
  limits: { fileSize: config.maxImageSize },
  fileFilter: (req, file, cb) => {
    if (isAllowedImageMimeType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${file.mimetype}`));
    }
  }
});

// ==================== 预编译 SQL ====================

const sql = {
  list: db.prepare(`
    SELECT id, name, description, category, difficulty, source, tags,
           time_limit, step_limit, test_cases, created_at, updated_at
    FROM problems ORDER BY created_at DESC
  `),
  get: db.prepare('SELECT * FROM problems WHERE id = ?'),
  insert: db.prepare(`
    INSERT INTO problems (id, name, description, content, category, difficulty, source, tags, time_limit, step_limit, test_cases)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  update: db.prepare(`
    UPDATE problems SET name = ?, description = ?, content = ?, category = ?, difficulty = ?, source = ?, tags = ?, time_limit = ?, step_limit = ?, test_cases = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  delete: db.prepare('DELETE FROM problems WHERE id = ?'),
  insertAsset: db.prepare(`
    INSERT INTO assets (problem_id, filename, original_name, size, mime_type)
    VALUES (?, ?, ?, ?, ?)
  `),
  getAssets: db.prepare('SELECT * FROM assets WHERE problem_id = ?'),
  getAsset: db.prepare('SELECT * FROM assets WHERE problem_id = ? AND filename = ?'),
  deleteAsset: db.prepare('DELETE FROM assets WHERE problem_id = ? AND filename = ?')
};

// ==================== 路由 ====================

/**
 * GET /api/problems
 * 获取题目列表，支持筛选
 */
router.get('/', (req, res) => {
  try {
    const { category, difficulty, source, tag } = req.query;
    const filters = [];
    const params = [];

    if (category) {
      filters.push('category = ?');
      params.push(category);
    }
    if (difficulty) {
      filters.push('difficulty = ?');
      params.push(difficulty);
    }
    if (source) {
      filters.push('source = ?');
      params.push(source);
    }

    const listQuery = `
      SELECT id, name, description, category, difficulty, source, tags,
             time_limit, step_limit, test_cases, created_at, updated_at
      FROM problems
      ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY created_at DESC
    `;
    let problems = filters.length ? db.prepare(listQuery).all(...params) : sql.list.all();

    // 标签筛选（SQLite JSON 函数较复杂，应用层过滤）
    if (tag) {
      const tagLower = tag.toLowerCase();
      problems = problems.filter(p => {
        const tags = JSON.parse(p.tags || '[]');
        return tags.some(t => t.toLowerCase().includes(tagLower));
      });
    }

    // 解析 tags JSON
    const result = problems.map(p => ({
      ...p,
      tags: JSON.parse(p.tags || '[]'),
      testCasesCount: JSON.parse(p.test_cases || '[]').length
    }));

    res.json(result);
  } catch (err) {
    console.error('读取题目列表失败:', err);
    res.status(500).json({ error: '读取题目列表失败' });
  }
});

/**
 * GET /api/problems/:id
 * 获取单个题目详情
 */
router.get('/:id', (req, res) => {
  try {
    const problem = sql.get.get(req.params.id);
    if (!problem) {
      return res.status(404).json({ error: `题目 ${req.params.id} 不存在` });
    }

    // 解析 JSON 字段
    problem.tags = JSON.parse(problem.tags || '[]');
    problem.testCases = JSON.parse(problem.test_cases || '[]');
    delete problem.test_cases;

    res.json(problem);
  } catch (err) {
    console.error('读取题目失败:', err);
    res.status(500).json({ error: '读取题目失败' });
  }
});

/**
 * POST /api/problems
 * 创建新题目
 */
router.post('/', validateProblem, (req, res) => {
  try {
    const p = req.body;

    // 检查是否已存在
    if (sql.get.get(p.id)) {
      return res.status(409).json({ error: `题目 ${p.id} 已存在` });
    }

    sql.insert.run(
      p.id,
      p.name,
      p.description || null,
      p.content || null,
      p.category || null,
      p.difficulty || null,
      p.source || null,
      JSON.stringify(p.tags || []),
      p.timeLimit || 5000,
      p.stepLimit || 100000,
      JSON.stringify(p.testCases)
    );

    res.status(201).json({ message: '创建成功', id: p.id });
  } catch (err) {
    console.error('创建题目失败:', err);
    res.status(500).json({ error: '创建题目失败' });
  }
});

/**
 * PUT /api/problems/:id
 * 更新题目
 */
router.put('/:id', validateProblem, (req, res) => {
  try {
    const id = req.params.id;
    const p = req.body;

    if (!sql.get.get(id)) {
      return res.status(404).json({ error: `题目 ${id} 不存在` });
    }

    sql.update.run(
      p.name,
      p.description || null,
      p.content || null,
      p.category || null,
      p.difficulty || null,
      p.source || null,
      JSON.stringify(p.tags || []),
      p.timeLimit || 5000,
      p.stepLimit || 100000,
      JSON.stringify(p.testCases),
      id
    );

    res.json({ message: '更新成功', id });
  } catch (err) {
    console.error('更新题目失败:', err);
    res.status(500).json({ error: '更新题目失败' });
  }
});

/**
 * DELETE /api/problems/:id
 * 删除题目（级联删除图片记录）
 */
router.delete('/:id', (req, res) => {
  try {
    const id = req.params.id;

    if (!sql.get.get(id)) {
      return res.status(404).json({ error: `题目 ${id} 不存在` });
    }

    // 删除图片文件
    const assetsDir = path.join(config.uploadDir, id);
    if (fs.existsSync(assetsDir)) {
      fs.rmSync(assetsDir, { recursive: true, force: true });
    }

    sql.delete.run(id);

    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('删除题目失败:', err);
    res.status(500).json({ error: '删除题目失败' });
  }
});

/**
 * POST /api/problems/:id/assets
 * 上传图片
 */
router.post('/:id/assets', (req, res) => {
  try {
    if (!sql.get.get(req.params.id)) {
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

      // 记录到数据库
      const insertMany = db.transaction((files) => {
        for (const f of files) {
          sql.insertAsset.run(
            req.params.id,
            f.filename,
            f.originalname,
            f.size,
            f.mimetype
          );
        }
      });
      insertMany(req.files);

      const urls = req.files.map(f => `/api/assets/${req.params.id}/${f.filename}`);
      res.json({ message: `成功上传 ${req.files.length} 个文件`, files: urls });
    });
  } catch (err) {
    console.error('上传图片失败:', err);
    res.status(500).json({ error: '上传图片失败' });
  }
});

/**
 * POST /api/problems/:id/assets/url
 * 从 URL 导入图片
 */
router.post('/:id/assets/url', async (req, res) => {
  try {
    const problemId = req.params.id;
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: '请提供图片 URL' });
    }

    // 验证 URL 格式
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      return res.status(400).json({ error: '无效的 URL 格式' });
    }

    // 限制协议为 http/https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: '仅支持 http/https 协议' });
    }

    // 检查题目是否存在
    if (!sql.get.get(problemId)) {
      return res.status(404).json({ error: `题目 ${problemId} 不存在` });
    }

    // 下载图片：固定使用已校验的 DNS 解析结果，禁止重定向，避免 DNS rebinding。
    let download;
    try {
      download = await downloadUrlWithoutRedirect(parsedUrl, config.maxImageSize);
    } catch (downloadErr) {
      if (downloadErr.code === 'TIMEOUT') {
        return res.status(400).json({ error: downloadErr.message });
      }
      if (downloadErr.code === 'REDIRECT') {
        return res.status(400).json({ error: downloadErr.message });
      }
      if (downloadErr.code === 'TOO_LARGE') {
        return res.status(400).json({ error: `文件大小超过限制 (${config.maxImageSize / 1024 / 1024}MB)` });
      }
      if (downloadErr.message === '不允许访问私有/保留地址') {
        return res.status(400).json({ error: downloadErr.message });
      }
      return res.status(400).json({ error: '下载失败' });
    }
    if (download.statusCode < 200 || download.statusCode >= 300) {
      return res.status(400).json({ error: `下载失败: HTTP ${download.statusCode}` });
    }

    // 检查内容类型
    const contentType = download.headers['content-type'] || '';
    const mimeType = contentType.split(';')[0].trim();
    if (!isAllowedImageMimeType(mimeType)) {
      return res.status(400).json({ error: `不支持的图片类型: ${mimeType}` });
    }

    // 检查文件大小（Content-Length 头）
    const contentLength = download.headers['content-length'];
    if (contentLength && parseInt(contentLength) > config.maxImageSize) {
      return res.status(400).json({ error: `文件大小超过限制 (${config.maxImageSize / 1024 / 1024}MB)` });
    }

    // 获取文件名并清洗（I4：移除不安全字符，限制长度，拒绝保留名）
    const urlPath = parsedUrl.pathname;
    const filename = sanitizeAssetFilename(path.basename(urlPath), mimeType, 'imported-image');

    // 确保目录存在
    const dir = path.join(config.uploadDir, problemId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 处理文件名冲突
    const finalFilename = getUniqueFilename(dir, filename);

    // 保存文件
    const filePath = path.join(dir, finalFilename);
    const buffer = download.buffer;

    // C2：验证实际下载的 buffer 大小
    if (buffer.length > config.maxImageSize) {
      return res.status(400).json({ error: `文件大小超过限制 (${config.maxImageSize / 1024 / 1024}MB)` });
    }

    fs.writeFileSync(filePath, buffer);

    // 记录到数据库
    const stats = fs.statSync(filePath);
    sql.insertAsset.run(
      problemId,
      finalFilename,
      finalFilename,
      stats.size,
      mimeType
    );

    res.json({
      message: '导入成功',
      file: `/api/assets/${problemId}/${finalFilename}`
    });
  } catch (err) {
    console.error('从 URL 导入图片失败:', err);
    res.status(500).json({ error: '导入失败，请稍后重试' });
  }
});

/**
 * GET /api/problems/:id/assets
 * 获取题目图片列表
 */
router.get('/:id/assets', (req, res) => {
  try {
    const assets = sql.getAssets.all(req.params.id);
    res.json(assets.map(a => ({
      name: a.filename,
      originalName: a.original_name,
      url: `/api/assets/${req.params.id}/${a.filename}`,
      size: a.size,
      mimeType: a.mime_type
    })));
  } catch (err) {
    console.error('获取图片列表失败:', err);
    res.status(500).json({ error: '获取图片列表失败' });
  }
});

/**
 * DELETE /api/problems/:id/assets/:filename
 * 删除指定图片
 */
router.delete('/:id/assets/:filename', (req, res) => {
  try {
    const asset = sql.getAsset.get(req.params.id, req.params.filename);
    if (!asset) {
      return res.status(404).json({ error: '文件不存在' });
    }

    // 删除文件
    const filePath = path.join(config.uploadDir, req.params.id, req.params.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 删除记录
    sql.deleteAsset.run(req.params.id, req.params.filename);

    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('删除图片失败:', err);
    res.status(500).json({ error: '删除图片失败' });
  }
});

module.exports = router;
