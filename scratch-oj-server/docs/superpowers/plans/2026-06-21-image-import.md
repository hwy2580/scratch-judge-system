# 图片导入功能增强实现计划

> **致智能体工作者：** 必须使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 技能逐任务实施本计划。步骤使用 checkbox (`- [ ]`) 语法进行跟踪。

**目标：** 为 Scratch 判题系统增强图片导入能力，包括新建题目时上传、图片预览、URL 导入等功能。

**架构：** 前端单页应用（public/index.html）增加图片管理 UI，后端新增 URL 导入 API。采用先保存后上传的策略简化实现。

**技术栈：** Express 5.x、multer 2.x、原生 JavaScript、XMLHttpRequest（进度追踪）

## 全局约束

- 所有文档和注释使用中文
- 使用 CommonJS 模块系统
- 前端代码保持单文件结构（public/index.html）
- 图片上传限制：5MB/文件，10 文件/次
- 支持格式：PNG、JPG、SVG、GIF

---

### Task 1: CSS 样式增强

**文件：**
- 修改: `public/index.html:9-119`（`<style>` 标签内）

**接口：**
- 产出: 新增 `.modal`、`.asset-actions`、`.progress-bar`、`.toast` 样式类

- [ ] **步骤 1: 添加模态框样式**

在 `</style>` 标签前添加以下 CSS：

```css
/* 图片预览模态框 */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.modal-content {
  max-width: 90%;
  max-height: 90%;
  position: relative;
}
.modal-content img {
  max-width: 100%;
  max-height: 80vh;
  border-radius: 8px;
}
.modal-close {
  position: absolute;
  top: -30px;
  right: 0;
  color: white;
  font-size: 28px;
  cursor: pointer;
}
.modal-close:hover {
  color: #ddd;
}

/* 资产操作按钮 */
.asset-actions {
  display: flex;
  gap: 4px;
  justify-content: center;
  margin-top: 4px;
}
.asset-actions button {
  padding: 2px 6px;
  font-size: 10px;
  border: 1px solid #dee2e6;
  border-radius: 3px;
  background: #fff;
  cursor: pointer;
}
.asset-actions button:hover {
  background: #f8f9fa;
}

/* 上传进度条 */
.progress-bar {
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 8px;
}
.progress-fill {
  height: 100%;
  background: #007bff;
  transition: width 0.3s;
}
.progress-text {
  font-size: 12px;
  color: #6c757d;
  margin-top: 4px;
}

/* Toast 提示 */
.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: #fff;
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 14px;
  z-index: 2000;
  animation: fadeInOut 2s ease;
}
@keyframes fadeInOut {
  0% { opacity: 0; }
  20% { opacity: 1; }
  80% { opacity: 1; }
  100% { opacity: 0; }
}

/* 禁用状态的上传区域 */
.upload-area.disabled {
  opacity: 0.5;
  pointer-events: none;
  cursor: not-allowed;
}
```

- [ ] **步骤 2: 验证样式添加成功**

运行：`npm start`，在浏览器打开 http://localhost:3000/，检查页面无样式错误。

- [ ] **步骤 3: 提交**

```bash
git add public/index.html
git commit -m "feat: 添加图片管理相关 CSS 样式"
```

---

### Task 2: HTML 结构增强

**文件：**
- 修改: `public/index.html:122-310`（`<body>` 标签内）

**接口：**
- 产出: 新增 `#image-preview-modal`、`#upload-progress`、URL 导入输入框

- [ ] **步骤 1: 添加图片预览模态框**

在 `</div>` 结束标签（`</body>` 前）添加：

```html
<!-- 图片预览模态框 -->
<div id="image-preview-modal" class="modal hidden" onclick="closePreview()">
  <div class="modal-content" onclick="event.stopPropagation()">
    <span class="modal-close" onclick="closePreview()">&times;</span>
    <img id="preview-image" src="" alt="">
    <div id="preview-info" style="color:white;text-align:center;margin-top:10px;font-size:14px;"></div>
  </div>
</div>
```

- [ ] **步骤 2: 添加上传进度条**

