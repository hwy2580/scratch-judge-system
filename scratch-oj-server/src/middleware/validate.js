/**
 * 校验题目创建/更新请求
 */
function validateProblem(req, res, next) {
  const problem = req.body;

  // 创建时校验 ID
  if (req.method === 'POST') {
    if (!problem.id) {
      return res.status(400).json({ error: '缺少必填字段: id' });
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(problem.id)) {
      return res.status(400).json({ error: 'id 只能包含字母、数字、连字符、下划线' });
    }
  }

  // 校验名称
  if (!problem.name) {
    return res.status(400).json({ error: '缺少必填字段: name' });
  }

  // 校验测试用例
  if (!Array.isArray(problem.testCases) || problem.testCases.length === 0) {
    return res.status(400).json({ error: 'testCases 必须是非空数组' });
  }

  for (let i = 0; i < problem.testCases.length; i++) {
    const tc = problem.testCases[i];
    if (!tc.input || typeof tc.input !== 'object' ||
        !tc.output || typeof tc.output !== 'object') {
      return res.status(400).json({ error: `测试用例 ${i + 1} 格式错误: input 和 output 必须是对象` });
    }
  }

  next();
}

module.exports = { validateProblem };
