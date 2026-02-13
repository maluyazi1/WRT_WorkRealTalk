const fs = require('fs');
const path = require('path');
const https = require('https');

// 1. 读取 API Key
const envPath = path.join(__dirname, '..', '.env.local');
let apiKey = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/DASHSCOPE_API_KEY=(.*)/);
    if (match && match[1]) {
        apiKey = match[1].trim();
        console.log('✅ 成功读取 API Key');
    } else {
        console.error('❌ 未找到 API Key');
        process.exit(1);
    }
} catch (error) {
    console.error('❌ 读取配置文件失败');
    process.exit(1);
}

// 2. 模拟真实业务场景的配置 (参考 scenarios/random 接口)
const payload = {
    model: 'qwen3-max',  // 用户指定的目标模型
    messages: [
        { 
            role: 'system', 
            content: '你是一个专业的职场英语对话场景生成器。你的任务是根据指定的难度等级，生成真实、实用的职场英语对话场景。' 
        },
        { 
            role: 'user', 
            content: '请为"初级"难度生成一个职场英语对话场景。请严格按照 JSON 格式输出。' 
        }
    ],
    // 保持与业务代码一致的高级参数
    temperature: 1.5, 
    top_p: 0.97,      
    presence_penalty: 1.5, 
    frequency_penalty: 1.0, 
    max_tokens: 100, // 测试用，限制 Token 以免消耗过多，但足够触发计费
    stream: false
};

const options = {
    hostname: 'dashscope.aliyuncs.com',
    path: '/compatible-mode/v1/chat/completions',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    }
};

// 3. 执行调用
console.log(`\n🚀 开始测试模型: ${payload.model}`);
console.log(`📝 请求参数: Temperature=${payload.temperature}, TopP=${payload.top_p}`);
console.log('⏳ 等待响应中...\n');

const req = https.request(options, (res) => {
    let responseBody = '';

    res.on('data', (chunk) => {
        responseBody += chunk;
    });

    res.on('end', () => {
        console.log(`📡 HTTP 状态码: ${res.statusCode}`);
        
        try {
            const data = JSON.parse(responseBody);
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log('✅ 调用成功！');
                console.log('--------------------------------------------------');
                console.log('生成的文本片段:', data.choices?.[0]?.message?.content?.substring(0, 100) + '...');
                console.log('--------------------------------------------------');
                console.log('📊 Token 消耗情况:', data.usage);
            } else {
                console.error('❌ 调用失败！');
                console.error('错误代码:', data.error?.code || data.code);
                console.error('错误类型:', data.error?.type || data.type);
                console.error('错误信息:', data.error?.message || data.message);
                
                if (data.code === 'Arrearage' || data.error?.code === 'Arrearage') {
                    console.error('\n⚠️ 诊断结果: 确实返回了 Arrearage (欠费/拒绝访问)。');
                    console.error('可能原因：');
                    console.error('1. 该账户确实欠费');
                    console.error('2.该模型 (qwen3-max) 需要单独申请权限或不在当前 Key 的可用范围内');
                }
            }
        } catch (e) {
            console.error('❌ 解析响应 JSON 失败:', e.message);
            console.log('原始响应:', responseBody);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ 网络请求错误:', error.message);
});

req.write(JSON.stringify(payload));
req.end();