在图片资源管理区域内（`<div class="assets-list" id="assets-list"></div>` 后面）添加：

```html
<!-- 上传进度条 -->
<div id="upload-progress" class="hidden">
  <div class="progress-bar">
    <div class="progress-fill" style="width: 0%"></div>
  </div>
  <div class="progress-text">上传中... 0%</div>
</div>
```

- [ ] **步骤 3: 添加 URL 导入区域**

在上传区域后面添加：

```html
<!-- URL 导入区域 -->
<div class="url-import-section" style="margin-top: 10px;">
  <div class="form-row">
    <div class="form-group" style="flex: 3;">
      <input type="text" id="image-url-input" placeholder="输入图片 URL，如 https://example.com/image.png">
    </div>
    <div class="form-group" style="flex: 1;">
      <button class="btn btn-primary btn-sm" onclick="importFromUrl()">从 URL 导入</button>
    </div>
  </div>
</div>
```

- [ ] **步骤 4: 验证 HTML 结构**

运行：`npm start`，在浏览器打开 http://localhost:3000/，检查页面元素存在。

- [ ] **步骤 5: 提交**

```bash
git add public/index.html
git commit -m "feat: 添加图片预览模态框和 URL 导入 HTML 结构"
```

---

### Task 3: 新建题目时显示图片上传区域

**文件：**
- 修改: `public/index.html:451-471`（`showCreateForm` 函数）

**接口：**
- 消费: `editingId` 变量
- 产出: `showCreateForm()` 函数行为变更

- [ ] **步骤 1: 修改 showCreateForm 函数**

找到 `showCreateForm` 函数，修改为：

```javascript
const showCreateForm = () => {
  editingId = null;
  document.getElementById('form-title').textContent = '新建题目';
  document.getElementById('f-id').value = '';
  document.getElementById('f-id').disabled = false;
  document.getElementById('f-name').value = '';
  document.getElementById('f-description').value = '';
  document.getElementById('f-content').value = '';
  document.getElementById('f-category').value = '';
  document.getElementById('f-difficulty').value = '';
  document.getElementById('f-source').value = '';
  currentTags = [];
  renderTags();
  document.getElementById('f-timeLimit').value = 5000;
  document.getElementById('f-stepLimit').value = 100000;
  testCases = [{ input: '{}', output: '{}' }];
  renderTestCases();
  document.getElementById('edit-msg').innerHTML = '';
  document.getElementById('edit-form').classList.remove('hidden');

  // 显示图片上传区域，但设为禁用状态
  document.getElementById('assets-section').classList.remove('hidden');
  const uploadArea = document.getElementById('assets-upload-area');
  uploadArea.classList.add('disabled');
  uploadArea.querySelector('p').textContent = '请先保存题目，然后上传图片';

  // 清空图片列表
  document.getElementById('assets-list').innerHTML = '';

  // 隐藏 URL 导入区域
  const urlSection = document.querySelector('.url-import-section');
  if (urlSection) urlSection.style.display = 'none';
};
```

- [ ] **步骤 2: 验证新建题目界面**

运行：`npm start`，点击「新建题目」，确认图片上传区域显示为禁用状态。

- [ ] **步骤 3: 提交**

```bash
git add public/index.html
git commit -m "feat: 新建题目时显示禁用状态的图片上传区域"
```

---

### Task 4: 保存后启用图片上传

**文件：**
- 修改: `public/index.html:541-592`（`saveProblem` 函数）

**接口：**
- 消费: `editingId` 变量
- 产出: 保存成功后启用上传区域

- [ ] **步骤 1: 修改 saveProblem 函数**

找到 `saveProblem` 函数，修改成功处理部分：

