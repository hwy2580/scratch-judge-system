# Monorepo 重组设计文档

## 概述

将评测机（scratch-judge-system）和主服务（scratch-oj-server）合并到一个父仓库下，形成 monorepo 结构。

## 目标结构

```
E:\CODE\scratch-judge-system\          ← 父仓库（统一管理）
├── .git\
├── CLAUDE.md                           ← monorepo 总览文档
├── README.md                           ← 项目说明
├── scratch-judge-server\               ← 评测机
│   ├── .gitignore
│   ├── CLAUDE.md
│   ├── package.json
│   ├── server.js
│   ├── src\
│   │   ├── judge.js
│   │   ├── sb3Parser.js
│   │   ├── verdict.js
│   │   └── routes\judge.js
│   ├── config\default.js
│   └── test\
│       ├── test.judge.js
│       └── test.replaceFirstAssignments.js
└── scratch-oj-server\                  ← 主服务（无独立 .git）
    ├── .gitignore
    ├── CLAUDE.md
    ├── package.json
    ├── server.js
    ├── src\
    │   ├── db\
    │   ├── middleware\
    │   ├── routes\
    │   └── services\
    ├── public\index.html
    ├── test\api.test.js
    ├── docs\
    └── md\
```

## 操作步骤

### 步骤 1：移动评测机文件到子目录

在当前仓库创建 `scratch-judge-server` 子目录，将所有评测机文件移入：

```bash
cd E:/CODE/scratch-judge-system
mkdir scratch-judge-server
git mv server.js scratch-judge-server/
git mv src/ scratch-judge-server/
git mv config/ scratch-judge-server/
git mv test/ scratch-judge-server/
git mv package.json scratch-judge-server/
git mv package-lock.json scratch-judge-server/
git mv .gitignore scratch-judge-server/
git mv CLAUDE.md scratch-judge-server/
```

### 步骤 2：移动主服务到同级目录

将 `scratch-oj-server` 整个文件夹移入父仓库，并删除其独立的 `.git` 目录：

```bash
# 移动整个文件夹
mv E:/CODE/scratch-oj-server E:/CODE/scratch-judge-system/scratch-oj-server

# 删除主服务的 .git 目录（纳入父仓库管理）
rm -rf E:/CODE/scratch-judge-system/scratch-oj-server/.git

# 添加到父仓库
git add scratch-oj-server/
```

### 步骤 3：更新顶层文档

- 更新 `CLAUDE.md` 为 monorepo 总览
- 新增 `README.md` 说明项目结构

### 步骤 4：提交

```bash
git add -A
git commit -m "refactor: 重组为 monorepo 结构，两个项目纳入统一管理"
```

## 注意事项

1. **主服务的提交历史会丢失** — 因为删除了 `.git`，但文件内容完整保留
2. **评测机的历史可追踪** — 通过 `git log --follow` 追踪文件移动
3. **两个项目完全独立** — 各自有自己的 `package.json`、`node_modules`、测试
4. **统一版本管理** — 所有变更通过父仓库提交

## 日常使用

```bash
# 启动评测机
cd scratch-judge-server && npm start

# 启动主服务
cd scratch-oj-server && npm start

# 运行测试
cd scratch-judge-server && npm test
cd scratch-oj-server && npm test
```

## 文件清单

### 移动的文件（评测机）
- `server.js` → `scratch-judge-server/server.js`
- `src/` → `scratch-judge-server/src/`
- `config/` → `scratch-judge-server/config/`
- `test/` → `scratch-judge-server/test/`
- `package.json` → `scratch-judge-server/package.json`
- `package-lock.json` → `scratch-judge-server/package-lock.json`
- `.gitignore` → `scratch-judge-server/.gitignore`
- `CLAUDE.md` → `scratch-judge-server/CLAUDE.md`

### 移动的文件（主服务）
- `E:\CODE\scratch-oj-server\*` → `scratch-oj-server\*`

### 新增的文件
- `CLAUDE.md` — monorepo 总览文档
- `README.md` — 项目说明
