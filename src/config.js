import dotenv from 'dotenv';
import process from 'process';
import path from 'path';
import { DEFAULT_GEMINI_MODEL, DEFAULT_GEMINI_EMBEDDING_MODEL, AuthType } from '@google/gemini-cli-core';
// Load environment variables from .env file
dotenv.config();


//https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/code_assist/storage.ts
//https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/code_assist/oauth2.ts

function InitGoogleAuthentication() {

  if (process.env.GOOGLE_GENAI_USE_VERTEXAI) {
    console.log(`当前使用的认证方式是${AuthType.USE_VERTEX_AI}:${process.env.GOOGLE_API_KEY}`)
    return;
  }

  if (process.env.GEMINI_API_KEY) {
    console.log(`当前使用的认证方式是${AuthType.USE_GEMINI}:${process.env.GEMINI_API_KEY}`)
    return;
  }

  if (process.env.GOOGLE_GENAI_USE_GCA && process.env.GOOGLE_CLOUD_ACCESS_TOKEN) {
    console.log(`当前使用的认证方式是${AuthType.LOGIN_WITH_GOOGLE}:${process.env.GOOGLE_CLOUD_ACCESS_TOKEN}`)
    return;
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    //C:\Users\zhepa\.gemini\oauth_creds.json  ~/.gemini/oauth_creds.json
    console.log(`当前使用的认证方式是${AuthType.LOGIN_WITH_GOOGLE}:${process.env.GOOGLE_APPLICATION_CREDENTIALS}`)
    return;
  }

  //设置成docker的默认路径
  process.env.GOOGLE_APPLICATION_CREDENTIALS = '/app/oauth_creds.json';
  console.log(`当前使用的认证方式是${AuthType.LOGIN_WITH_GOOGLE}:${process.env.GOOGLE_APPLICATION_CREDENTIALS}`)
}

InitGoogleAuthentication();

const config = {
  // Server configuration
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  token: process.env.TOKEN,



  // CLI configuration
  cliVersion: process.env.CLI_VERSION || process.version,
  debugMode: process.env.DEBUG === 'true',

  // Model defaults
  defaultModel: process.env.DEFAULT_MODEL || DEFAULT_GEMINI_MODEL,
  defaultEmbeddingModel: process.env.DEFAULT_EMBEDDING_MODEL || DEFAULT_GEMINI_EMBEDDING_MODEL,

  // Target directory for operations
  targetDir: process.env.TARGET_DIR || './',
};

export default config;