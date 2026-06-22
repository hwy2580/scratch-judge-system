# 变更记录：评测机改造

## 日期
2026-06-18

## 变更背景
将项目从"全功能 demo"改造为纯评测机，为后续拆分主服务做准备。评测机作为独立服务，只负责判题，不存储题目数据。

## 变更内容

### 1. 移除题目管理功能
- 删除 `src/routes/problems.js`（题目 CRUD 路由）
- 删除 `problems/` 目录（JSON 题目文件和图片资源）
- 删除 `public/` 目录（前端页面）

### 2. 重写判题路由
- 请求格式变更：`problemId` → `config`（JSON 字符串）
- config 包含 testCases、timeLimit、stepLimit
- 增强参数校验（config JSON 解析、testCases 格式检查）

### 3. 简化 server.js
- 移除题目管理路由注册
- 移除静态文件服务（前端、图片资源）
- 健康检查增加 version 和 uptime 字段
- 默认端口改为 3001

### 4. 简化配置
- 移除 problemsDir、assetsDir、图片上传限制等配置
- 只保留端口和判题默认限制

### 5. 更新测试
- 重写 `test/test.judge.js`，适配新 API 格式
- 保留 `test/test.replaceFirstAssignments.js`

### 6. 更新文档
- 更新 `CLAUDE.md` 为评测机定位
- 更新 `package.json` 元信息

## 文件清单

### 删除
- `src/routes/problems.js`
- `problems/example.json`
- `problems/one-to-n.json`
- `problems/max.json`
- `public/index.html`

### 修改
- `server.js`
- `config/default.js`
- `src/routes/judge.js`
- `test/test.judge.js`
- `package.json`
- `CLAUDE.md`

### 新增
- `md/change/CHANGELOG-2026-06-18-评测机改造.md`

## 验证结果
- [ ] 服务器正常启动
- [ ] 健康检查接口正常
- [ ] 判题接口参数校验正常
- [ ] 单元测试通过（test.replaceFirstAssignments.js）
