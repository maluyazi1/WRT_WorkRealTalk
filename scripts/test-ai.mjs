import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 手动简易解析 .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env.local');

let apiKey = '';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  // 匹配 Key，处理可能的引号
  const match = envContent.match(/GOOGLE_AI_API_KEY=(.*)/);
  if (match) {
    apiKey = match[1].trim().replace(/^["']|["']$/g, '');
  }
}

async function testGemini() {
  // const apiKey = process.env.GOOGLE_AI_API_KEY; // Removed: using file-scoped variable

  
  console.log('-----------------------------------');
  console.log('🔍 正在检查 Google Gemini 配置...');
  
  if (!apiKey) {
    console.error('❌ 错误: 未找到 GOOGLE_AI_API_KEY 环境变量');
    console.error('请检查 .env.local 文件是否存在且包含 API Key');
    return;
  }

  console.log(`✅ 发现 API Key: ${apiKey.substring(0, 8)}********`);
  console.log('🚀 正在尝试连接 Google Gemini API...');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    console.log('📋 正在获取可用模型列表...');
    
    // 使用 fetch 直接调用 API 获取模型列表
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const listResponse = await fetch(listUrl);
    
    if (!listResponse.ok) {
        throw new Error(`Failed to list models: ${listResponse.status} ${listResponse.statusText}`);
    }
    
    const listData = await listResponse.json();
    console.log('可用模型:');
    const availableModels = listData.models
        .filter(m => m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name.replace('models/', ''));
        
    console.log(availableModels.join(', '));

    // 选择第一个可用模型进行测试
    const modelName = availableModels.find(m => m.includes('flash')) || availableModels[0];
    
    if (!modelName) {
        throw new Error('No suitable models found.');
    }

    console.log(`\n🤖 正在尝试使用模型: ${modelName}`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const prompt = "Success";
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('-----------------------------------');
    console.log('🎉 测试成功！模型回复:', text.trim());
    console.log('✅ 您的环境配置正确，可以直接运行项目了。');
    console.log('-----------------------------------');
  } catch (error) {
    console.log('-----------------------------------');
    console.error('❌ 测试失败:');
    console.error(error.message);
    if (error.message.includes('API_KEY_INVALID')) {
        console.error('原因: API Key 无效。请去 Google AI Studio 获取新的 Key。');
    }
    console.log('-----------------------------------');
  }
}

testGemini();
