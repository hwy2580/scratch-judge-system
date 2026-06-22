# 变更记录：扩展题面格式、图片存储与分类检索

**日期**：2026-06-07

## 背景

GESP Scratch 考试的题目包含图片（积木截图、流程图等），且需要按级别和类型分类管理。原系统仅支持纯文本描述和扁平列表。

## 变更内容

### 1. 题目 JSON 格式扩展

新增以下可选字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `content` | string | 完整题面，Markdown 格式（优先级高于 description） |
| `category` | string | 分类，如 `GESP-1`~`GESP-8`、`mock` |
| `difficulty` | string | 难度：`easy`、`medium`、`hard` |
| `source` | string | 来源：`真题`、`模拟题`、`自编` |
| `tags` | string[] | 标签数组，如 `["循环", "列表"]` |

现有三个示例题目均已补充新字段。

### 2. 图片资源管理

- 新增目录 `problems/assets/{题目ID}/` 存储图片
- 新增 API：`POST /api/problems/:id/assets`（上传）、`GET`（列表）、`DELETE`（删除）
- 通过 Express 静态中间件暴露图片访问
- 限制：PNG/JPG/SVG/GIF，单文件 5MB，每次最多 10 张

### 3. 题目检索

`GET /api/problems` 支持查询参数：
- `?category=GESP-1` 按分类
- `?difficulty=easy` 按难度
- `?source=真题` 按来源
- `?tag=循环` 按标签（模糊匹配）
- 多参数可组合

### 4. 前端页面更新

- 引入 marked.js + DOMPurify CDN，支持 Markdown 题面渲染
- 新增筛选栏（分类/难度/来源/标签）
- 题目列表新增分类/难度/来源标签列
- 编辑表单新增：分类下拉、难度、来源、标签输入（Enter 添加）、Markdown 题面编辑器
- 图片资源管理 UI（上传、预览、删除，支持拖拽）

## 修改文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `config/default.js` | 修改 | 新增 assetsDir、图片上传限制配置 |
| `src/routes/problems.js` | 重写 | 新增字段校验、筛选、图片上传/列表/删除 |
| `server.js` | 修改 | 新增图片资源静态服务路由 |
| `problems/example.json` | 修改 | 添加分类字段 |
| `problems/one-to-n.json` | 修改 | 添加分类字段 |
| `problems/max.json` | 修改 | 添加分类字段 |
| `public/index.html` | 重写 | Markdown 渲染、筛选、图片管理、表单扩展 |
| `CLAUDE.md` | 修改 | 补充新 API 和字段文档 |

## 验证结果

- ✅ 题目列表返回新字段
- ✅ 按分类筛选（`?category=GESP-1`）返回 3 个题目
- ✅ 按标签筛选（`?tag=循环`）返回 2 个题目
- ✅ 图片上传、列表、删除均正常
- ✅ 向后兼容：无新字段的题目仍正常工作
