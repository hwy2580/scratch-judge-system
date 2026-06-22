# Monorepo 重组实现计划

> **致智能体工作者：** 必须使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 技能逐任务实施本计划。步骤使用 checkbox (`- [ ]`) 语法进行跟踪。

**目标：** 将评测机和主服务合并到一个父仓库下，形成 monorepo 结构。

**架构：** 当前仓库作为父仓库，评测机文件移入 `scratch-judge-server/` 子目录，主服务整体移入 `scratch-oj-server/` 子目录并删除其独立 `.git`。

**技术栈：** Git 文件移动操作

## 全局约束

- 使用 `git mv` 移动评测机文件以保留历史追踪
- 主服务删除 `.git` 后纳入父仓库统一管理
- 每个子项目保持独立的 `package.json` 和 `node_modules`
- 所有文档使用中文

---

### Task 1: 移动评测机文件到子目录

**文件：**
- 移动: `server.js` → `scratch-judge-server/server.js`
- 移动: `src/` → `scratch-judge-server/src/`
- 移动: `config/` → `scratch-judge-server/config/`
- 移动: `test/` → `scratch-judge-server/test/`
- 移动: `package.json` → `scratch-judge-server/package.json`
- 移动: `package-lock.json` → `scratch-judge-server/package-lock.json`
- 移动: `.gitignore` → `scratch-judge-server/.gitignore`
- 移动: `CLAUDE.md` → `scratch-judge-server/CLAUDE.md`

**接口：**
- 无依赖

- [ ] **步骤 1: 创建子目录并移动文件**

```bash
cd E:/CODE/scratch-judge-system
mkdir -p scratch-judge-server
git mv server.js scratch-judge-server/
git mv src/ scratch-judge-server/
git mv config/ scratch-judge-server/
git mv test/ scratch-judge-server/
git mv package.json scratch-judge-server/
git mv package-lock.json scratch-judge-server/
git mv .gitignore scratch-judge-server/
git mv CLAUDE.md scratch-judge-server/
```

- [ ] **步骤 2: 验证文件移动成功**

```bash
ls -la scratch-judge-server/
```

预期：看到所有评测机文件

- [ ] **步骤 3: 提交**

```bash
git add -A
git commit -m "refactor: 移动评测机文件到 scratch-judge-server 子目录"
```

---

### Task 2: 移动主服务到同级目录

**文件：**
- 移动: `E:\CODE\scratch-oj-server\*` → `scratch-oj-server\*`
- 删除: `scratch-oj-server\.git`

**接口：**
- 依赖: Task 1 完成

- [ ] **步骤 1: 移动主服务文件夹**

```bash
cd E:/CODE/scratch-judge-system
mv E:/CODE/scratch-oj-server E:/CODE/scratch-judge-system/scratch-oj-server
```

- [ ] **步骤 2: 删除主服务的 .git 目录**

```bash
rm -rf E:/CODE/scratch-judge-system/scratch-oj-server/.git
```

- [ ] **步骤 3: 添加到父仓库**

```bash
cd E:/CODE/scratch-judge-system
git add scratch-oj-server/
```

- [ ] **步骤 4: 验证文件结构**

```bash
ls -la scratch-oj-server/
```

预期：看到主服务所有文件，无 `.git` 目录

- [ ] **步骤 5: 提交**

```bash
git commit -m "refactor: 移动主服务到 scratch-oj-server 子目录，纳入父仓库管理"
```

---

### Task 3: 更新顶层文档

**文件：**
- 修改: `CLAUDE.md`（新建）
- 创建: `README.md`

**接口：**
- 依赖: Task 1, Task 2 完成

- [ ] **步骤 1: 创建顶层 CLAUDE.md**

```markdown
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
```

- [ ] **步骤 2: 创建 README.md**

```markdown
# Scratch 判题系统

基于 scratch-vm 的 Scratch 3.0 程序判题系统，包含评测机和主服务两个独立项目。

## 项目组成

| 项目 | 说明 | 端口 |
|------|------|------|
| scratch-judge-server | 无状态评测机 | 3001 |
| scratch-oj-server | 主服务（题目管理 + 评测代理） | 3000 |

## 技术栈

- **运行环境**: Node.js (CommonJS)
- **Web 框架**: Express 5.x
- **Scratch 引擎**: scratch-vm 5.x
- **数据库**: SQLite (better-sqlite3)

## 快速开始

```bash
# 安装依赖
cd scratch-judge-server && npm install
cd ../scratch-oj-server && npm install

# 启动服务
cd scratch-judge-server && npm start    # 终端 1
cd scratch-oj-server && npm start       # 终端 2
```

访问 http://localhost:3000 打开管理界面。

## 文档

- [评测机文档](scratch-judge-server/CLAUDE.md)
- [主服务文档](scratch-oj-server/CLAUDE.md)
```

- [ ] **步骤 3: 验证文档**

```bash
cat CLAUDE.md
cat README.md
```

预期：文档内容正确

- [ ] **步骤 4: 提交**

```bash
git add CLAUDE.md README.md
git commit -m "docs: 添加 monorepo 顶层文档"
```

---

### Task 4: 最终验证

**文件：**
- 无修改

**接口：**
- 依赖: Task 1, Task 2, Task 3 完成

- [ ] **步骤 1: 验证目录结构**

```bash
cd E:/CODE/scratch-judge-system
find . -maxdepth 3 -type f -name "*.js" -o -name "*.json" -o -name "*.md" | sort
```

预期：看到两个子项目的文件都在正确位置

- [ ] **步骤 2: 验证评测机可启动**

```bash
cd E:/CODE/scratch-judge-system/scratch-judge-server
npm install
npm start &
sleep 2
curl http://localhost:3001/api/health
kill %1
```

预期：返回 `{"status":"ok",...}`

- [ ] **步骤 3: 验证主服务可启动**

```bash
cd E:/CODE/scratch-judge-system/scratch-oj-server
npm install
npm start &
sleep 2
curl http://localhost:3000/api/health
kill %1
```

预期：返回 `{"status":"ok",...}`

- [ ] **步骤 4: 验证 git 历史可追踪**

```bash
cd E:/CODE/scratch-judge-system
git log --follow scratch-judge-server/server.js | head -5
```

预期：看到评测机的提交历史

- [ ] **步骤 5: 最终提交**

```bash
git add -A
git commit -m "refactor: 完成 monorepo 重组"
```

---

## 实现顺序

1. Task 1: 移动评测机文件到子目录
2. Task 2: 移动主服务到同级目录
3. Task 3: 更新顶层文档
4. Task 4: 最终验证
