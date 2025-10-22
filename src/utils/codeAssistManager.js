import { AuthType, createCodeAssistContentGenerator, createContentGeneratorConfig, createContentGenerator, Config, Storage } from '@google/gemini-cli-core';
import fs from 'fs/promises';
import * as fsSync from 'fs';
import os from 'os';
import path from 'path';
import process from 'process';
import { HTTPError } from 'h3';
import config from '../config.js';

/**
 * Helper function to randomly select from array
 */
function randomSelectFromArray(arr) {
  if (!arr || arr.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex];
}

/**
 * Helper function to save credentials to temporary oauth_creds.json file
 */
async function saveCredentialsToTempFile(credentials) {
  const tempDir = os.tmpdir();
  const credFilePath = path.join(tempDir, 'oauth_creds.json');
  await fs.writeFile(credFilePath, JSON.stringify(credentials, null, 2), 'utf-8');
  console.log(`Credentials saved to: ${credFilePath}`);
  return credFilePath;
}

/**
 * https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/config/storage.ts
 * https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/code_assist/oauth2.ts
 * https://github.com/google-gemini/gemini-cli/blob/main/packages/cli/src/validateNonInterActiveAuth.ts
 * Get authentication type from environment variables
 */
async function getAuthTypeFromEnv() {
  if (process.env.GOOGLE_GENAI_USE_VERTEXAI) {
    console.log(`当前使用的认证方式是${AuthType.USE_VERTEX_AI}:${process.env.GOOGLE_API_KEY}`);
    return AuthType.USE_VERTEX_AI;
  }

  if (process.env.GEMINI_API_KEY) {
    console.log(`当前使用的认证方式是${AuthType.USE_GEMINI}:${process.env.GEMINI_API_KEY}`);
    return AuthType.USE_GEMINI;
  }

  if (process.env.GOOGLE_GENAI_USE_GCA && process.env.GOOGLE_CLOUD_ACCESS_TOKEN) {
    //GOOGLE_CLOUD_ACCESS_TOKEN就是 下面oauth_creds.json中的access_token
    console.log(`当前使用的认证方式是${AuthType.LOGIN_WITH_GOOGLE}:${process.env.GOOGLE_CLOUD_ACCESS_TOKEN}`);
    return AuthType.LOGIN_WITH_GOOGLE;
  }

  //C:\Users\zhepa\.gemini\oauth_creds.json  ~/.gemini/oauth_creds.json
  const filePath = Storage.getOAuthCredsPath();
  try {
    await fs.access(filePath, fsSync.constants.F_OK);
    // 如果上面的代码没有抛出错误，说明文件存在
    console.log(`当前使用的认证方式是 ${AuthType.LOGIN_WITH_GOOGLE}:${filePath}`);
    return AuthType.LOGIN_WITH_GOOGLE;
  } catch (error) {
    console.log(`认证文件不存在: ${filePath}`);
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(`当前使用的认证方式是${AuthType.LOGIN_WITH_GOOGLE}:${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
    return AuthType.LOGIN_WITH_GOOGLE;
  }

  //设置成docker的默认路径
  process.env.GOOGLE_APPLICATION_CREDENTIALS = config.googleApplicationCredentials;
  console.log(`当前使用的认证方式是${AuthType.LOGIN_WITH_GOOGLE}:${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
  return AuthType.LOGIN_WITH_GOOGLE;
}

/**
 * Create code assist instance with specified auth type
 */
async function createCodeAssist(authType) {
  //https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/config/config.ts
  const geminiConfig = new Config({
    sessionId: "",
    model: config.defaultModel,
    embeddingModel: config.defaultEmbeddingModel,
    sandbox: undefined,
    targetDir: config.targetDir,
    debugMode: config.debugMode,
    question: '',
    noBrowser: true,
  });

  //通过geminiConfig创建生成器,不初始化也没有关系
  //await geminiConfig.initialize();
  await geminiConfig.refreshAuth(authType);
  const contentGenerator = geminiConfig.getContentGenerator();

  //手动创建支持多个认证方式的生成器
  // const newContentGeneratorConfig = createContentGeneratorConfig(
  //   geminiConfig,
  //   authType,
  // );

  // contentGenerator = await createContentGenerator(
  //   newContentGeneratorConfig,
  //   geminiConfig,
  //   geminiConfig.getSessionId(),
  // );

  // 该方法只能使用AuthType.LOGIN_WITH_GOOGLE
  // if (authType != AuthType.LOGIN_WITH_GOOGLE) {
  //   throw new HTTPError("该方法只支持LOGIN_WITH_GOOGLE认证类型")
  // }
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

  console.log('Gemini Code Assist initialized successfully');
  return contentGenerator;
}

/**
 * Class to manage accounts-based authentication
 */
class AccountsManager {
  static instance = null;

  constructor() {
    this.accountsPath = config.appAccountsPath;

  }

  /**
   * 获取 AccountsManager 的单例实例
   * @returns {Promise<AccountsManager>} - 返回一个解析为 AccountsManager 实例的 Promise
   */
  static async getInstance() {
    if (!AccountsManager.instance) {
      const instance = new AccountsManager();
      await instance.loadAccountsConfig();
      AccountsManager.instance = instance;
    }
    return AccountsManager.instance;
  }

  /**
   * Parse semicolon-separated string or array into array
   */
  parseToArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value.split(';').filter(item => item.trim()).map(item => item.trim());
    }
    return [];
  }

  /**
   * Load accounts configuration from file and environment
   * Returns structured config with authType and parsed account arrays
   * Environment variables take priority over file configuration
   */
  async loadAccountsConfig() {
    this.config = {
      authType: null,
      googleApiKeyAccounts: [],
      geminiApiKeyAccounts: [],
      googleCloudAccessTokenAccounts: [],
      googleAppCredentialsAccounts: []
    };

    // Check environment variables first - GOOGLE_API_KEY_ACCOUNTS
    if (process.env.GOOGLE_API_KEY_ACCOUNTS) {
      this.config.authType = AuthType.USE_VERTEX_AI;
      this.config.googleApiKeyAccounts = this.parseToArray(process.env.GOOGLE_API_KEY_ACCOUNTS);
      console.log(`Found GOOGLE_API_KEY_ACCOUNTS in environment, authType set to: ${AuthType.USE_VERTEX_AI}`);
      return this.config;
    }

    // Check GEMINI_API_KEY_ACCOUNTS in environment
    if (process.env.GEMINI_API_KEY_ACCOUNTS) {
      this.config.authType = AuthType.USE_GEMINI;
      this.config.geminiApiKeyAccounts = this.parseToArray(process.env.GEMINI_API_KEY_ACCOUNTS);
      console.log(`Found GEMINI_API_KEY_ACCOUNTS in environment, authType set to: ${AuthType.USE_GEMINI}`);
      return this.config;
    }

    // Check GOOGLE_CLOUD_ACCESS_TOKEN_ACCOUNTS in environment
    if (process.env.GOOGLE_CLOUD_ACCESS_TOKEN_ACCOUNTS) {
      this.config.authType = AuthType.LOGIN_WITH_GOOGLE;
      this.config.googleCloudAccessTokenAccounts = this.parseToArray(process.env.GOOGLE_CLOUD_ACCESS_TOKEN_ACCOUNTS);
      console.log(`Found GOOGLE_CLOUD_ACCESS_TOKEN_ACCOUNTS in environment, authType set to: ${AuthType.LOGIN_WITH_GOOGLE}`);
      return this.config;
    }

    // Check GOOGLE_APPLICATION_CREDENTIALS_ACCOUNTS in environment
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_ACCOUNTS) {
      try {
        const googleAppCredsValue = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_ACCOUNTS);
        if (Array.isArray(googleAppCredsValue)) {
          this.config.authType = AuthType.LOGIN_WITH_GOOGLE;
          this.config.googleAppCredentialsAccounts = googleAppCredsValue;
          console.log(`Found GOOGLE_APPLICATION_CREDENTIALS_ACCOUNTS in environment, authType set to: ${AuthType.LOGIN_WITH_GOOGLE}`);
          return this.config;
        }
      } catch (error) {
        console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_ACCOUNTS from environment:', error);
      }
    }

    try {
      const accountsContent = await fs.readFile(this.accountsPath, 'utf-8');
      this.config = JSON.parse(accountsContent);
      console.log(`Loaded accounts configuration from: ${this.accountsPath}`);
      return this.config;
    } catch (error) {
      console.log(`Could not read accounts file (${this.accountsPath}), and no environment variables found`);
    }

    this.config = null;
    return this.config;
  }



  /**
   * Get code assist from accounts
   */
  async getCodeAssist() {
    if (this.config == null) {
      throw new Error("No valid accounts configuration found");
    }
    let account = "";
    const accountsConfig = this.config;
    switch (accountsConfig.authType) {
      case AuthType.LOGIN_WITH_GOOGLE:
        {
          process.env.GOOGLE_GENAI_USE_GCA = 'true';
          if (accountsConfig.googleCloudAccessTokenAccounts && accountsConfig.googleCloudAccessTokenAccounts.length > 0) {
            process.env.GOOGLE_CLOUD_ACCESS_TOKEN = randomSelectFromArray(accountsConfig.googleCloudAccessTokenAccounts);
          }
          else if (accountsConfig.googleAppCredentialsAccounts && accountsConfig.googleAppCredentialsAccounts.length > 0) {
            const selectedCredentials = randomSelectFromArray(accountsConfig.googleAppCredentialsAccounts);
            if (selectedCredentials.project) {
              process.env.GOOGLE_CLOUD_PROJECT = selectedCredentials.project
            }
            account = selectedCredentials.account;
            process.env.GOOGLE_APPLICATION_CREDENTIALS = await saveCredentialsToTempFile(selectedCredentials);
            console.log(`当前使用的账号是: ${account}`)
          }
          else {
            throw new Error("No valid Google credentials found for LOGIN_WITH_GOOGLE auth type");
          }
          break;
        }

      case AuthType.USE_GEMINI:
        if (accountsConfig.geminiApiKeyAccounts && accountsConfig.geminiApiKeyAccounts.length > 0) {
          process.env.GEMINI_API_KEY = randomSelectFromArray(accountsConfig.geminiApiKeyAccounts);
        } else {
          throw new Error("No valid Gemini API keys found for USE_GEMINI auth type");
        }
        break;
      case AuthType.USE_VERTEX_AI:
        if (accountsConfig.googleApiKeyAccounts && accountsConfig.googleApiKeyAccounts.length > 0) {
          process.env.GOOGLE_API_KEY = randomSelectFromArray(accountsConfig.googleApiKeyAccounts);
          process.env.GOOGLE_GENAI_USE_VERTEXAI = 'true';
        } else {
          throw new Error("No valid Google API keys found for USE_VERTEX_AI auth type");
        }
        break;
    }
    const codeAssist = await createCodeAssist(accountsConfig.authType);
    return { codeAssist, account }
  }
}

// Cache for code assist instance
let codeAssist = null;

/**
 * Get code assist instance (singleton pattern)
 */
export async function GetCodeAssist() {
  if (config.appAccountsEnabled) {
    const accountsManager = await AccountsManager.getInstance();
    return await accountsManager.getCodeAssist();
  }

  if (codeAssist != null) {
    return { codeAssist, account: "" };
  }

  const authType = await getAuthTypeFromEnv();
  codeAssist = await createCodeAssist(authType);
  return { codeAssist, account: "" };
}

export { AccountsManager };