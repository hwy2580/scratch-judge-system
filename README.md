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

### 一键启动（推荐）

```bash
# Linux/macOS
./start.sh

# Windows
start.bat
```

### 一键停止

```bash
# Linux/macOS
./stop.sh

# Windows
stop.bat
```

### 手动启动

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
