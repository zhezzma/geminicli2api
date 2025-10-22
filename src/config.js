import dotenv from 'dotenv';
import process from 'process';
import { DEFAULT_GEMINI_MODEL, DEFAULT_GEMINI_EMBEDDING_MODEL, AuthType } from '@google/gemini-cli-core';
// Load environment variables from .env file
dotenv.config();

const config = {
  // Server configuration
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  apiToken: process.env.API_TOKEN,


  googleApplicationCredentials: '/app/oauth_creds.json',
  appAccountsPath: process.env.APP_ACCOUNTS_PATH || "/app/accounts.json",
  appAccountsEnabled: (process.env.APP_ACCOUNTS_ENABLE || 'true').toLowerCase() !== 'false',
  appAccountsSelectionType: process.env.APP_ACCOUNTS_SELECTION_TYPE || "roundRobin",
  // CLI configuration
  cliVersion: process.env.CLI_VERSION || process.version,
  debugMode: process.env.DEBUG === 'true',
  // Target directory for operations
  targetDir: process.env.TARGET_DIR || './',

  // Model defaults
  defaultModel: process.env.DEFAULT_MODEL || DEFAULT_GEMINI_MODEL,
  defaultEmbeddingModel: process.env.DEFAULT_EMBEDDING_MODEL || DEFAULT_GEMINI_EMBEDDING_MODEL,



};

export default config;