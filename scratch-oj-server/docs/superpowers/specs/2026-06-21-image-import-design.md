# 图片导入功能增强设计文档

## 概述

为 Scratch 判题系统的题目管理功能增强图片导入能力，包括：
1. 新建题目时支持图片上传
2. 图片管理功能增强（预览、复制 URL、插入 Markdown）
3. 批量导入图片（进度指示）
4. 从 URL 导入图片

## 1. 新建题目时支持图片上传

### 当前行为
- 新建题目时，图片上传区域隐藏
- 只有编辑已有题目时才能上传图片
- 用户需要先保存题目，再编辑上传图片

### 设计方案
**先保存后上传**（优化用户体验）

#### 前端改动

**修改 `showCreateForm()`**：
```javascript
const showCreateForm = () => {
  // ... 现有代码 ...
  
  // 显示图片上传区域，但设为禁用
  document.getElementById('assets-section').classList.remove('hidden');
  document.getElementById('assets-upload-area').style.opacity = '0.5';
  document.getElementById('assets-upload-area').style.pointerEvents = 'none';
  document.getElementById('assets-upload-area').querySelector('p').textContent = '请先保存题目，然后上传图片';
};
```

**修改 `saveProblem()`**：
```javascript
const saveProblem = async () => {
  // ... 现有代码 ...
  
  if (result.error) {
    msg.innerHTML = `<div class="error-msg">${esc(result.error)}</div>`;
  } else {
    msg.innerHTML = `<div class="success-msg">✓ ${esc(result.message)}，现在可以上传图片了</div>`;
    loadProblems();
    if (!editingId) {
      editingId = problem.id;
      document.getElementById('f-id').disabled = true;
      // 启用图片上传区域
      document.getElementById('assets-upload-area').style.opacity = '1';
      document.getElementById('assets-upload-area').style.pointerEvents = 'auto';
      document.getElementById('assets-upload-area').querySelector('p').textContent = '点击或拖拽上传图片（PNG、JPG、SVG、GIF，最大 5MB）';
    }
  }
};
```

## 2. 图片管理功能增强

### 新增功能

#### 2.1 预览大图
- 点击图片弹出预览模态框
- 支持点击背景或按 ESC 关闭
- 显示图片名称和尺寸信息

#### 2.2 复制 URL
- 点击按钮复制图片完整 URL 到剪贴板
- 显示复制成功提示

#### 2.3 插入到 Markdown
- 点击按钮将 `![图片名](URL)` 插入到题面编辑器
- 插入后自动聚焦到编辑器

#### 2.4 图片排序（未来增强）
- 添加上下箭头按钮调整图片顺序
- 排序结果保存到数据库（需要新增 `order` 字段）
- **当前版本暂不实现**

### 前端改动

#### HTML 结构
```html
<!-- 预览模态框 -->
<div id="image-preview-modal" class="modal hidden">
  <div class="modal-content">
    <span class="modal-close">&times;</span>
    <img id="preview-image" src="" alt="">
    <div id="preview-info"></div>
  </div>
</div>
```

#### CSS 样式
```css
/* 模态框 */
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
```

#### JavaScript 函数
```javascript
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

// 复制 URL
const copyImageUrl = async (url) => {
  try {
    await navigator.clipboard.writeText(window.location.origin + url);
    showToast('URL 已复制到剪贴板');
  } catch (e) {
    //  fallback
    const input = document.createElement('input');
    input.value = window.location.origin + url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    showToast('URL 已复制到剪贴板');
  }
};

// 插入到 Markdown
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

// 显示提示
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

#### 修改 `renderAssets()`
```javascript
const renderAssets = (files) => {
  const list = document.getElementById('assets-list');
  if (files.length === 0) {
    list.innerHTML = '<div style="color:#6c757d;font-size:13px;">暂无图片资源</div>';
    return;
  }
  
  list.innerHTML = files.map((f, i) => `
    <div class="asset-item">
      <img src="${esc(f.url)}" alt="${esc(f.name)}" title="${esc(f.name)}" 
           onclick="previewImage('${esc(f.url)}', '${esc(f.name)}')">
      <div class="asset-name">${esc(f.name)}</div>
      <div class="asset-actions">
        <button onclick="copyImageUrl('${esc(f.url)}')" title="复制 URL">📋</button>
        <button onclick="insertImageToMarkdown('${esc(f.url)}', '${esc(f.name)}')" title="插入到题面">📝</button>
        <button onclick="deleteAsset('${esc(editingId)}','${esc(f.name)}')" title="删除">🗑️</button>
      </div>
    </div>
  `).join('');
};
```

## 3. 批量导入图片

### 当前状态
- 已支持多文件选择上传
- 缺少进度指示和批量操作

### 增强功能

#### 3.1 上传进度指示器
```html
<!-- 进度条 -->
<div id="upload-progress" class="hidden">
  <div class="progress-bar">
    <div class="progress-fill" style="width: 0%"></div>
  </div>
  <div class="progress-text">上传中... 0%</div>
