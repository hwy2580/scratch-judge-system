const VirtualMachine = require('scratch-vm');
const { ScratchStorage } = require('scratch-storage');
const SB3Parser = require('./sb3Parser');
const Verdict = require('./verdict');

// 抑制 scratch-vm 在无头模式下的渲染/音频警告
try {
  const minilog = require('minilog');
  minilog.disable();
} catch (e) {
  // minilog 不可用时忽略
}

/**
 * 判题器核心
 * 负责加载 sb3 项目、执行程序、监控状态、收集结果
 */
class Judge {
  constructor(config = {}) {
    this.timeLimit = config.timeLimit || 10000;      // 默认 10 秒
    this.stepLimit = config.stepLimit || 500000;      // 默认 50 万步
    this.memoryLimit = config.memoryLimit || 256;      // 默认 256MB
  }

  /**
   * 判定单个测试用例
   * @param {Buffer} sb3Buffer - sb3 文件的 Buffer
   * @param {object} testCase - {input: {}, output: {}}
   * @returns {Promise<{verdict: string, actual: object|null, time: number, steps: number, error: string|null}>}
   */
  async judgeTestCase(sb3Buffer, testCase) {
    const startTime = Date.now();
    const memBefore = process.memoryUsage().heapUsed;

    let vm = null;

    try {
      // 1. 解析 sb3 并修改输入变量
      const { project, zip } = await SB3Parser.parse(sb3Buffer);

      // 替换输入变量的首次赋值字面量（解决学生手动赋值覆盖测试数据的问题）
      SB3Parser.replaceFirstAssignments(project, testCase.input);

      // 设置输入变量（写入 project.json 的 variables 字段）
      const notFound = SB3Parser.setInputs(project, testCase.input);
      if (notFound.length > 0) {
        return {
          verdict: Verdict.RE,
          actual: null,
          time: Date.now() - startTime,
          steps: 0,
          error: `找不到输入变量: ${notFound.join(', ')}`
        };
      }

      // 重新打包 sb3
      const modifiedBuffer = await SB3Parser.repackage(project, zip);

      // 2. 创建 VM 实例
      vm = new VirtualMachine();
      const storage = new ScratchStorage();
      vm.attachStorage(storage);
      vm.setTurboMode(true);

      // 3. 加载项目
      await vm.loadProject(modifiedBuffer);

      // 4. 执行并监控
      const result = await this._execute(vm, testCase, startTime, memBefore);

      return result;
    } catch (err) {
      return {
        verdict: Verdict.RE,
        actual: null,
        time: Date.now() - startTime,
        steps: 0,
        error: `运行时错误: ${err.message}`
      };
    } finally {
      // 清理 VM 资源
      if (vm) {
        try {
          vm.quit();
          vm.clear();
        } catch (e) {
          // 忽略清理错误
        }
      }
    }
  }

  /**
   * 从 VM runtime targets 中读取输出变量的值
   * VM 运行后变量是 Variable 对象（.name/.value），不是 project.json 的 [name, value] 数组
   * 注意：VM 运行时中，标量和列表都存储在 target.variables 中，通过 type 区分
   * @private
   */
  _readOutputsFromVM(vm, expectedOutputs) {
    const actual = {};
    const missing = [];

    for (const [name, expectedVal] of Object.entries(expectedOutputs)) {
      let found = false;
      // 根据期望值类型确定查找的目标类型：数组 -> 列表，其他 -> 标量
      const isList = Array.isArray(expectedVal);

      for (const target of vm.runtime.targets) {
        for (const variable of Object.values(target.variables || {})) {
          if (variable.name === name) {
            // 检查类型是否匹配
            if (isList && variable.type === 'list') {
              actual[name] = variable.value;
              found = true;
              break;
            } else if (!isList && variable.type !== 'list') {
              actual[name] = variable.value;
              found = true;
              break;
            }
          }
        }
        if (found) break;
      }

      if (!found) {
        missing.push(name);
      }
    }

    return { actual, missing };
  }