```javascript
const saveProblem = async () => {
  const msg = document.getElementById('edit-msg');
  try {
    const parsedCases = testCases.map((tc, i) => {
      try {
        return { input: JSON.parse(tc.input), output: JSON.parse(tc.output) };
      } catch (e) {
        throw new Error(`用例 ${i + 1} 的 JSON 格式错误: ${e.message}`);
      }
    });

    const problem = {
      id: document.getElementById('f-id').value.trim(),
      name: document.getElementById('f-name').value.trim(),
      description: document.getElementById('f-description').value.trim(),
      content: document.getElementById('f-content').value.trim(),
      category: document.getElementById('f-category').value,
      difficulty: document.getElementById('f-difficulty').value,
      source: document.getElementById('f-source').value,
      tags: currentTags,
      timeLimit: parseInt(document.getElementById('f-timeLimit').value) || 5000,
      stepLimit: parseInt(document.getElementById('f-stepLimit').value) || 100000,
      testCases: parsedCases
    };

    if (!problem.id || !problem.name) {
      msg.innerHTML = '<div class="error-msg">ID 和名称不能为空</div>';
      return;
    }

    let result;
    if (editingId) {
      result = await api('PUT', '/problems/' + editingId, problem);
    } else {
      result = await api('POST', '/problems', problem);
    }

    if (result.error) {
      msg.innerHTML = `<div class="error-msg">${esc(result.error)}</div>`;
    } else {
      msg.innerHTML = `<div class="success-msg">✓ ${esc(result.message)}，现在可以上传图片了</div>`;
      loadProblems();
      if (!editingId) {
        editingId = problem.id;
        document.getElementById('f-id').disabled = true;

        // 启用图片上传区域
        const uploadArea = document.getElementById('assets-upload-area');
        uploadArea.classList.remove('disabled');
        uploadArea.querySelector('p').textContent = '点击或拖拽上传图片（PNG、JPG、SVG、GIF，最大 5MB）';

        // 显示 URL 导入区域
        const urlSection = document.querySelector('.url-import-section');
        if (urlSection) urlSection.style.display = 'block';
      }
    }
  } catch (e) {
    msg.innerHTML = `<div class="error-msg">${esc(e.message)}</div>`;
  }
};
```

- [ ] **步骤 2: 验证保存后启用**

运行：`npm start`，新建题目并保存，确认图片上传区域变为可用状态。

- [ ] **步骤 3: 提交**

```bash
git add public/index.html
git commit -m "feat: 保存题目后启用图片上传区域"
```

---

### Task 5: 图片管理功能增强

**文件：**
- 修改: `public/index.html:620-638`（`loadAssets` 函数）

**接口：**
- 消费: `editingId` 变量，`/api/problems/:id/assets` API
- 产出: `previewImage()`、`copyImageUrl()`、`insertImageToMarkdown()`、`showToast()` 函数

- [ ] **步骤 1: 添加工具函数**

在 JavaScript 部分（`// ==================== 图片资源管理 ====================` 之前）添加：

```javascript
// ==================== 图片管理工具函数 ====================

// 预览大图
const previewImage = (url, name) => {
  const modal = document.getElementById('image-preview-modal');
  const img = document.getElementById('preview-image');
  const info = document.getElementById('preview-info');

  img.src = url;
  img.alt = name;
  info.textContent = name;
  modal.classList.remove('hidden');
};

// 关闭预览
const closePreview = () => {
  document.getElementById('image-preview-modal').classList.add('hidden');
};

// ESC 关闭预览
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closePreview();
});

// 复制 URL
const copyImageUrl = async (url) => {
  const fullUrl = window.location.origin + url;
  try {
    await navigator.clipboard.writeText(fullUrl);
    showToast('URL 已复制到剪贴板');
  } catch (e) {
    // fallback
    const input = document.createElement('input');
    input.value = fullUrl;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    showToast('URL 已复制到剪贴板');
  }
};

// 插入到 Markdown 编辑器
const insertImageToMarkdown = (url, name) => {
  const editor = document.getElementById('f-content');
  const markdown = `![${name}](${url})`;

  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const text = editor.value;

  editor.value = text.substring(0, start) + markdown + text.substring(end);
  editor.focus();
  editor.selectionStart = editor.selectionEnd = start + markdown.length;

  showToast('已插入到题面编辑器');
};

// Toast 提示
const showToast = (message) => {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2000);
};
```

- [ ] **步骤 2: 修改 loadAssets 函数**

找到 `loadAssets` 函数，修改为：

