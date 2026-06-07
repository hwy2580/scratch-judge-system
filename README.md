# Scratch 判题系统

基于 scratch-vm 的 Scratch 3.0 程序自动判题系统，参考 GESP 编程竞赛的判题方式。

## 功能特性

- 支持 sb3 文件上传和自动判题
- 支持变量输入/输出的自动替换和检测
- 支持列表类型的输入输出
- 多种判定结果：AC（通过）、WA（答案错误）、TLE（超时）、MLE（超内存）、RE（运行时错误）
- 支持全局默认限制和每题自定义限制
- HTTP API 接口，易于集成

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务器

```bash
npm start
# 或
node server.js
```

服务器默认在 3000 端口启动。

### 3. 配置题目

在 `problems/` 目录下创建 JSON 文件。

**标量变量示例** (`problems/example.json`)：

```json
{
  "id": "example",
  "name": "两数之和",
  "description": "给定两个数 a 和 b，计算它们的和并存入变量 ans",
  "timeLimit": 5000,
  "stepLimit": 100000,
  "testCases": [
    {
      "input": { "a": 3, "b": 5 },
      "output": { "ans": 8 }
    },
    {
      "input": { "a": 10, "b": 20 },
      "output": { "ans": 30 }
    }
  ]
}
```

**列表变量示例** (`problems/one-to-n.json`)：

```json
{
  "id": "one-to-n",
  "name": "输出1到n",
  "description": "给定一个数 n，将 1 到 n 的所有整数依次存入列表 result 中",
  "timeLimit": 5000,
  "stepLimit": 200000,
  "testCases": [
    {
      "input": { "n": 5 },
      "output": { "result": ["1", "2", "3", "4", "5"] }
    },
    {
      "input": { "n": 1 },
      "output": { "result": ["1"] }
    }
  ]
}
```

**字段说明：**
- `id`: 题目唯一标识
- `name`: 题目名称
- `description`: 题目描述（可选）
- `timeLimit`: 超时时间（毫秒），覆盖全局默认值
- `stepLimit`: 最大执行步数，覆盖全局默认值
- `testCases`: 测试用例数组
  - `input`: 输入映射（变量名 -> 初始值）。**值为数组时表示列表，值为标量时表示普通变量**
  - `output`: 输出映射（变量名 -> 期望值）。格式同 input

### 4. 提交判题

```bash
curl -X POST http://localhost:3000/api/judge \
  -F "file=@your_project.sb3" \
  -F "problemId=example"
```

## API 接口

### POST /api/judge

提交 sb3 文件进行判题。

**请求参数（multipart/form-data）：**
- `file`: sb3 文件（必填）
- `problemId`: 题目 ID（必填）

**响应示例：**

```json
{
  "verdict": "AC",
  "details": [
    {
      "case": 1,
      "verdict": "AC",
      "input": { "a": 3, "b": 5 },
      "expected": { "ans": 8 },
      "actual": { "ans": 8 },
      "time": 123,
      "steps": 45678,
      "error": null
    }
  ],
  "totalTime": 123,
  "totalSteps": 45678
}
```

### GET /api/judge/problems

获取所有可用题目列表。

### GET /api/health

健康检查接口。

## 判定结果说明

| 结果 | 含义 | 说明 |
|------|------|------|
| AC | 通过 | 所有测试用例输出匹配 |
| WA | 答案错误 | 至少一个测试用例输出不匹配 |
| TLE | 超时 | 执行时间或步数超过限制 |
| MLE | 超内存 | 内存使用超过限制 |
| RE | 运行时错误 | 执行过程中发生异常 |

## 配置说明

编辑 `config/default.js` 修改全局配置：

```javascript
module.exports = {
  port: 3000,                    // 服务器端口
  defaultTimeLimit: 10000,       // 默认超时时间（毫秒）
  defaultStepLimit: 500000,      // 默认最大执行步数
  defaultMemoryLimit: 256,       // 默认最大内存（MB）
  problemsDir: 'problems'        // 题目配置目录
};
```

## Scratch 程序规范

### 输入变量

在 Scratch 程序中创建与题目配置中 `input` 对应的变量或列表。判题系统会在程序运行前自动设置它们的初始值。

- **标量输入**：创建同名变量，判题系统自动设置初始值
- **列表输入**：创建同名列表，判题系统自动填充列表内容

### 输出变量

在 Scratch 程序中创建与题目配置中 `output` 对应的变量或列表。程序运行结束后，判题系统会读取它们的值并与期望值比较。

### 比较规则

- 标量比较：将值转为字符串后比较（Scratch 中 `"5"` 和 `5` 视为相等）
- 列表比较：逐项转为字符串后比较，长度和内容必须一致

### 示例

**标量题目：**
```json
{
  "input": { "a": 3, "b": 5 },
  "output": { "ans": 8 }
}
```

Scratch 程序需要：
1. 创建变量 `a`、`b`、`ans`
2. 使用 `a` 和 `b` 进行计算
3. 将结果存入 `ans`

**列表题目：**
```json
{
  "input": { "n": 5 },
  "output": { "result": ["1", "2", "3", "4", "5"] }
}
```

Scratch 程序需要：
1. 创建变量 `n`（输入）、列表 `result`（输出）
2. 循环 1 到 `n`，将每个数添加到 `result` 列表

## 项目结构

```
scratch-judge-system/
├── package.json
├── server.js              # 服务器入口
├── config/
│   └── default.js         # 全局配置
├── problems/              # 题目配置
│   ├── example.json       # 标量示例：两数之和
│   └── one-to-n.json      # 列表示例：输出1到n
├── src/
│   ├── judge.js           # 判题核心
│   ├── sb3Parser.js       # SB3 解析器
│   ├── verdict.js         # 判定常量
│   └── routes/
│       └── judge.js       # API 路由
└── test/
    └── test.judge.js      # 测试脚本
```

## 测试

```bash
# 启动服务器
node server.js

# 运行测试（需要提供 sb3 文件路径）
node test/test.judge.js path/to/project.sb3 example
```

## 注意事项

1. sb3 文件必须是有效的 Scratch 3.0 项目文件
2. 变量名区分大小写
3. 超时判断同时支持时间和步数两种限制
4. 每个测试用例使用独立的 VM 实例，确保隔离性
5. 列表类型的输入输出使用数组格式
