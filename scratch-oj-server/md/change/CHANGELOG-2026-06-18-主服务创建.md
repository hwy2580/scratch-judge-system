# 变更记录：主服务创建

## 日期
2026-06-18

## 变更背景
创建 Scratch OJ 主服务项目（scratch-oj-server），作为判题系统的前端和题目管理服务。主服务通过 HTTP API 调用独立的评测机服务进行判题。

## 技术栈
- Express 5.x + better-sqlite3 + multer 2.x
- SQLite 数据库存储题目和图片元数据
- 图片文件存储在 uploads/ 目录

## 变更内容

### 1. 项目初始化
- 创建项目目录结构
- 配置 package.json 和依赖
- 配置 .gitignore

### 2. 数据库层
- 创建 SQLite 数据库 schema（problems 表、assets 表）
- 实现数据库连接模块（WAL 模式、外键约束）
- 创建索引优化查询性能

### 3. API 路由
- 题目管理路由（CRUD + 筛选）
- 图片资源路由（上传、列表、删除）
- 判题代理路由（转发到评测机）
- 健康检查路由（含评测机连通性检测）

### 4. 中间件
- 参数校验中间件（validateProblem）

### 5. 服务客户端
- 评测机 HTTP 客户端（judgeClient.js）

### 6. 前端页面
- 迁移前端页面（public/index.html）
- 更新图片路径为新的静态服务路径

### 7. 文档
- 创建 CLAUDE.md 项目文档

## 文件清单

### 新增
- `package.json`
- `config/default.js`
- `src/db/schema.sql`
- `src/db/index.js`
- `src/routes/problems.js`
- `src/routes/judge.js`
- `src/services/judgeClient.js`
- `src/middleware/validate.js`
- `server.js`
- `public/index.html`
- `CLAUDE.md`
- `.gitignore`
- `data/.gitkeep`
- `uploads/.gitkeep`
- `md/change/CHANGELOG-2026-06-18-主服务创建.md`

## 验证结果
- [ ] 服务器正常启动（端口 3000）
- [ ] 前端页面可访问
- [ ] 题目 CRUD 接口正常
- [ ] 图片上传接口正常
- [ ] 健康检查接口正常
- [ ] 评测机连通性检测正常