```javascript
const loadAssets = async (problemId) => {
  try {
    const files = await api('GET', '/problems/' + problemId + '/assets');
    const list = document.getElementById('assets-list');
    if (files.length === 0) {
      list.innerHTML = '<div style="color:#6c757d;font-size:13px;">暂无图片资源</div>';
      return;
    }
    list.innerHTML = files.map(f => `
      <div class="asset-item">
        <img src="${esc(f.url)}" alt="${esc(f.name)}" title="${esc(f.name)}"
             onclick="previewImage('${esc(f.url)}', '${esc(f.name)}')" style="cursor:pointer;">
        <div class="asset-name">${esc(f.name)}</div>
        <div class="asset-actions">
          <button onclick="copyImageUrl('${esc(f.url)}')" title="复制 URL">📋</button>
          <button onclick="insertImageToMarkdown('${esc(f.url)}', '${esc(f.name)}')" title="插入到题面">📝</button>
          <button onclick="deleteAsset('${esc(editingId)}','${esc(f.name)}')" title="删除">🗑️</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    document.getElementById('assets-list').innerHTML = `<div class="error-msg">加载失败</div>`;
  }
};
```

- [ ] **步骤 3: 验证图片管理功能**

运行：`npm start`，编辑一个有图片的题目，测试：
- 点击图片弹出预览
- 按 ESC 关闭预览
- 点击 📋 复制 URL
- 点击 📝 插入到 Markdown

- [ ] **步骤 4: 提交**

```bash
git add public/index.html
git commit -m "feat: 增强图片管理功能（预览、复制、插入）"
```

---

### Task 6: 上传进度指示器

**文件：**
- 修改: `public/index.html:640-662`（`uploadAssets` 函数）

**接口：**
- 消费: `editingId` 变量，`#upload-progress` 元素
- 产出: `uploadAssets()` 函数行为变更

- [ ] **步骤 1: 修改 uploadAssets 函数**

找到 `uploadAssets` 函数，修改为：

```javascript
const uploadAssets = async () => {
  if (!editingId) return;
  const input = document.getElementById('assets-file-input');
  if (!input.files.length) return;

  const formData = new FormData();
  for (const file of input.files) {
    formData.append('images', file);
  }

  // 显示进度条
  const progress = document.getElementById('upload-progress');
  const progressFill = progress.querySelector('.progress-fill');
  const progressText = progress.querySelector('.progress-text');
  progress.classList.remove('hidden');
  progressFill.style.width = '0%';
  progressText.textContent = '上传中... 0%';

  try {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/problems/${editingId}/assets`);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        progressFill.style.width = percent + '%';
        progressText.textContent = `上传中... ${percent}%`;
      }
    });

    xhr.onload = () => {
      progress.classList.add('hidden');
      try {
        const result = JSON.parse(xhr.responseText);
        if (result.error) {
          alert(result.error);
        } else {
          loadAssets(editingId);
          showToast(result.message);
        }
      } catch (e) {
        alert('解析响应失败');
      }
    };

    xhr.onerror = () => {
      progress.classList.add('hidden');
      alert('上传失败');
    };

    xhr.send(formData);
  } catch (e) {
    progress.classList.add('hidden');
    alert('上传失败: ' + e.message);
  }
  input.value = '';
};
```

- [ ] **步骤 2: 验证进度条**

运行：`npm start`，上传多张图片，确认进度条显示正确。

- [ ] **步骤 3: 提交**

```bash
git add public/index.html
git commit -m "feat: 添加图片上传进度指示器"
```

---

### Task 7: 后端 URL 导入 API

**文件：**
- 修改: `src/routes/problems.js:239-286`（在 `POST /:id/assets` 路由后添加）

**接口：**
- 消费: `req.params.id`、`req.body.url`
- 产出: `POST /api/problems/:id/assets/url` 端点

- [ ] **步骤 1: 添加 URL 导入路由**

在 `router.post('/:id/assets', ...)` 路由后面添加：

```javascript
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

    // 检查题目是否存在
    if (!sql.get.get(problemId)) {
      return res.status(404).json({ error: `题目 ${problemId} 不存在` });
    }

    // 下载图片
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(400).json({ error: `下载失败: HTTP ${response.status}` });
    }

    // 检查内容类型
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'URL 不是图片资源' });
    }

    // 获取文件名
    const urlPath = parsedUrl.pathname;
    let filename = path.basename(urlPath);

    // 如果没有扩展名，根据 content-type 添加
    if (!path.extname(filename)) {
      const extMap = {
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/gif': '.gif',
        'image/svg+xml': '.svg'
      };
      filename = 'imported-image' + (extMap[contentType] || '.png');
    }

    // 确保目录存在
    const dir = path.join(config.uploadDir, problemId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 处理文件名冲突
    let finalFilename = filename;
    let counter = 1;
    while (fs.existsSync(path.join(dir, finalFilename))) {
      const ext = path.extname(filename);
      const base = path.basename(filename, ext);
      finalFilename = `${base}_${counter}${ext}`;
      counter++;
    }

    // 保存文件
    const filePath = path.join(dir, finalFilename);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(buffer));

    // 记录到数据库
    const stats = fs.statSync(filePath);
    sql.insertAsset.run(
      problemId,
      finalFilename,
      finalFilename,
      stats.size,
      contentType
    );

    res.json({
      message: '导入成功',
      file: `/api/assets/${problemId}/${finalFilename}`
    });
  } catch (err) {
    console.error('从 URL 导入图片失败:', err);
    res.status(500).json({ error: '导入失败', detail: err.message });
  }
});
```

- [ ] **步骤 2: 运行单元测试**

```bash
npm test
```

预期：所有测试通过

- [ ] **步骤 3: 验证 API**

```bash
# 启动服务器
npm start

