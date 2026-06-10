# Scratch 判题系统

## 项目概述

基于 scratch-vm 的 Scratch 3.0 程序自动判题系统，参考 GESP 编程竞赛的判题方式。接收 sb3 文件，修改输入变量，通过 scratch-vm 无头运行程序，检查输出变量是否符合预期结果。

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
│   └── default.js         # 全局配置（端口、默认限制、上传限制）
├── md/                    # 变更记录与计划
│   ├── change/            # 变更记录（CHANGELOG-日期-简述.md）
│   └── plan/              # 修改计划（PLAN-日期-简述.md）
├── problems/              # 题目配置（每题一个 JSON）
│   ├── assets/            # 题目图片资源（按题目 ID 建子目录）
│   ├── example.json       # 标量示例：两数之和
│   ├── one-to-n.json      # 列表示例：输出1到n
│   └── max.json           # 列表示例：数组中最大的数
├── public/
│   └── index.html         # 前端测试页面（含 Markdown 渲染、筛选、图片上传）
├── src/
│   ├── verdict.js         # 判定常量 AC/WA/TLE/MLE/RE
│   ├── sb3Parser.js       # SB3 解压、变量查找/修改、重新打包
│   ├── judge.js           # 核心判题器（VM 生命周期、执行监控）
│   └── routes/
│       ├── judge.js       # 判题路由
│       └── problems.js    # 题目管理 CRUD + 图片上传 + 筛选路由
└── test/
    └── test.judge.js      # 测试脚本
```

## 常用命令

```bash
npm start                  # 启动服务器（端口 3000）
npm test                   # 运行测试
node test/test.judge.js <sb3路径> <题目ID>  # 指定文件测试
```

## API 接口

### 判题接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/judge` | 判题（multipart/form-data: file + problemId） |
| GET | `/api/health` | 健康检查 |

### 题目管理接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/problems` | 获取题目列表，支持筛选参数 |
| GET | `/api/problems/:id` | 获取单个题目详情（含测试用例） |
| POST | `/api/problems` | 创建新题目（JSON body） |
| PUT | `/api/problems/:id` | 更新题目（JSON body） |
| DELETE | `/api/problems/:id` | 删除题目（同时删除图片资源） |

### 题目图片资源接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/problems/:id/assets` | 上传图片（multipart/form-data，字段名 `images`） |
| GET | `/api/problems/:id/assets` | 获取题目图片列表 |
| DELETE | `/api/problems/:id/assets/:filename` | 删除指定图片 |
| GET | `/api/problems/assets/:id/:filename` | 访问图片文件（静态服务） |

### 筛选参数

`GET /api/problems` 支持以下查询参数：

| 参数 | 说明 | 示例 |
|------|------|------|
| `category` | 按分类精确匹配 | `?category=GESP-1` |
| `difficulty` | 按难度精确匹配 | `?difficulty=easy` |
| `source` | 按来源精确匹配 | `?source=真题` |
| `tag` | 按标签模糊匹配 | `?tag=循环` |

多个参数可组合使用：`?category=GESP-1&source=真题`

### 前端页面

访问 `http://localhost:3000/` 打开前端测试页面，支持：
- 题目管理（CRUD + 分类/标签）
- 题面 Markdown 渲染（支持图片）
- 题目筛选（按分类/难度/来源/标签）
- 图片资源上传管理
- 判题提交与结果展示

## 题目配置格式

```json
{
  "id": "problem-id",
  "name": "题目名称",
  "description": "简短描述（列表展示用）",
  "content": "# 题目标题\n\n完整题面，支持 **Markdown** 格式\n\n![图片](/api/problems/assets/problem-id/image.png)",
  "category": "GESP-1",
  "difficulty": "easy",
  "source": "真题",
  "tags": ["变量", "循环"],
  "timeLimit": 5000,
  "stepLimit": 100000,
  "testCases": [
    {
      "input": { "变量名": "值" },
      "output": { "变量名": "期望值" }
    }
  ]
}
```

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | ✅ | 唯一标识，只允许字母/数字/连字符/下划线 |
| `name` | ✅ | 题目名称 |
| `description` | ❌ | 简短描述（纯文本，列表展示用） |
| `content` | ❌ | 完整题面（Markdown 格式，前端渲染，优先级高于 description） |
| `category` | ❌ | 分类，如 `GESP-1`~`GESP-8`、`mock` |
| `difficulty` | ❌ | 难度：`easy`、`medium`、`hard` |
| `source` | ❌ | 来源：`真题`、`模拟题`、`自编` |
| `tags` | ❌ | 标签数组，如 `["循环", "列表"]` |
| `timeLimit` | ❌ | 时间限制（ms），覆盖全局默认值 |
| `stepLimit` | ❌ | 步数限制，覆盖全局默认值 |
| `testCases` | ✅ | 测试用例数组，非空 |

### 测试用例规则

- `input` 中值为数组时表示列表，值为标量时表示普通变量
- `output` 同理，系统会根据期望值类型自动匹配变量或列表
- `content` 中的图片路径格式：`/api/problems/assets/{题目ID}/{文件名}`

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

## 添加新题目

### 方式一：通过 API

```bash
curl -X POST http://localhost:3000/api/problems \
  -H "Content-Type: application/json" \
  -d '{"id":"my-problem","name":"我的题目","testCases":[{"input":{"n":5},"output":{"ans":25}}]}'
```

### 方式二：通过前端页面

访问 `http://localhost:3000/`，在题目管理区点击"新建题目"。

### 方式三：手动创建文件

在 `problems/` 目录下创建 JSON 文件，重启服务器后自动生效。

### 注意事项

- `input` 中的变量名/列表名必须与 sb3 程序中的名称完全一致（区分大小写）

## 开发约定

- 所有文档、注释使用中文
- 使用 CommonJS 模块系统（`require`/`module.exports`）
- 判题器每个测试用例使用独立 VM 实例，确保隔离性
- **变更记录**：每次修改完成后，写入 `md/change/CHANGELOG-{日期}-{简述}.md`，记录变更背景、内容、文件清单和验证结果
- **修改计划**：执行修改前，将计划写入 `md/plan/PLAN-{日期}-{简述}.md`，方便用户查看和确认