</div>
```

```css
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
```

#### 3.2 修改 `uploadAssets()` 函数
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
      const result = JSON.parse(xhr.responseText);
      if (result.error) {
        alert(result.error);
      } else {
        loadAssets(editingId);
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

#### 3.3 批量操作按钮（未来增强）
- 全选/取消全选功能
- 批量删除选中图片
- **当前版本暂不实现**

## 4. 从 URL 导入图片

### 后端改动

#### 新增 API 接口
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
    
    // 检查题目是否存在
    if (!sql.get.get(problemId)) {
      return res.status(404).json({ error: `题目 ${problemId} 不存在` });
    }
    
    // 下载图片
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(400).json({ error: `下载失败: ${response.status}` });
    }
    
    // 获取文件名
    const urlPath = new URL(url).pathname;
    const filename = path.basename(urlPath) || 'imported-image.png';
    
    // 确保目录存在
    const dir = path.join(config.uploadDir, problemId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // 保存文件
    const filePath = path.join(dir, filename);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(buffer));
    
    // 记录到数据库
    const stats = fs.statSync(filePath);
    sql.insertAsset.run(
      problemId,
      filename,
      filename,
      stats.size,
      response.headers.get('content-type') || 'image/png'
    );
    
    res.json({ 
      message: '导入成功', 
      file: `/api/assets/${problemId}/${filename}` 
    });
  } catch (err) {
    console.error('从 URL 导入图片失败:', err);
    res.status(500).json({ error: '导入失败', detail: err.message });
  }
});
```

### 前端改动

#### HTML 结构
```html
<!-- URL 导入区域 -->
<div class="url-import-section">
  <div class="form-row">
    <div class="form-group" style="flex: 3;">
      <input type="text" id="image-url-input" placeholder="输入图片 URL，如 https://example.com/image.png">
    </div>
    <div class="form-group" style="flex: 1;">
      <button class="btn btn-primary" onclick="importFromUrl()">导入</button>
    </div>
  </div>
</div>
```

#### JavaScript 函数
```javascript
const importFromUrl = async () => {
  if (!editingId) return;
  
  const input = document.getElementById('image-url-input');
  const url = input.value.trim();
  
  if (!url) {
    alert('请输入图片 URL');
    return;
  }
  
  try {
    const res = await fetch(`/api/problems/${editingId}/assets/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    
    const result = await res.json();
    if (result.error) {
      alert(result.error);
    } else {
      input.value = '';
      loadAssets(editingId);
    }
  } catch (e) {
    alert('导入失败: ' + e.message);
  }
};
```

## 数据库改动

当前版本无需数据库改动。

## 文件清单

### 前端文件
- `public/index.html` - 主要修改文件

### 后端文件
- `src/routes/problems.js` - 新增 URL 导入 API

## 测试要点

1. **新建题目时图片上传**
   - 验证图片上传区域在新建时显示为禁用状态
   - 验证保存题目后图片上传区域启用
   - 验证提示信息正确显示

2. **图片管理功能**
   - 验证点击图片弹出预览
   - 验证复制 URL 功能
   - 验证插入 Markdown 功能
   - 验证 ESC 关闭预览

3. **批量导入**
   - 验证上传进度显示
   - 验证多文件上传成功
   - 验证批量操作按钮

4. **URL 导入**
   - 验证有效 URL 导入成功
   - 验证无效 URL 错误处理
   - 验证文件名正确处理

## 实现优先级

1. **P0**：新建题目时支持图片上传（用户体验关键）
2. **P1**：图片管理功能增强（预览、复制、插入）
3. **P1**：URL 导入功能
4. **P1**：上传进度指示器

### 未来增强（暂不实现）
- 图片排序功能
- 批量操作（全选、批量删除）
