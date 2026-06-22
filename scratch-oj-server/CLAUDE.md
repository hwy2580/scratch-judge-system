# Scratch OJ 主服务

## 项目概述

Scratch OJ 系统的主服务，负责题目管理、图片资源管理和判题调度。通过 HTTP API 调用独立的评测机服务进行判题。

## 技术栈

- **运行环境**: Node.js (CommonJS)
- **Web 框架**: Express 5.x
- **数据库**: SQLite (better-sqlite3)
- **文件上传**: multer 2.x

## 项目结构

```
scratch-oj-server/
├── src/
│   ├── db/            # 数据库连接和 schema
│   ├── routes/        # API 路由
│   ├── services/      # 外部服务客户端
│   └── middleware/    # 中间件
├── config/            # 配置文件
├── public/            # 前端页面
├── data/              # SQLite 数据库文件
├── uploads/           # 图片上传目录
└── server.js          # 入口
```

## 常用命令

```bash
npm start              # 启动服务器
npm run dev            # 开发模式（自动重启）
```

## API 接口

### 题目管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/problems | 列表（支持筛选） |
| GET | /api/problems/:id | 详情 |
| POST | /api/problems | 创建 |
| PUT | /api/problems/:id | 更新 |
| DELETE | /api/problems/:id | 删除 |

### 图片资源

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/problems/:id/assets | 上传 |
| GET | /api/problems/:id/assets | 列表 |
| DELETE | /api/problems/:id/assets/:filename | 删除 |
| GET | /api/assets/:id/:filename | 访问文件 |

### 判题

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/judge | 代理转发到评测机 |

### 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/health | 服务状态 + 评测机连通性 |

## 配置

通过环境变量或 `config/default.js` 配置：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| PORT | 服务端口 | 3000 |
| JUDGE_URL | 评测机地址 | http://localhost:3001 |
| DB_PATH | 数据库路径 | ./data/judge.db |

## 开发约定

- 所有文档、注释使用中文
- 使用 CommonJS 模块系统（`require`/`module.exports`）
- **变更记录**：每次修改完成后，写入 `md/change/CHANGELOG-{日期}-{简述}.md`
- **修改计划**：执行修改前，将计划写入 `md/plan/PLAN-{日期}-{简述}.md`
