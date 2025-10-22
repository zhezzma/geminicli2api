
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


//https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/code_assist/oauth2.ts
const OAUTH_CLIENT_ID =
    '681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com';
const OAUTH_CLIENT_SECRET = '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';
//https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/code_assist/server.ts#L45
const CODE_ASSIST_ENDPOINT = 'https://cloudcode-pa.googleapis.com';
const CODE_ASSIST_API_VERSION = 'v1internal';

const projects = {
    "zhemima@gmail.com": "celtic-tendril-437511-t2"
}

async function discoverProjectId(account, accessToken) {
    if (projects[account]) {
        return projects[account]
    }
    const initialProjectId = "default-project";
    const response = await fetch(`${CODE_ASSIST_ENDPOINT}/${CODE_ASSIST_API_VERSION}:loadCodeAssist`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            cloudaicompanionProject: initialProjectId,
            metadata: { duetProject: initialProjectId }
        })
    });

    const projectDiscoveryResponse = await response.json();
    console.log(JSON.stringify(projectDiscoveryResponse))
    if (projectDiscoveryResponse.cloudaicompanionProject) {
        return projectDiscoveryResponse.cloudaicompanionProject;
    }

    const response2 = await fetch(
        'https://cloudresourcemanager.googleapis.com/v1/projects',
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        }
    );
    const data = await response2.json();
    console.log(data)
    //找出可用的projectId
    if (data.projects && Array.isArray(data.projects)) {
        const activeProject = data.projects.find(project => project.lifecycleState === 'ACTIVE');
        if (activeProject) {
            return activeProject.projectId;
        }
    }



    return ""
}

async function auth() {

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

    //先随便设置一个,只要不报错就可以..
    process.env.GOOGLE_CLOUD_PROJECT = "5555555555"

    //都会存储到oauth_creds
    await geminiConfig.refreshAuth(AuthType.LOGIN_WITH_GOOGLE);

    const accounts = getFileContent(account_path);;

    const oauth_creds = getFileContent(oauth_creds_path);

    oauth_creds.account = accounts.active;
    const project = await discoverProjectId(oauth_creds.account, oauth_creds.access_token);
    if (project) {
        oauth_creds.project = project;

        //使用网页激活api
        //https://console.cloud.google.com/products?authuser=2
        //https://console.cloud.google.com/gemini-admin/products?authuser=1
        //https://console.cloud.google.com/marketplace/product/google/cloudaicompanion.googleapis.com?authuser=1
        //https://console.cloud.google.com/apis/library/cloudaicompanion.googleapis.com?authuser=1
       
        //使用shell激活api
        //https://shell.cloud.google.com/?authuser=3&hl=zh_CN&fromcloudshell=true&show=ide%2Cterminal
        //gcloud projects list
        //gcloud services enable cloudaicompanion.googleapis.com --project=celtic-tendril-437511-t2
        //gcloud services enable aiplatform.googleapis.com --project=celtic-tendril-437511-t2
        //gcloud services enable generativelanguage.googleapis.com --project=celtic-tendril-437511-t2
        //gcloud services list --enabled --project=celtic-tendril-437511-t2
    }
    else {
        console.log("没有获得项目请手动设置到 projects 中")
    }
    console.log(JSON.stringify(oauth_creds, null, 2));
}

auth()