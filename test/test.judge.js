/**
 * Scratch 判题系统 - 测试脚本
 *
 * 使用方法:
 * 1. 启动服务器: node server.js
 * 2. 运行测试: node test/test.judge.js
 *
 * 注意: 需要一个测试用的 sb3 文件才能完整测试
 * 可以从 Scratch 编辑器导出一个简单项目进行测试
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const SERVER_URL = 'http://localhost:3000';

/**
 * 发送 HTTP 请求
 */
function request(method, url, data, contentType) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method,
      headers: {}
    };

    if (data && contentType) {
      options.headers['Content-Type'] = contentType;
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

/**
 * 测试健康检查接口
 */
async function testHealth() {
  console.log('\n1. 测试健康检查接口...');
  try {
    const res = await request('GET', `${SERVER_URL}/api/health`);
    console.log(`   状态码: ${res.status}`);
    console.log(`   响应: ${JSON.stringify(res.data)}`);
    return res.status === 200;
  } catch (err) {
    console.error(`   错误: ${err.message}`);
    return false;
  }
}

/**
 * 测试题目列表接口
 */
async function testProblemsList() {
  console.log('\n2. 测试题目列表接口...');
  try {
    const res = await request('GET', `${SERVER_URL}/api/judge/problems`);
    console.log(`   状态码: ${res.status}`);
    console.log(`   题目列表: ${JSON.stringify(res.data, null, 2)}`);
    return res.status === 200;
  } catch (err) {
    console.error(`   错误: ${err.message}`);
    return false;
  }
}

/**
 * 测试判题接口（需要 sb3 文件）
 */
async function testJudge(sb3Path, problemId) {
  console.log('\n3. 测试判题接口...');
  if (!sb3Path || !fs.existsSync(sb3Path)) {
    console.log('   跳过: 未提供 sb3 文件路径');
    return true;
  }

  try {
    const sb3Buffer = fs.readFileSync(sb3Path);
    const boundary = '----FormBoundary' + Date.now();
    const fileName = path.basename(sb3Path);

    // 构建 multipart/form-data
    let body = '';
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
    body += `Content-Type: application/octet-stream\r\n\r\n`;

    let bodyEnd = `\r\n--${boundary}\r\n`;
    bodyEnd += `Content-Disposition: form-data; name="problemId"\r\n\r\n`;
    bodyEnd += `${problemId}\r\n`;
    bodyEnd += `--${boundary}--\r\n`;

    const bodyBuffer = Buffer.concat([
      Buffer.from(body, 'utf-8'),
      sb3Buffer,
      Buffer.from(bodyEnd, 'utf-8')
    ]);

    const res = await request('POST', `${SERVER_URL}/api/judge`, bodyBuffer,
      `multipart/form-data; boundary=${boundary}`);

    console.log(`   状态码: ${res.status}`);
    console.log(`   判定结果: ${JSON.stringify(res.data, null, 2)}`);
    return res.status === 200;
  } catch (err) {
    console.error(`   错误: ${err.message}`);
    return false;
  }
}

/**
 * 主测试函数
 */
async function main() {
  console.log('=== Scratch 判题系统测试 ===');

  // 检查服务器是否运行
  try {
    await request('GET', `${SERVER_URL}/api/health`);
  } catch (err) {
    console.error('\n错误: 服务器未运行，请先启动服务器: node server.js');
    process.exit(1);
  }

  const results = [];
  results.push(await testHealth());
  results.push(await testProblemsList());

  // 如果命令行提供了 sb3 文件路径，则测试判题
  const sb3Path = process.argv[2];
  const problemId = process.argv[3] || 'example';
  results.push(await testJudge(sb3Path, problemId));

  console.log('\n=== 测试完成 ===');
  const passed = results.filter(r => r).length;
  console.log(`通过: ${passed}/${results.length}`);
}

main().catch(console.error);
