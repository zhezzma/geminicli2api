
import config from './config.js';
import { AuthType, createCodeAssistContentGenerator, createContentGeneratorConfig, createContentGenerator, Config, Storage } from '@google/gemini-cli-core';
import fs from 'node:fs';

function getFileContent(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (err) {
        console.error(`${label}: failed to read file:`, err);
    }
    return null;
}
const oauth_creds_path = Storage.getOAuthCredsPath();
const account_path = Storage.getGoogleAccountsPath();


try {
    if (oauth_creds_path && fs.existsSync(oauth_creds_path)) {
        fs.unlinkSync(oauth_creds_path);
        console.log(`Deleted file: ${oauth_creds_path}`);
    }
} catch (err) {
    console.error('Failed to delete oauth_creds_path:', err);
}

try {
    if (account_path && fs.existsSync(account_path)) {
        fs.unlinkSync(account_path);
        console.log(`Deleted file: ${account_path}`);
    }
} catch (err) {
    console.error('Failed to delete account_path:', err);
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

// zheaama  "avian-pact-427320-p2"
process.env.GOOGLE_CLOUD_PROJECT = "avian-pact-427320-p2"

const projects = {
    "zheaama@gmail.com": "avian-pact-427320-p2",
}




//都会存储到oauth_creds
await geminiConfig.refreshAuth(AuthType.LOGIN_WITH_GOOGLE);

const accounts = getFileContent(account_path);;

const oauth_creds = getFileContent(oauth_creds_path);

oauth_creds.account = accounts.active;
oauth_creds.project = projects[oauth_creds.account];

console.log(JSON.stringify(oauth_creds, null, 2));