# Scratch 评测机

## 项目概述

基于 scratch-vm 的 Scratch 3.0 程序**无状态评测机**。接收 sb3 文件和测试配置，通过 scratch-vm 无头运行程序，检查输出变量是否符合预期结果。

本项目为纯判题服务，不管理题目数据。题目配置由调用方在请求中提供。

## 技术栈

- **运行环境**: Node.js (CommonJS)
- **Web 框架**: Express 5.x
- **文件上传**: multer 2.x
- **Scratch 引擎**: scratch-vm 5.x + scratch-storage 6.x
- **ZIP 处理**: jszip（scratch-vm 内置依赖）

## 项目结构

```
scratch-judge-system/
├── CLAUDE.md              # 本文件 - 项目上下文
├── server.js              # Express 服务器入口
├── config/
│   └── default.js         # 全局配置（端口、默认限制）
├── md/                    # 变更记录与计划
│   ├── change/            # 变更记录（CHANGELOG-日期-简述.md）
│   └── plan/              # 修改计划（PLAN-日期-简述.md）
├── src/
│   ├── verdict.js         # 判定常量 AC/WA/TLE/MLE/RE
│   ├── sb3Parser.js       # SB3 解压、变量查找/修改、重新打包
│   ├── judge.js           # 核心判题器（VM 生命周期、执行监控）
│   └── routes/
│       └── judge.js       # 判题路由
└── test/
    ├── test.judge.js      # 集成测试脚本
    └── test.replaceFirstAssignments.js  # 单元测试脚本
```

## 常用命令

```bash
npm start                  # 启动服务器（默认端口 3001）
npm test                   # 运行测试
npm run test:unit          # 运行单元测试
node test/test.judge.js <sb3路径> <题目ID>  # 指定文件测试
```

启动端口可通过 `--port` 参数或 `PORT` 环境变量覆盖。

## API 接口

### 判题接口

```
POST /api/judge
Content-Type: multipart/form-data
```

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | File | 是 | sb3 文件 |
| `config` | String | 是 | JSON 字符串，包含测试用例和限制参数 |

**config 字段结构：**

```json
{
  "testCases": [
    {
      "input": { "变量名": "值", "列表名": ["项1", "项2"] },
      "output": { "变量名": "期望值", "列表名": ["期望项1", "期望项2"] }
    }
  ],
  "timeLimit": 5000,
  "stepLimit": 100000
}
```

- `testCases`：必填，非空数组。`input` 和 `output` 必须为对象。
- `timeLimit`：可选，单用例超时时间（ms），默认 10000。
- `stepLimit`：可选，单用例最大执行步数，默认 500000。

**响应：**

```json
{
  "verdict": "AC",
  "details": [
    {
      "case": 1,
      "verdict": "AC",
      "input": { "n": 5 },
      "expected": { "ans": 25 },
      "actual": { "ans": 25 },
      "time": 12,
      "steps": 1,
      "error": null
    }
  ],
  "totalTime": 12,
  "totalSteps": 1
}
```

**错误响应：**

```json
{ "error": "错误信息" }
```

### 健康检查

```
GET /api/health
```

响应：`{ "status": "ok", "version": "2.0.0", "uptime": 123 }`

## 全局配置

配置文件 `config/default.js`，可通过环境变量或启动参数覆盖：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `port` | 3001 | 服务器端口（`--port` 参数或 `PORT` 环境变量） |
| `defaultTimeLimit` | 10000 | 默认超时时间（ms） |
| `defaultStepLimit` | 500000 | 默认最大执行步数 |
| `defaultMemoryLimit` | 256 | 默认最大内存（MB） |

## 判定结果

| 结果 | 含义 |
|------|------|
| AC | 通过 - 所有用例输出匹配 |
| WA | 答案错误 |
| TLE | 超时（墙钟时间或步数超限） |
| MLE | 超内存 |
| RE | 运行时错误 |

## 输入变量处理

Scratch 没有 `cin` 式输入机制，学生通过赋值积木手动设置输入变量（如 `设 n 为 5`）。这会覆盖判题器注入的测试数据。

### 解决方案：替换首次赋值字面量

对每个输入变量，按执行顺序找到其**第一次赋值**：
- VALUE 是字面量（数字/文本常量）→ 替换为测试数据
- VALUE 是表达式 → 跳过
- 后续对该变量的所有赋值 → 不处理

