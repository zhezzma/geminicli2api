import { H3, serve, onRequest, onResponse, onError } from 'h3';
import process from 'process';
import config from './config.js';
import corsMiddleware from './middlewares/cors.js';
import apiTokenAuth from './middlewares/auth.js';
import { handleChatCompletion, handleModels } from './routes/chat.js';

// Import Gemini CLI Core
import {
  AuthType,
  createCodeAssistContentGenerator,
  Config
} from '@google/gemini-cli-core';

// Initialize Gemini Code Assist
//https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/core/contentGenerator.ts
async function initializeCodeAssist() {
  const version = config.cliVersion;
  const userAgent = `GeminiCLI/${version} (${process.platform}; ${process.arch})`;

  const baseHeaders = {
    'User-Agent': userAgent,
  };

  const httpOptions = { headers: baseHeaders };

  const geminiConfig = new Config({
    sessionId: "",
    model: config.defaultModel,
    embeddingModel: config.defaultEmbeddingModel,
    sandbox: undefined,
    targetDir: config.targetDir,
    debugMode: config.debugMode,
    question: '',
  });

  const codeAssist = await createCodeAssistContentGenerator(
    httpOptions,
    AuthType.LOGIN_WITH_GOOGLE,
    geminiConfig,
    ""
  );

  console.log('Gemini Code Assist initialized successfully');
  return codeAssist;
}

let codeAssist = null;
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
  if (codeAssist == null) {
    codeAssist = await initializeCodeAssist();
  }
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