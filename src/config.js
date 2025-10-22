import dotenv from 'dotenv';
import process from 'process';
import path from 'path';
import { DEFAULT_GEMINI_MODEL, DEFAULT_GEMINI_EMBEDDING_MODEL } from '@google/gemini-cli-core';
// Load environment variables from .env file
dotenv.config();


//https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/code_assist/storage.ts

function getCustomOAuthCredsPath() {
  return process.env.GOOGLE_APPLICATION_CREDENTIALS || '/app/oauth_creds.json'
}


const config = {
  // Server configuration
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  token: process.env.TOKEN,
 

  // Google authentication
  //https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/code_assist/oauth2.ts
  googleApplicationCredentials: getCustomOAuthCredsPath(),
  googleGenaiUseGca: process.env.GOOGLE_GENAI_USE_GCA === 'true',
  googleCloudAccessToken: process.env.GOOGLE_CLOUD_ACCESS_TOKEN,

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