  /**
   * 执行 Scratch 程序并等待完成
   * @private
   */
  _execute(vm, testCase, startTime, memBefore) {
    return new Promise((resolve) => {
      let resolved = false;
      let stepCount = 0;

      // 先注册事件监听器，再启动执行，避免事件在监听器注册前触发
      vm.runtime.on('PROJECT_RUN_STOP', () => {
        if (!resolved) {
          resolved = true;
          this._cleanup(vm, timer, memCheckTimer);

          // 检查内存
          const memUsed = (process.memoryUsage().heapUsed - memBefore) / (1024 * 1024);
          if (memUsed > this.memoryLimit) {
            resolve({
              verdict: Verdict.MLE,
              actual: null,
              time: Date.now() - startTime,
              steps: stepCount,
              error: `超过内存限制 (${this.memoryLimit}MB)`
            });
            return;
          }

          // 从 VM 运行时直接读取输出变量
          const { actual, missing } = this._readOutputsFromVM(vm, testCase.output);

          if (missing.length > 0) {
            resolve({
              verdict: Verdict.RE,
              actual,
              time: Date.now() - startTime,
              steps: stepCount,
              error: `找不到输出变量: ${missing.join(', ')}`
            });
            return;
          }

          // 比较结果
          const match = this._compareOutputs(actual, testCase.output);
          resolve({
            verdict: match ? Verdict.AC : Verdict.WA,
            actual,
            time: Date.now() - startTime,
            steps: stepCount,
            error: null
          });
        }
      });

      // 拦截 _step 来统计步数（在 start() 之前拦截）
      const originalStep = vm.runtime._step.bind(vm.runtime);
      vm.runtime._step = () => {
        originalStep();
        stepCount++;
        // 步数限制检查
        if (stepCount >= this.stepLimit && !resolved) {
          resolved = true;
          this._cleanup(vm, timer, memCheckTimer);
          resolve({
            verdict: Verdict.TLE,
            actual: null,
            time: Date.now() - startTime,
            steps: stepCount,
            error: `超过步数限制 (${this.stepLimit} 步)`
          });
        }
      };

      // 墙钟超时
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this._cleanup(vm, timer, memCheckTimer);
          resolve({
            verdict: Verdict.TLE,
            actual: null,
            time: Date.now() - startTime,
            steps: stepCount,
            error: `超过时间限制 (${this.timeLimit}ms)`
          });
        }
      }, this.timeLimit);

      // 内存检查定时器
      const memCheckTimer = setInterval(() => {
        const memUsed = (process.memoryUsage().heapUsed - memBefore) / (1024 * 1024);
        if (memUsed > this.memoryLimit && !resolved) {
          resolved = true;
          this._cleanup(vm, timer, memCheckTimer);
          resolve({
            verdict: Verdict.MLE,
            actual: null,
            time: Date.now() - startTime,
            steps: stepCount,
            error: `超过内存限制 (${this.memoryLimit}MB)`
          });
        }
      }, 100);

      // 最后启动执行（事件监听器和拦截器已就位）
      vm.start();
      vm.greenFlag();
    });
  }

  /**
   * 清理定时器和 VM
   * @private
   */
  _cleanup(vm, timer, stepCheckTimer) {
    clearTimeout(timer);
    clearInterval(stepCheckTimer);
    try {
      vm.stopAll();
      vm.quit();
    } catch (e) {
      // 忽略清理错误
    }
  }

  /**
   * 比较实际输出和期望输出
   * @private
   */
  _compareOutputs(actual, expected) {
    for (const [key, expectedVal] of Object.entries(expected)) {
      const actualVal = actual[key];
      if (Array.isArray(expectedVal)) {
        // 列表比较
        if (!Array.isArray(actualVal)) return false;
        if (actualVal.length !== expectedVal.length) return false;
        for (let i = 0; i < expectedVal.length; i++) {
          if (String(actualVal[i]) !== String(expectedVal[i])) return false;
        }
      } else {
        // 标量比较 - 转为字符串比较（Scratch 中数字和字符串可互转）
        if (String(actualVal) !== String(expectedVal)) return false;
      }
    }
    return true;
  }

  /**
   * 判定整个题目（多个测试用例）
   * @param {Buffer} sb3Buffer - sb3 文件的 Buffer
   * @param {object} problem - 题目配置
   * @returns {Promise<{verdict: string, details: Array, totalTime: number, totalSteps: number}>}
   */
  async judge(sb3Buffer, problem) {
    const details = [];
    let totalTime = 0;
    let totalSteps = 0;
    let finalVerdict = Verdict.AC;

    // 使用题目自定义限制或全局默认
    const timeLimit = problem.timeLimit || this.timeLimit;
    const stepLimit = problem.stepLimit || this.stepLimit;
    const memoryLimit = problem.memoryLimit || this.memoryLimit;

    const judgeInstance = new Judge({ timeLimit, stepLimit, memoryLimit });

    for (let i = 0; i < problem.testCases.length; i++) {
      const testCase = problem.testCases[i];
      const result = await judgeInstance.judgeTestCase(sb3Buffer, testCase);

      details.push({
        case: i + 1,
        verdict: result.verdict,
        input: testCase.input,
        expected: testCase.output,
        actual: result.actual,
        time: result.time,
        steps: result.steps,
        error: result.error
      });

      totalTime += result.time;
      totalSteps += result.steps;

      // 更新最终判定
      if (result.verdict !== Verdict.AC) {
        finalVerdict = result.verdict;
        // 遇到非 AC 可以提前终止（可选）
        // break;
      }
    }

    return {
      verdict: finalVerdict,
      details,
      totalTime,
      totalSteps
    };
  }
}

module.exports = Judge;
