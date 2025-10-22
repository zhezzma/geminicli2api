
import config from './config.js';
import { AuthType, createCodeAssistContentGenerator, createContentGeneratorConfig, createContentGenerator, Config, Storage } from '@google/gemini-cli-core';
import fs from 'node:fs';

function printFileIfExists(label, filePath) {
    try {
        if (!filePath) {
            console.log(`${label}: path is empty or undefined`);
            return;
        }
        if (!fs.existsSync(filePath)) {
            console.log(`${label}: file does not exist: ${filePath}`);
            return;
        }
        const content = fs.readFileSync(filePath, 'utf8');
        console.log(`===== ${label} (${filePath}) =====`);
        console.log(content);
        console.log(`===== end of ${label} =====`);
    } catch (err) {
        console.error(`${label}: failed to read file:`, err);
    }
}

const geminiConfig = new Config({
    sessionId: "",
    model: config.defaultModel,
    embeddingModel: config.defaultEmbeddingModel,
    sandbox: undefined,
    targetDir: config.targetDir,
    debugMode: config.debugMode,
    question: '',
    noBrowser: false,//当为true会获得一个连接..然后访问输入 authorization code
});


//都会存储到oauth_creds
await geminiConfig.refreshAuth(AuthType.LOGIN_WITH_GOOGLE);

const oauth_creds_path = Storage.getOAuthCredsPath();
const account_path = Storage.getGoogleAccountsPath();

printFileIfExists('oauth_creds_path', oauth_creds_path);
printFileIfExists('account_path', account_path);
