/**
 * 测试 replaceFirstAssignments 函数
 * 验证输入变量的首次赋值字面量替换逻辑
 */

const SB3Parser = require('../src/sb3Parser');

// 辅助函数：创建一个包含指定积木链的 project.json
function createMockProject(blockChains) {
  // blockChains: [[blockDef, blockDef, ...], ...] 每个数组是一条脚本链
  const blocks = {};
  for (const chain of blockChains) {
    for (let i = 0; i < chain.length; i++) {
      const block = { ...chain[i] };
      block.next = i < chain.length - 1 ? chain[i + 1].id : null;
      block.parent = i > 0 ? chain[i - 1].id : null;
      if (i === 0) block.topLevel = true;
      blocks[block.id] = block;
    }
  }
  return {
    targets: [{ blocks }]
  };
}

// 创建 data_setvariableto 积木
function setVarBlock(id, varName, varId, value, isLiteral = true) {
  const block = {
    id,
    opcode: 'data_setvariableto',
    fields: { VARIABLE: [varName, varId] },
    inputs: {},
    shadow: false,
    topLevel: false
  };
  if (isLiteral) {
    // 字面量: [1, [4, "value"]] (math_number)
    block.inputs.VALUE = [1, [4, String(value)]];
  } else {
    // 表达式: [2, "exprBlockId"] (引用其他积木)
    block.inputs.VALUE = [2, value]; // value 在这里充当 blockId
  }
  return block;
}

// 创建其他积木（如 operator_add）
function operatorBlock(id, opcode) {
  return {
    id,
    opcode,
    inputs: {},
    fields: {},
    shadow: false,
    topLevel: false
  };
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

console.log('replaceFirstAssignments 测试：\n');

// 测试 1: 基本替换 - 单个输入变量
test('替换单个输入变量的首次赋值字面量', () => {
  const project = createMockProject([[
    setVarBlock('b1', 'a', 'varA', '3'),
    setVarBlock('b2', 'ans', 'varAns', '0'),
  ]]);
  SB3Parser.replaceFirstAssignments(project, { a: 10 });
  assert(project.targets[0].blocks.b1.inputs.VALUE[1][1] === '10', 'a 应被替换为 10');
  assert(project.targets[0].blocks.b2.inputs.VALUE[1][1] === '0', 'ans 不应被修改');
});

// 测试 2: 多个输入变量
test('替换多个输入变量的首次赋值', () => {
  const project = createMockProject([[
    setVarBlock('b1', 'a', 'varA', '3'),
    setVarBlock('b2', 'b', 'varB', '5'),
    setVarBlock('b3', 'ans', 'varAns', '0'),
  ]]);
  SB3Parser.replaceFirstAssignments(project, { a: 10, b: 20 });
  assert(project.targets[0].blocks.b1.inputs.VALUE[1][1] === '10', 'a 应被替换为 10');
  assert(project.targets[0].blocks.b2.inputs.VALUE[1][1] === '20', 'b 应被替换为 20');
  assert(project.targets[0].blocks.b3.inputs.VALUE[1][1] === '0', 'ans 不应被修改');
});

// 测试 3: 用户场景 - 设 n 为 5, 设 ans 为 n*n, 设 n 为 0
test('只替换首次赋值，后续赋值保留', () => {
  const project = createMockProject([[
    setVarBlock('b1', 'n', 'varN', '5'),       // 第一次赋值 n → 替换
    operatorBlock('b2', 'operator_multiply'),   // 表达式积木
    setVarBlock('b3', 'ans', 'varAns', '0'),   // 赋值 ans
    setVarBlock('b4', 'n', 'varN', '0'),        // 第二次赋值 n → 保留
  ]]);
  SB3Parser.replaceFirstAssignments(project, { n: 10 });
  assert(project.targets[0].blocks.b1.inputs.VALUE[1][1] === '10', 'n 首次赋值应替换为 10');
  assert(project.targets[0].blocks.b4.inputs.VALUE[1][1] === '0', 'n 第二次赋值应保留为 0');
});

// 测试 4: VALUE 是表达式时不替换
test('VALUE 是表达式时跳过该积木', () => {
  const project = createMockProject([[
    setVarBlock('b1', 'a', 'varA', 'exprBlock', false), // VALUE 是表达式
    setVarBlock('b2', 'ans', 'varAns', '0'),
  ]]);
  SB3Parser.replaceFirstAssignments(project, { a: 10 });
  // b1 不应被修改（VALUE 不是字面量），但 a 仍应从 inputNames 中移除
  assert(project.targets[0].blocks.b2.inputs.VALUE[1][1] === '0', 'ans 不应被修改');
});

// 测试 5: 输入变量不在积木中
test('输入变量在积木中不存在时不报错', () => {
  const project = createMockProject([[
    setVarBlock('b1', 'x', 'varX', '1'),
  ]]);
  SB3Parser.replaceFirstAssignments(project, { a: 10 });
  assert(project.targets[0].blocks.b1.inputs.VALUE[1][1] === '1', 'x 不应被修改');
});

// 测试 6: 空积木链
test('空积木链不报错', () => {
  const project = { targets: [{ blocks: {} }] };
  SB3Parser.replaceFirstAssignments(project, { a: 10 });
});

// 测试 7: C-block 中的 SUBSTACK 链
test('处理 C-block SUBSTACK 中的赋值', () => {
  const blocks = {};
  // C-block (repeat)
  blocks['repeat1'] = {
    id: 'repeat1',
    opcode: 'control_repeat',
    inputs: { SUBSTACK: [2, 'inner1'] },
    fields: {},
    shadow: false,
    topLevel: true,
    next: null,
    parent: null
  };
  // SUBSTACK 内部的赋值
  blocks['inner1'] = {
    id: 'inner1',
    opcode: 'data_setvariableto',
    fields: { VARIABLE: ['a', 'varA'] },
    inputs: { VALUE: [1, [4, '99']] },
    shadow: false,
    topLevel: false,
    next: null,
    parent: 'repeat1'
  };
  const project = { targets: [{ blocks }] };
  SB3Parser.replaceFirstAssignments(project, { a: 10 });
  assert(blocks.inner1.inputs.VALUE[1][1] === '10', 'SUBSTACK 中的 a 应被替换为 10');
});

console.log(`\n结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed > 0 ? 1 : 0);