# 创建测试题目
curl -X POST http://localhost:3000/api/problems \
  -H "Content-Type: application/json" \
  -d '{"id":"test-url","name":"测试","testCases":[{"input":{},"output":{}}]}'

# 测试 URL 导入
curl -X POST http://localhost:3000/api/problems/test-url/assets/url \
  -H "Content-Type: application/json" \
  -d '{"url":"https://via.placeholder.com/100.png"}'
```

预期：返回 `{"message":"导入成功","file":"/api/assets/test-url/100.png"}`

- [ ] **步骤 4: 提交**

```bash
git add src/routes/problems.js
git commit -m "feat: 新增从 URL 导入图片 API"
```

---

### Task 8: 前端 URL 导入功能

**文件：**
- 修改: `public/index.html`（JavaScript 部分）

**接口：**
- 消费: `editingId` 变量，`POST /api/problems/:id/assets/url` API
- 产出: `importFromUrl()` 函数

- [ ] **步骤 1: 添加 importFromUrl 函数**

在 JavaScript 部分（图片管理工具函数后面）添加：

```javascript
// 从 URL 导入图片
const importFromUrl = async () => {
  if (!editingId) {
    showToast('请先保存题目');
    return;
  }

  const input = document.getElementById('image-url-input');
  const url = input.value.trim();

  if (!url) {
    showToast('请输入图片 URL');
    return;
  }

  // 简单验证 URL 格式
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    showToast('URL 必须以 http:// 或 https:// 开头');
    return;
  }

  try {
    const btn = document.querySelector('.url-import-section .btn');
    btn.disabled = true;
    btn.textContent = '导入中...';

    const res = await fetch(`/api/problems/${editingId}/assets/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const result = await res.json();
    if (result.error) {
      showToast(result.error);
    } else {
      input.value = '';
      loadAssets(editingId);
      showToast(result.message);
    }
  } catch (e) {
    showToast('导入失败: ' + e.message);
  } finally {
    const btn = document.querySelector('.url-import-section .btn');
    btn.disabled = false;
    btn.textContent = '从 URL 导入';
  }
};
```

- [ ] **步骤 2: 验证 URL 导入 UI**

运行：`npm start`，编辑一个题目，测试 URL 导入功能。

- [ ] **步骤 3: 提交**

```bash
git add public/index.html
git commit -m "feat: 添加前端 URL 导入图片功能"
```

---

### Task 9: 修改编辑题目时的初始化

**文件：**
- 修改: `public/index.html:473-501`（`editProblem` 函数）

**接口：**
- 消费: `editingId` 变量
- 产出: 编辑时正确显示/隐藏 UI 元素

- [ ] **步骤 1: 修改 editProblem 函数**

找到 `editProblem` 函数，在末尾添加 URL 导入区域显示逻辑：

```javascript
const editProblem = async (id) => {
  try {
    const p = await api('GET', '/problems/' + id);
    editingId = id;
    document.getElementById('form-title').textContent = '编辑题目: ' + id;
    document.getElementById('f-id').value = p.id;
    document.getElementById('f-id').disabled = true;
    document.getElementById('f-name').value = p.name;
    document.getElementById('f-description').value = p.description || '';
    document.getElementById('f-content').value = p.content || '';
    document.getElementById('f-category').value = p.category || '';
    document.getElementById('f-difficulty').value = p.difficulty || '';
    document.getElementById('f-source').value = p.source || '';
    currentTags = [...(p.tags || [])];
    renderTags();
    document.getElementById('f-timeLimit').value = p.timeLimit || 5000;
    document.getElementById('f-stepLimit').value = p.stepLimit || 100000;
    testCases = p.testCases.map(tc => ({
      input: JSON.stringify(tc.input, null, 2),
      output: JSON.stringify(tc.output, null, 2)
    }));
    renderTestCases();
    document.getElementById('edit-msg').innerHTML = '';
    document.getElementById('edit-form').classList.remove('hidden');
    document.getElementById('assets-section').classList.remove('hidden');

    // 确保上传区域可用
    const uploadArea = document.getElementById('assets-upload-area');
    uploadArea.classList.remove('disabled');
    uploadArea.querySelector('p').textContent = '点击或拖拽上传图片（PNG、JPG、SVG、GIF，最大 5MB）';

    // 显示 URL 导入区域
    const urlSection = document.querySelector('.url-import-section');
    if (urlSection) urlSection.style.display = 'block';

    loadAssets(id);
  } catch (e) {
    alert('加载题目失败: ' + e.message);
  }
};
```

- [ ] **步骤 2: 验证编辑功能**

运行：`npm start`，编辑一个已有题目，确认图片上传和 URL 导入区域正确显示。

- [ ] **步骤 3: 提交**

```bash
git add public/index.html
git commit -m "fix: 编辑题目时正确初始化图片上传区域状态"
```

---

### Task 10: 端到端测试

**文件：**
- 无修改，仅测试

**接口：**
- 测试所有新增功能

- [ ] **步骤 1: 启动服务**

```bash
cd E:/CODE/scratch-oj-server
npm start
```

- [ ] **步骤 2: 测试新建题目流程**

1. 打开 http://localhost:3000/
2. 展开「题目管理」
3. 点击「新建题目」
4. 填写 ID 和名称
5. 确认图片上传区域显示为禁用状态
6. 点击「保存」
7. 确认图片上传区域变为可用
8. 上传一张图片
9. 确认进度条显示
10. 确认图片出现在列表中

- [ ] **步骤 3: 测试图片管理功能**

1. 点击图片，确认预览模态框弹出
2. 按 ESC，确认模态框关闭
3. 点击 📋 按钮，确认 URL 已复制
4. 点击 📝 按钮，确认 Markdown 已插入
5. 点击 🗑️ 按钮，确认图片已删除

- [ ] **步骤 4: 测试 URL 导入**

1. 在 URL 输入框输入：`https://via.placeholder.com/100.png`
2. 点击「从 URL 导入」
3. 确认图片导入成功
4. 测试无效 URL，确认错误提示

- [ ] **步骤 5: 运行自动化测试**

```bash
npm test
```

预期：所有测试通过

- [ ] **步骤 6: 最终提交**

```bash
git add -A
git commit -m "feat: 完成图片导入功能增强"
```

---

## 实现顺序

1. Task 1-2: CSS 和 HTML 基础结构
2. Task 3-4: 新建题目时图片上传
3. Task 5: 图片管理功能增强
4. Task 6: 上传进度指示器
5. Task 7: 后端 URL 导入 API
6. Task 8-9: 前端 URL 导入功能
7. Task 10: 端到端测试
