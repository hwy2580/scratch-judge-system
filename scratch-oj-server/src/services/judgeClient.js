const config = require('../../config/default');

/**
 * 调用评测机进行判题
 *
 * @param {Buffer} fileBuffer - sb3 文件内容
 * @param {string} fileName - 文件名
 * @param {object} problemConfig - 题目配置 { testCases, timeLimit, stepLimit }
 * @returns {Promise<object>} 判题结果
 */
async function judge(fileBuffer, fileName, problemConfig) {
  const url = `${config.judgeUrl}/api/judge`;

  // 构建 multipart/form-data
  const boundary = '----FormBoundary' + Date.now();

  let body = '';
  // file 字段
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
  body += `Content-Type: application/octet-stream\r\n\r\n`;

  // config 字段
  let bodyEnd = `\r\n--${boundary}\r\n`;
  bodyEnd += `Content-Disposition: form-data; name="config"\r\n\r\n`;
  bodyEnd += `${JSON.stringify(problemConfig)}\r\n`;
  bodyEnd += `--${boundary}--\r\n`;

  const bodyBuffer = Buffer.concat([
    Buffer.from(body, 'utf-8'),
    fileBuffer,
    Buffer.from(bodyEnd, 'utf-8')
  ]);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: bodyBuffer
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `评测机返回错误: ${response.status}`);
  }

  return response.json();
}

/**
 * 检查评测机健康状态
 *
 * @returns {Promise<object|null>} 健康状态或 null（不可达）
 */
async function healthCheck() {
  try {
    const url = `${config.judgeUrl}/api/health`;
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch {
    return null;
  }
}

module.exports = { judge, healthCheck };
