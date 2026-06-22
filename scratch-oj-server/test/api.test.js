/**
 * 端到端 API 测试
 * 测试图片导入功能增强的所有后端接口
 */

const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

// 测试配置
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const TEST_DB_PATH = path.join(__dirname, '..', 'data', 'test.db');
const TEST_UPLOAD_DIR = path.join(__dirname, '..', 'uploads-test');

// 临时修改环境变量使用测试数据库和上传目录
process.env.DB_PATH = TEST_DB_PATH;
process.env.UPLOAD_DIR = TEST_UPLOAD_DIR;

// 辅助函数
const api = async (method, path, body = null) => {
  const opts = {
    method,
    headers: {}
  };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${path}`, opts);
  return { status: res.status, data: await res.json() };
};

// 1x1 像素 PNG 测试图片（67 字节）
const TEST_PNG = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  // PNG 签名
  0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  // IHDR 块
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  // 1x1 像素
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,  // 8-bit RGB
  0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  // IDAT 块
  0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,  // 压缩数据
  0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC,
  0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,  // IEND 块
  0x44, 0xAE, 0x42, 0x60, 0x82
]);

// 测试数据清理
const cleanup = async () => {
  try {
    // 删除测试题目（会级联删除图片）
    await api('DELETE', '/api/problems/test-e2e');
    await api('DELETE', '/api/problems/test-e2e-2');
    await api('DELETE', '/api/problems/test-url-import');
  } catch (e) {
    // 忽略清理错误
  }
};

describe('图片导入功能增强 - 端到端测试', () => {
  before(async () => {
    // 确保测试上传目录存在
    if (!fs.existsSync(TEST_UPLOAD_DIR)) {
      fs.mkdirSync(TEST_UPLOAD_DIR, { recursive: true });
    }
    // 清理旧数据
    await cleanup();
  });

  after(async () => {
    // 清理测试数据
    await cleanup();
    // 清理测试上传目录
    if (fs.existsSync(TEST_UPLOAD_DIR)) {
      fs.rmSync(TEST_UPLOAD_DIR, { recursive: true, force: true });
    }
  });

  // ==================== 健康检查 ====================
  describe('健康检查', () => {
    test('GET /api/health 应返回状态 ok', async () => {
      const { status, data } = await api('GET', '/api/health');
      assert.strictEqual(status, 200);
      assert.strictEqual(data.status, 'ok');
    });
  });

  // ==================== 题目 CRUD ====================
  describe('题目 CRUD', () => {
    test('POST /api/problems 应成功创建题目', async () => {
      const problem = {
        id: 'test-e2e',
        name: '端到端测试题目',
        description: '用于测试的题目',
        testCases: [{ input: {}, output: {} }]
      };

      const { status, data } = await api('POST', '/api/problems', problem);
      assert.strictEqual(status, 201);
      assert.strictEqual(data.message, '创建成功');
      assert.strictEqual(data.id, 'test-e2e');
    });

    test('POST /api/problems 重复 ID 应返回 409', async () => {
      const problem = {
        id: 'test-e2e',
        name: '重复题目',
        testCases: [{ input: {}, output: {} }]
      };

      const { status, data } = await api('POST', '/api/problems', problem);
      assert.strictEqual(status, 409);
      assert.ok(data.error.includes('已存在'));
    });

    test('GET /api/problems/:id 应返回题目详情', async () => {
      const { status, data } = await api('GET', '/api/problems/test-e2e');
      assert.strictEqual(status, 200);
      assert.strictEqual(data.id, 'test-e2e');
      assert.strictEqual(data.name, '端到端测试题目');
      assert.ok(Array.isArray(data.testCases));
    });

    test('PUT /api/problems/:id 应成功更新题目', async () => {
      const updates = {
        name: '更新后的题目名称',
        testCases: [{ input: { x: 1 }, output: { y: 2 } }]
      };

      const { status, data } = await api('PUT', '/api/problems/test-e2e', updates);
      assert.strictEqual(status, 200);
      assert.strictEqual(data.message, '更新成功');

      // 验证更新
      const { data: updated } = await api('GET', '/api/problems/test-e2e');
      assert.strictEqual(updated.name, '更新后的题目名称');
    });

    test('GET /api/problems 应返回题目列表', async () => {
      const { status, data } = await api('GET', '/api/problems');
      assert.strictEqual(status, 200);
      assert.ok(Array.isArray(data));
      assert.ok(data.some(p => p.id === 'test-e2e'));
    });
  });

  // ==================== 图片上传 ====================
  describe('图片上传', () => {
    test('POST /api/problems/:id/assets 应成功上传图片', async () => {
      const formData = new FormData();
      const blob = new Blob([TEST_PNG], { type: 'image/png' });
      formData.append('images', blob, 'test.png');

      const res = await fetch(`${BASE_URL}/api/problems/test-e2e/assets`, {
        method: 'POST',
        body: formData
      });
      const { status, data } = { status: res.status, data: await res.json() };

      assert.strictEqual(status, 200);
      assert.ok(data.message.includes('成功上传'));
      assert.ok(Array.isArray(data.files));
      assert.ok(data.files.length > 0);
    });

    test('GET /api/problems/:id/assets 应返回图片列表', async () => {
      const { status, data } = await api('GET', '/api/problems/test-e2e/assets');
      assert.strictEqual(status, 200);
      assert.ok(Array.isArray(data));
      assert.ok(data.length > 0);
      assert.ok(data[0].url);
      assert.ok(data[0].name);
    });

    test('DELETE /api/problems/:id/assets/:filename 应删除图片', async () => {
      // 先获取图片列表
      const { data: assets } = await api('GET', '/api/problems/test-e2e/assets');
      if (assets.length > 0) {
        const filename = assets[0].name;
        const { status, data } = await api('DELETE', `/api/problems/test-e2e/assets/${filename}`);
        assert.strictEqual(status, 200);
        assert.strictEqual(data.message, '删除成功');

        // 验证删除
        const { data: remaining } = await api('GET', '/api/problems/test-e2e/assets');
        assert.ok(!remaining.some(a => a.name === filename));
      }
    });

    test('POST /api/problems/:id/assets 不存在的题目应返回 404', async () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
      const formData = new FormData();
      const blob = new Blob([pngBuffer], { type: 'image/png' });
      formData.append('images', blob, 'test.png');

      const res = await fetch(`${BASE_URL}/api/problems/nonexistent/assets`, {
        method: 'POST',
        body: formData
      });
      const { status } = { status: res.status, data: await res.json() };
      assert.strictEqual(status, 404);
    });
  });

  // ==================== URL 导入 ====================
  describe('URL 导入', () => {
    test('POST /api/problems/:id/assets/url 应从 URL 导入图片', async (t) => {
      // 使用一个可靠的测试图片 URL
      const url = 'https://via.placeholder.com/100.png';

      // 先检查外部服务是否可用
      try {
        const check = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        if (!check.ok) {
          t.skip(`外部服务不可用: HTTP ${check.status}`);
          return;
        }
      } catch (e) {
        t.skip(`外部服务不可用: ${e.message}`);
        return;
      }

      const { status, data } = await api('POST', '/api/problems/test-e2e/assets/url', { url });
      assert.strictEqual(status, 200);
      assert.strictEqual(data.message, '导入成功');
      assert.ok(data.file);
    });

    test('POST /api/problems/:id/assets/url 无 URL 应返回 400', async () => {
      const { status, data } = await api('POST', '/api/problems/test-e2e/assets/url', {});
      assert.strictEqual(status, 400);
      assert.ok(data.error.includes('请提供图片 URL'));
    });

    test('POST /api/problems/:id/assets/url 无效 URL 应返回 400', async () => {
      const { status, data } = await api('POST', '/api/problems/test-e2e/assets/url', {
        url: 'not-a-valid-url'
      });
      assert.strictEqual(status, 400);
      assert.ok(data.error.includes('无效的 URL'));
    });

    test('POST /api/problems/:id/assets/url 非 http 协议应返回 400', async () => {
      const { status, data } = await api('POST', '/api/problems/test-e2e/assets/url', {
        url: 'ftp://example.com/image.png'
      });
      assert.strictEqual(status, 400);
      assert.ok(data.error.includes('仅支持 http/https'));
    });

    test('POST /api/problems/:id/assets/url 不存在的题目应返回 404', async () => {
      const { status, data } = await api('POST', '/api/problems/nonexistent/assets/url', {
        url: 'https://example.com/image.png'
      });
      assert.strictEqual(status, 404);
    });
  });

  // ==================== 文件名冲突处理 ====================
  describe('文件名冲突处理', () => {
    test('上传同名文件应自动添加后缀', async () => {
      // 第一次上传
      const formData1 = new FormData();
      formData1.append('images', new Blob([TEST_PNG], { type: 'image/png' }), 'conflict.png');
      const res1 = await fetch(`${BASE_URL}/api/problems/test-e2e/assets`, {
        method: 'POST',
        body: formData1
      });
      const data1 = await res1.json();

      // 第二次上传同名文件
      const formData2 = new FormData();
      formData2.append('images', new Blob([TEST_PNG], { type: 'image/png' }), 'conflict.png');
      const res2 = await fetch(`${BASE_URL}/api/problems/test-e2e/assets`, {
        method: 'POST',
        body: formData2
      });
      const data2 = await res2.json();

      assert.strictEqual(res2.status, 200);
      // 验证两次上传的文件名不同（第二次应自动添加后缀）
      const file1 = data1.files[0];
      const file2 = data2.files[0];
      assert.notStrictEqual(file1, file2, '同名文件上传后文件名应不同（应自动添加后缀）');
    });
  });

  // ==================== 题目删除级联 ====================
  describe('题目删除级联', () => {
    test('删除题目应同时删除关联的图片', async () => {
      // 创建测试题目
      await api('POST', '/api/problems', {
        id: 'test-e2e-2',
        name: '待删除题目',
        testCases: [{ input: {}, output: {} }]
      });

      // 上传图片
      const formData = new FormData();
      formData.append('images', new Blob([TEST_PNG], { type: 'image/png' }), 'to-delete.png');
      await fetch(`${BASE_URL}/api/problems/test-e2e-2/assets`, {
        method: 'POST',
        body: formData
      });

      // 删除题目
      const { status, data } = await api('DELETE', '/api/problems/test-e2e-2');
      assert.strictEqual(status, 200);
      assert.strictEqual(data.message, '删除成功');

      // 验证题目已删除
      const { status: getStatus } = await api('GET', '/api/problems/test-e2e-2');
      assert.strictEqual(getStatus, 404);

      // 验证图片目录已删除
      const assetsDir = path.join(TEST_UPLOAD_DIR, 'test-e2e-2');
      assert.ok(!fs.existsSync(assetsDir));
    });
  });

  // ==================== 静态文件服务 ====================
  describe('静态文件服务', () => {
    test('GET /api/assets/:problemId/:filename 应返回图片文件', async () => {
      // 先上传一个图片
      const formData = new FormData();
      formData.append('images', new Blob([TEST_PNG], { type: 'image/png' }), 'static-test.png');
      await fetch(`${BASE_URL}/api/problems/test-e2e/assets`, {
        method: 'POST',
        body: formData
      });

      // 获取图片列表
      const { data: assets } = await api('GET', '/api/problems/test-e2e/assets');
      if (assets.length > 0) {
        const imageUrl = assets[0].url;
        const res = await fetch(`${BASE_URL}${imageUrl}`);
        assert.strictEqual(res.status, 200);
        assert.ok(res.headers.get('content-type').includes('image'));
      }
    });
  });
});