```
学生代码：设 n 为 5, 设 ans 为 n * n, 设 n 为 0
测试数据：n=10
结果：n 首次赋值替换为 10 → ans=100 → n 被设为 0（保留）
```

### 实现位置

- `src/sb3Parser.js`：`replaceFirstAssignments(project, inputs)` 函数
- `src/judge.js`：在 `parse()` 后、`setInputs()` 前调用

### SB3 积木结构关键点

- `data_setvariableto`：设置变量值积木
- `fields.VARIABLE[0]`：变量名
- `inputs.VALUE[1]`：字面量时为 `[类型常量, 值]`，表达式时为 `"blockId"` 字符串
- 积木通过 `next` 指针形成链表，C-block 通过 `inputs.SUBSTACK` 连接内部链

## scratch-vm 关键技术细节

### 导入方式

```js
const VirtualMachine = require('scratch-vm');            // 默认导出，直接用
const { ScratchStorage } = require('scratch-storage');   // 命名导出，必须解构
```

**踩坑记录**: scratch-storage v6 使用命名导出，直接 `require('scratch-storage')` 会得到一个对象而非构造函数。

### VM 生命周期

```js
vm = new VirtualMachine();
vm.attachStorage(new ScratchStorage());
vm.setTurboMode(true);
await vm.loadProject(sb3Buffer);  // 接受 Buffer
vm.start();       // 启动 setInterval 步进循环
vm.greenFlag();   // 触发绿旗脚本
// ... 等待执行完成 ...
vm.stopAll();     // 停止所有线程
vm.quit();        // 清除 setInterval（必须调用，否则进程不退出）
vm.clear();       // 释放 runtime 资源
```

### 事件监听顺序（重要）

**必须先注册事件监听器，再调用 `vm.start()` + `vm.greenFlag()`！**

简单程序（如 `设变量=值`）在一个 tick 内就执行完毕，`PROJECT_RUN_STOP` 事件会在 `start()` 同步执行期间触发。如果先 start 再监听，事件会丢失。

```js
// 正确顺序
vm.runtime.on('PROJECT_RUN_STOP', () => { /* 处理结果 */ });
vm.start();
vm.greenFlag();
```

### 变量存储结构差异

| 阶段 | 变量存储格式 |
|------|-------------|
| project.json（解析前） | `{ varId: [name, value] }` |
| VM 运行时（执行后） | `{ varId: Variable }` 其中 Variable 有 `.name` `.value` `.type` |

- VM 运行时中，标量和列表**都存储在 `target.variables`** 中
- 标量 `type === ''`，列表 `type === 'list'`
- **没有** `target.lists` 字段（那是 project.json 的格式）

### 比较规则

- 标量：转为字符串后比较（Scratch 中 `5` 和 `"5"` 视为相等）
- 列表：逐项转为字符串比较，长度和内容必须一致

### scratch-vm 日志抑制

无头模式下会输出大量渲染/音频警告，可通过 minilog 抑制：

```js
try {
  const minilog = require('minilog');
  minilog.disable();
} catch (e) {}
```

### 步数统计

通过拦截 `vm.runtime._step` 统计。但 turbo 模式下简单程序可能在单个 `_step` 中完成所有执行，此时 step=1。超时主要依赖墙钟时间控制。

### scratch-vm 版本注意事项

- scratch-vm@5.x 依赖 scratch-storage@4.x（嵌套在 node_modules/scratch-vm/node_modules/ 中）
- 顶层安装的 scratch-storage@6.x 与 scratch-vm 内部版本不同，但 API 兼容
- scratch-vm 的 `exports` 字段限制了子路径导入，不能 `require('scratch-vm/src/engine/variable')`

## 开发约定

- 所有文档、注释使用中文
- 使用 CommonJS 模块系统（`require`/`module.exports`）
- 判题器每个测试用例使用独立 VM 实例，确保隔离性
- **变更记录**：每次修改完成后，写入 `md/change/CHANGELOG-{日期}-{简述}.md`，记录变更背景、内容、文件清单和验证结果
- **修改计划**：执行修改前，将计划写入 `md/plan/PLAN-{日期}-{简述}.md`，方便用户查看和确认
