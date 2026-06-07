const JSZip = require('jszip');

/**
 * SB3 文件解析器
 * 负责解压 sb3、解析 project.json、按名称查找和修改变量
 */
class SB3Parser {
  /**
   * 解析 sb3 文件，返回 project.json 对象和原始 zip 内容
   * @param {Buffer} sb3Buffer - sb3 文件的 Buffer
   * @returns {Promise<{project: object, zip: JSZip}>}
   */
  static async parse(sb3Buffer) {
    const zip = await JSZip.loadAsync(sb3Buffer);
    const projectJsonStr = await zip.file('project.json').async('string');
    const project = JSON.parse(projectJsonStr);
    return { project, zip };
  }

  /**
   * 在所有 target 中按名称查找变量
   * @param {object} project - project.json 对象
   * @param {string} varName - 变量名
   * @returns {{targetIndex: number, varId: string, varData: Array} | null}
   */
  static findVariableByName(project, varName) {
    for (let i = 0; i < project.targets.length; i++) {
      const target = project.targets[i];
      const variables = target.variables || {};
      for (const [varId, varData] of Object.entries(variables)) {
        if (varData[0] === varName) {
          return { targetIndex: i, varId, varData };
        }
      }
    }
    return null;
  }

  /**
   * 在所有 target 中按名称查找列表
   * @param {object} project - project.json 对象
   * @param {string} listName - 列表名
   * @returns {{targetIndex: number, listId: string, listData: Array} | null}
   */
  static findListByName(project, listName) {
    for (let i = 0; i < project.targets.length; i++) {
      const target = project.targets[i];
      const lists = target.lists || {};
      for (const [listId, listData] of Object.entries(lists)) {
        if (listData[0] === listName) {
          return { targetIndex: i, listId, listData };
        }
      }
    }
    return null;
  }

  /**
   * 设置变量的初始值
   * @param {object} project - project.json 对象
   * @param {string} varName - 变量名
   * @param {*} value - 要设置的值
   * @returns {boolean} 是否设置成功
   */
  static setVariableValue(project, varName, value) {
    const result = this.findVariableByName(project, varName);
    if (!result) return false;
    result.varData[1] = value;
    return true;
  }

  /**
   * 获取变量的当前值
   * @param {object} project - project.json 对象
   * @param {string} varName - 变量名
   * @returns {*} 变量值，未找到返回 null
   */
  static getVariableValue(project, varName) {
    const result = this.findVariableByName(project, varName);
    if (!result) return null;
    return result.varData[1];
  }

  /**
   * 设置列表的初始内容
   * @param {object} project - project.json 对象
   * @param {string} listName - 列表名
   * @param {Array} items - 列表项数组
   * @returns {boolean} 是否设置成功
   */
  static setListValue(project, listName, items) {
    const result = this.findListByName(project, listName);
    if (!result) return false;
    result.listData[1] = items;
    return true;
  }

  /**
   * 获取列表的当前内容
   * @param {object} project - project.json 对象
   * @param {string} listName - 列表名
   * @returns {Array|null} 列表项数组，未找到返回 null
   */
  static getListValue(project, listName) {
    const result = this.findListByName(project, listName);
    if (!result) return null;
    return result.listData[1];
  }

  /**
   * 批量设置输入变量
   * @param {object} project - project.json 对象
   * @param {object} inputs - {变量名: 值} 映射
   * @returns {string[]} 未找到的变量名列表
   */
  static setInputs(project, inputs) {
    const notFound = [];
    for (const [name, value] of Object.entries(inputs)) {
      if (Array.isArray(value)) {
        // 列表类型
        if (!this.setListValue(project, name, value)) {
          notFound.push(name);
        }
      } else {
        // 标量类型
        if (!this.setVariableValue(project, name, value)) {
          notFound.push(name);
        }
      }
    }
    return notFound;
  }

  /**
   * 批量读取输出变量
   * @param {object} project - project.json 对象
   * @param {object} expected - {变量名: 期望值} 映射
   * @returns {{actual: object, missing: string[]}}
   */
  static readOutputs(project, expected) {
    const actual = {};
    const missing = [];
    for (const name of Object.keys(expected)) {
      // 尝试读取标量
      const scalarVal = this.getVariableValue(project, name);
      if (scalarVal !== null) {
        actual[name] = scalarVal;
        continue;
      }
      // 尝试读取列表
      const listVal = this.getListValue(project, name);
      if (listVal !== null) {
        actual[name] = listVal;
        continue;
      }
      missing.push(name);
    }
    return { actual, missing };
  }

  /**
   * 将修改后的 project.json 重新打包为 sb3 buffer
   * @param {object} project - 修改后的 project.json 对象
   * @param {JSZip} originalZip - 原始 zip 对象（保留资源文件）
   * @returns {Promise<Buffer>} 新的 sb3 buffer
   */
  static async repackage(project, originalZip) {
    const zip = new JSZip();
    // 复制所有文件，但替换 project.json
    const files = Object.keys(originalZip.files);
    for (const fileName of files) {
      if (fileName === 'project.json') {
        zip.file(fileName, JSON.stringify(project));
      } else {
        const content = await originalZip.file(fileName).async('nodebuffer');
        zip.file(fileName, content);
      }
    }
    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  }
}

module.exports = SB3Parser;
