# 变更记录：解决输入变量赋值覆盖测试数据

**日期**：2026-06-07

## 问题

Scratch 学生程序在绿旗后手动赋值输入变量（如 `设 n 为 5`），会覆盖判题器注入的测试数据，导致不同测试用例下输出相同。

## 方案

对每个输入变量，按执行顺序只处理其**第一次赋值**中的字面量，替换为测试数据。后续赋值保留不动。

判断依据：SB3 压缩格式中，字面量 VALUE 为 `[1, [4, "val"]]`（数组），表达式 VALUE 为 `"blockId"`（字符串）。

## 修改文件

| 文件 | 变更 |
|------|------|
| `src/sb3Parser.js` | 新增 `replaceFirstAssignments()`、`_processBlockChains()`、`_walkChain()`、`_replaceLiteralInput()` 方法 |
| `src/judge.js` | 在 `judgeTestCase` 中 `setInputs()` 前调用 `replaceFirstAssignments()` |
| `CLAUDE.md` | 新增「输入变量处理」章节 |
| `test/test.replaceFirstAssignments.js` | 新增单元测试（7 个用例） |

## 测试结果

```
replaceFirstAssignments 测试：
  ✅ 替换单个输入变量的首次赋值字面量
  ✅ 替换多个输入变量的首次赋值
  ✅ 只替换首次赋值，后续赋值保留
  ✅ VALUE 是表达式时跳过该积木
  ✅ 输入变量在积木中不存在时不报错
  ✅ 空积木链不报错
  ✅ 处理 C-block SUBSTACK 中的赋值

结果: 7 通过, 0 失败
```
