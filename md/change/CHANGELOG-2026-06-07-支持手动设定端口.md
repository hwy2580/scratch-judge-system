# 变更记录：支持手动设定启动端口

**日期**：2026-06-07

## 变更内容

服务器端口支持三种方式指定，优先级从高到低：

1. **命令行参数**：`node server.js --port 8080`
2. **环境变量**：`PORT=8080 node server.js`
3. **配置文件默认值**：`config/default.js` 中的 `port`（默认 3000）

## 修改文件

| 文件 | 变更 |
|------|------|
| `config/default.js` | `port` 改为读取 `process.env.PORT`，未设置时回退到 3000 |
| `server.js` | 解析 `--port` 命令行参数，优先级最高 |

## 验证

- ✅ `node server.js --port 8080` → 监听 8080，健康检查正常
