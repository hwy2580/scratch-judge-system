/**
 * Scratch 评测机 - 集成测试
 *
 * 使用方法:
 * 1. 启动服务器: node server.js
 * 2. 运行测试: node test/test.judge.js [sb3文件路径]
 *
 * 注意: 需要一个测试用的 sb3 文件才能完整测试判题接口
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const SERVER_URL = 'http://localhost:3001';

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

    const ok = res.status === 200
      && res.data.status === 'ok'
      && res.data.version
      && typeof res.data.uptime === 'number';

    console.log(`   结果: ${ok ? 'PASS' : 'FAIL'}`);
    return ok;
  } catch (err) {
    console.error(`   错误: ${err.message}`);
    return false;
  }
}

/**
 * 测试判题接口 - 缺少文件
 */
async function testJudgeNoFile() {
  console.log('\n2. 测试判题接口 - 缺少文件...');
  try {
    const boundary = '----FormBoundary' + Date.now();
    let body = `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="config"\r\n\r\n`;
    body += `{"testCases":[{"input":{"a":1},"output":{"ans":2}}]}\r\n`;
    body += `--${boundary}--\r\n`;

    const res = await request('POST', `${SERVER_URL}/api/judge`, body,
      `multipart/form-data; boundary=${boundary}`);

    console.log(`   状态码: ${res.status}`);
    console.log(`   响应: ${JSON.stringify(res.data)}`);

    const ok = res.status === 400;
    console.log(`   结果: ${ok ? 'PASS' : 'FAIL'}`);
    return ok;
  } catch (err) {
    console.error(`   错误: ${err.message}`);
    return false;
  }
}

/**
 * 测试判题接口 - 缺少 config
 */
async function testJudgeNoConfig(sb3Path) {
  console.log('\n3. 测试判题接口 - 缺少 config...');
  if (!sb3Path || !fs.existsSync(sb3Path)) {
    console.log('   跳过: 未提供 sb3 文件');
    return true;
  }

  try {
    const sb3Buffer = fs.readFileSync(sb3Path);
    const boundary = '----FormBoundary' + Date.now();
    const fileName = path.basename(sb3Path);

    let body = `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
    body += `Content-Type: application/octet-stream\r\n\r\n`;

    const bodyEnd = `\r\n--${boundary}--\r\n`;

    const bodyBuffer = Buffer.concat([
      Buffer.from(body, 'utf-8'),
      sb3Buffer,
      Buffer.from(bodyEnd, 'utf-8')
    ]);

    const res = await request('POST', `${SERVER_URL}/api/judge`, bodyBuffer,
      `multipart/form-data; boundary=${boundary}`);

    console.log(`   状态码: ${res.status}`);
    console.log(`   响应: ${JSON.stringify(res.data)}`);

    const ok = res.status === 400;
    console.log(`   结果: ${ok ? 'PASS' : 'FAIL'}`);
    return ok;
  } catch (err) {
    console.error(`   错误: ${err.message}`);
    return false;
  }
}

/**
 * 测试判题接口 - 正常判题
 */
async function testJudgeSuccess(sb3Path) {
  console.log('\n4. 测试判题接口 - 正常判题...');
  if (!sb3Path || !fs.existsSync(sb3Path)) {
    console.log('   跳过: 未提供 sb3 文件');
    return true;
  }

  try {
    const sb3Buffer = fs.readFileSync(sb3Path);
    const boundary = '----FormBoundary' + Date.now();
    const fileName = path.basename(sb3Path);

    // 构造测试配置（两数之和）
    const testConfig = JSON.stringify({
      testCases: [
        { input: { a: 3, b: 5 }, output: { ans: 8 } },
        { input: { a: 10, b: 20 }, output: { ans: 30 } }
      ],
      timeLimit: 5000,
      stepLimit: 100000
    });

    let body = `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
    body += `Content-Type: application/octet-stream\r\n\r\n`;

    let bodyMid = `\r\n--${boundary}\r\n`;
    bodyMid += `Content-Disposition: form-data; name="config"\r\n\r\n`;
    bodyMid += `${testConfig}\r\n`;
    bodyMid += `--${boundary}--\r\n`;

    const bodyBuffer = Buffer.concat([
      Buffer.from(body, 'utf-8'),
      sb3Buffer,
      Buffer.from(bodyMid, 'utf-8')
    ]);

    const res = await request('POST', `${SERVER_URL}/api/judge`, bodyBuffer,
      `multipart/form-data; boundary=${boundary}`);

    console.log(`   状态码: ${res.status}`);
    console.log(`   判定结果: ${JSON.stringify(res.data, null, 2)}`);

    const ok = res.status === 200 && res.data.verdict;
    console.log(`   结果: ${ok ? 'PASS' : 'FAIL'}`);
    return ok;
  } catch (err) {
    console.error(`   错误: ${err.message}`);
    return false;
  }
}

/**
 * 主测试函数
 */
async function main() {
  console.log('=== Scratch 评测机集成测试 ===');

  // 检查服务器是否运行
  try {
    await request('GET', `${SERVER_URL}/api/health`);
  } catch (err) {
    console.error('\n错误: 服务器未运行，请先启动服务器: node server.js');
    process.exit(1);
  }

  const results = [];
  results.push(await testHealth());
  results.push(await testJudgeNoFile());

  const sb3Path = process.argv[2];
  results.push(await testJudgeNoConfig(sb3Path));
  results.push(await testJudgeSuccess(sb3Path));

  console.log('\n=== 测试完成 ===');
  const passed = results.filter(r => r).length;
  console.log(`通过: ${passed}/${results.length}`);

  if (passed < results.length) {
    process.exit(1);
  }
}

main().catch(console.error);
