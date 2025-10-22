import { H3, serve, onRequest, onResponse, onError } from 'h3';
import process from 'process';
import config from './config.js';
import corsMiddleware from './middlewares/cors.js';
import apiTokenAuth from './middlewares/auth.js';
import { handleChatCompletion, handleModels } from './routes/chat.js';
import { AuthType, createCodeAssistContentGenerator, createContentGeneratorConfig, createContentGenerator, Config, Storage } from '@google/gemini-cli-core';
import path from 'path';
import fs from 'fs/promises'


//https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/config/storage.ts
//https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/code_assist/oauth2.ts
async function CheckGoogleAuthentication() {
  if (process.env.GOOGLE_GENAI_USE_VERTEXAI) {
    console.log(`当前使用的认证方式是${AuthType.USE_VERTEX_AI}:${process.env.GOOGLE_API_KEY}`)
    return;
  }

  if (process.env.GEMINI_API_KEY) {
    console.log(`当前使用的认证方式是${AuthType.USE_GEMINI}:${process.env.GEMINI_API_KEY}`)
    return;
  }

  if (process.env.GOOGLE_GENAI_USE_GCA && process.env.GOOGLE_CLOUD_ACCESS_TOKEN) {
    //GOOGLE_CLOUD_ACCESS_TOKEN就是 下面oauth_creds.json中的access_token
    console.log(`当前使用的认证方式是${AuthType.LOGIN_WITH_GOOGLE}:${process.env.GOOGLE_CLOUD_ACCESS_TOKEN}`)
    return;
  }

  //C:\Users\zhepa\.gemini\oauth_creds.json  ~/.gemini/oauth_creds.json
  const filePath = Storage.getOAuthCredsPath();
  try {
    await fs.access(filePath, fs.constants.F_OK);
    // 如果上面的代码没有抛出错误，说明文件存在
    console.log(`当前使用的认证方式是 ${AuthType.LOGIN_WITH_GOOGLE}:${filePath}`);
    return; // 或者 return true;
  } catch (error) {
    console.log(`认证文件不存在: ${filePath}`);
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(`当前使用的认证方式是${AuthType.LOGIN_WITH_GOOGLE}:${process.env.GOOGLE_APPLICATION_CREDENTIALS}`)
    return;
  }

  //设置成docker的默认路径
  process.env.GOOGLE_APPLICATION_CREDENTIALS = '/app/oauth_creds.json';
  console.log(`当前使用的认证方式是${AuthType.LOGIN_WITH_GOOGLE}:${process.env.GOOGLE_APPLICATION_CREDENTIALS}`)
}

//https://github.com/google-gemini/gemini-cli/blob/main/packages/cli/src/validateNonInterActiveAuth.ts
function getAuthTypeFromEnv() {
  if (process.env['GOOGLE_GENAI_USE_GCA'] === 'true') {
    return AuthType.LOGIN_WITH_GOOGLE;
  }
  if (process.env['GOOGLE_GENAI_USE_VERTEXAI'] === 'true') {
    return AuthType.USE_VERTEX_AI;
  }
  if (process.env['GEMINI_API_KEY']) {
    return AuthType.USE_GEMINI;
  }
  return AuthType.LOGIN_WITH_GOOGLE;
}


let contentGenerator = null;

//https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/core/contentGenerator.ts
async function GetCodeAssist() {
  if (contentGenerator != null) {
    return contentGenerator;
  }
  CheckGoogleAuthentication();

  const geminiConfig = new Config({
    sessionId: "",
    model: config.defaultModel,
    embeddingModel: config.defaultEmbeddingModel,
    sandbox: undefined,
    targetDir: config.targetDir,
    debugMode: config.debugMode,
    question: '',
  });

  // 该方法只能使用AuthType.LOGIN_WITH_GOOGLE
  // const version = config.cliVersion;
  // const userAgent = `GeminiCLI/${version} (${process.platform}; ${process.arch})`;
  // const baseHeaders = {
  //   'User-Agent': userAgent,
  // };

  // const httpOptions = { headers: baseHeaders };
  // contentGenerator = await createCodeAssistContentGenerator(
  //   httpOptions,
  //   AuthType.LOGIN_WITH_GOOGLE,
  //   geminiConfig,
  //   geminiConfig.getSessionId()
  // );

  //手动创建支持多个认证方式的生成器
  // const newContentGeneratorConfig = createContentGeneratorConfig(
  //   geminiConfig,
  //   getAuthTypeFromEnv(),
  // );

  // contentGenerator = await createContentGenerator(
  //   newContentGeneratorConfig,
  //   geminiConfig,
  //   geminiConfig.getSessionId(),
  // );

  //通过geminiConfig创建生成器
  //await geminiConfig.initialize();
  await geminiConfig.refreshAuth(getAuthTypeFromEnv());
  contentGenerator = geminiConfig.getContentGenerator();

  console.log('Gemini Code Assist initialized successfully');
  return contentGenerator;
}




const app = new H3();
// 全局 CORS 中间件
app.use(corsMiddleware);

if (process.env.NODE_ENV == "development") {
  app.use(
    onRequest((event) => {
      console.log(`REQUEST: [${event.req.method}] ${event.url.pathname}`);
    }),
  );

  app.use(
    onResponse((response, event) => {
      console.log(`RESPONSE: [${event.req.method}] ${event.url.pathname} ~>`, response.status);
    }),
  );
}

app.use(
  onError((error, event) => {
    console.log(
      `ERROR: [${event.req.method}] ${event.url.pathname} !! ${error.message}`,
    );
  }),
);

app.get('/health', (event) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

app.get('/v1/models', (event) => {
  return handleModels();
});

app.post('/v1/chat/completions', async (event) => {
  const authResult = apiTokenAuth(event);
  if (authResult !== false) {
    return authResult;
  }
  const codeAssist = await GetCodeAssist();
  return await handleChatCompletion(event, codeAssist, config.defaultModel);
});


const port = config.port;
const host = config.host;
serve(app, { port, host });

console.log(`🚀 服务器运行在 http://${host}:${port}`);
console.log(`🏠 管理面板: http://${host}:${port}/`);
console.log(`📋 健康检查: http://${host}:${port}/health`);
console.log(`💬 聊天端点: http://${host}:${port}/v1/chat/completions`);
console.log(`🌍 环境: ${process.env.NODE_ENV || 'production'}`);