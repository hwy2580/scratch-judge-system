# Scratch 判题系统 Monorepo

## 项目概述

本仓库包含 Scratch 判题系统的两个核心项目：

- **scratch-judge-server** — 无状态评测机，负责执行 Scratch 程序并判定结果
- **scratch-oj-server** — 主服务，负责题目管理、图片存储和评测机代理

## 项目结构

```
scratch-judge-system/
├── scratch-judge-server/    # 评测机（端口 3001）
│   ├── server.js
│   ├── src/
│   ├── config/
│   └── test/
└── scratch-oj-server/       # 主服务（端口 3000）
    ├── server.js
    ├── src/
    ├── public/
    └── test/
```

## 快速开始

### 启动评测机

```bash
cd scratch-judge-server
npm install
npm start
```

### 启动主服务

```bash
cd scratch-oj-server
npm install
npm start
```

### 运行测试

```bash
# 评测机测试
cd scratch-judge-server && npm test

# 主服务测试
cd scratch-oj-server && npm test
```

## 开发约定

- 每个子项目独立维护自己的 `package.json` 和 `node_modules`
- 所有变更通过父仓库提交
- 文档和注释使用中文
