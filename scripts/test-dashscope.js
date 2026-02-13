const fs = require('fs');
const path = require('path');
const https = require('https');

// 1. 读取 .env.local 文件
const envPath = path.join(__dirname, '..', '.env.local');
let apiKey = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/DASHSCOPE_API_KEY=(.*)/);
    if (match && match[1]) {
        apiKey = match[1].trim();
        console.log('✅ 成功从 .env.local 读取到 DASHSCOPE_API_KEY');
    } else {
        console.error('❌ 未在 .env.local 中找到 DASHSCOPE_API_KEY');
        process.exit(1);
    }
} catch (error) {
    console.error('❌ 读取 .env.local 文件失败:', error.message);
    process.exit(1);
}

// 2. 封装测试函数
function testModel(modelName) {
    return new Promise((resolve) => {
        console.log(`\n🔄 正在测试模型: ${modelName}...`);
        
        const data = JSON.stringify({
            model: modelName,
            messages: [
                { role: 'user', content: 'Reply "OK" if you see this.' }
            ]
        });

        const options = {
            hostname: 'dashscope.aliyuncs.com',
            path: '/compatible-mode/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        };

        const req = https.request(options, (res) => {
            let responseBody = '';

            res.on('data', (chunk) => {
                responseBody += chunk;
            });

            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const parsedData = JSON.parse(responseBody);
                        const content = parsedData.choices?.[0]?.message?.content || 'No content';
                        console.log(`✅ [${modelName}] 测试成功！`);
                        console.log(`   响应: ${content}`);
                        resolve(true);
                    } catch (e) {
                        console.error(`❌ [${modelName}] 解析响应失败:`, e.message);
                        resolve(false);
                    }
                } else {
                    console.error(`❌ [${modelName}] 请求失败，状态码: ${res.statusCode}`);
                    // 尝试解析错误信息，看是否是欠费
                    try {
                        const errData = JSON.parse(responseBody);
                        console.error(`   错误信息: ${errData.error?.message || errData.message || JSON.stringify(errData)}`);
                        if (JSON.stringify(errData).includes('Arrearage') || JSON.stringify(errData).includes('PaymentRequired')) {
                             console.error('   ⚠️ 可能已欠费或余额不足！');
                        }
                    } catch {
                        console.error('   错误响应:', responseBody);
                    }
                    resolve(false);
                }
            });
        });

        req.on('error', (error) => {
            console.error(`❌ [${modelName}] 请求发送错误:`, error.message);
            resolve(false);
        });

        req.write(data);
        req.end();
    });
}

// 3. 执行测试
async function runTests() {
    // 测试基础模型 qwen-turbo
    await testModel('qwen-turbo');
    
    // 测试高级模型 qwen-max (通常用于检查是否欠费或有高级权限)
    // 注意：用户提到的 qwen3-max 目前 API 名称通常仍沿用 qwen-max (指向最新版) 
    // 或者具体版本号。这里先测 qwen-max
    await testModel('qwen-max');
}

runTests();
