
import config from './config.js';
import { AuthType, createCodeAssistContentGenerator, createContentGeneratorConfig, createContentGenerator, Config, Storage } from '@google/gemini-cli-core';
import fs from 'node:fs';


//账号的项目需要开启cloudaicompanion.googleapis.com服务
//使用网页激活api
//https://console.cloud.google.com/products?authuser=2
//https://console.cloud.google.com/gemini-admin/products?authuser=1
//https://console.cloud.google.com/marketplace/product/google/cloudaicompanion.googleapis.com?authuser=1 
//https://console.cloud.google.com/apis/library/cloudaicompanion.googleapis.com?authuser=1  //同上
//https://console.cloud.google.com/apis/api/cloudaicompanion.googleapis.com/metrics?project=luminous-empire-428206-e6&authuser=2 //需要带上项目

//使用shell激活api
//https://shell.cloud.google.com/?authuser=3&hl=zh_CN&fromcloudshell=true&show=ide%2Cterminal
//gcloud projects list
//gcloud services enable cloudaicompanion.googleapis.com --project=celtic-tendril-437511-t2  //开启这个就可以了
//gcloud services enable aiplatform.googleapis.com --project=celtic-tendril-437511-t2
//gcloud services enable generativelanguage.googleapis.com --project=celtic-tendril-437511-t2
//gcloud services list --enabled --project=celtic-tendril-437511-t2

//一行开启所有项目的cloudaicompanion.googleapis.com服务,查看进度: 如果想看到每个项目的执行结果,可以添加 echo:

//只要开启了cloudaicompanion.googleapis.com服务的项目都可以...有时会enable失败,因为没有权限(位于geminicli创建的组织),但他是可用的
//gcloud projects list --format="value(projectId)" | xargs -I {} sh -c 'echo "Enabling for project: {}" && gcloud services enable cloudaicompanion.googleapis.com --project={}'
//gcloud projects list --format="value(projectId)" | xargs -I {} gcloud services enable cloudaicompanion.googleapis.com --project={}
//gcloud projects list --format="value(projectId)" - 列出所有项目的 ID
//xargs -I {} - 将每个项目 ID 传递给后续命令
//xargs -P 10 -I {}  表示并行执行 10 个任务
//gcloud services enable cloudaicompanion.googleapis.com --project={} - 为每个项目启用服务
//gcloud projects list --filter="projectId:prefix-*" --format="value(projectId)" 过滤特定项目


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



async function loadCodeAssist(accessToken) {
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
}

const filterProjects = {
    "zhemima@gmail.com": [
        "optimal-connection-cqkn2" //开启了快速模式后造成的
    ]
}


async function discoverProjects(account, accessToken) {
    const responseProjects = await fetch(
        'https://cloudresourcemanager.googleapis.com/v3/projects:search?query=state:active',
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        }
    );
    const projectsResult = await responseProjects.json();
    console.log(projectsResult)
    const enabledProjects = projectsResult.projects.map((project) => project.projectId).filter(x => !filterProjects[account]?.includes(x));
    return enabledProjects;
}

async function auth() {
    // const p = await discoverProjects("zhepama@gmail.com", "ya29.a0AQQ_BDTF3umHYOHwMWdEPKorA79v2fOKPxW2wSWah69r9Iq2FUDy0Pygx0SWMFGkfwgmzdxVk4H1uioMCb7G9pwIaQqdEFB2xSrM1OSV8LJaYK0x4qfKpOqom7sTn9ho60A7wl70vTdrPliaH3gHXPuhF8oRBaOel1qbn4S8WLlOUrY6Q3bT_AcvgEm9GrSLno5_BKU5NO7q2waCgYKAbcSARcSFQHGX2Minr6r5dgSZq4ohm1gbF3W6A0213");
    // console.log(p)
    // return;

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
        targetDir: "",
        debugMode: false,
        question: '',
        noBrowser: false,//当为true会获得一个连接..然后访问输入 authorization code
    });

    //先随便设置一个,只要不报错就可以..
    process.env.GOOGLE_CLOUD_PROJECT = "5555555555"

    //都会存储到oauth_creds
    await geminiConfig.refreshAuth(AuthType.LOGIN_WITH_GOOGLE);

    const accounts = getFileContent(account_path);

    const oauth_creds = getFileContent(oauth_creds_path);

    const projects = await discoverProjects(accounts.active, oauth_creds.access_token);

    const newAccounts = projects.map(project_id => {
        return {
            account: accounts.active,
            project_id,
            ...oauth_creds,
        }
    });

    const appAccountsData = getFileContent(config.appAccountsPath);
    const oldAccounts = appAccountsData.googleAppCredentialsAccounts.filter(x => x.account != accounts.active);
    appAccountsData.googleAppCredentialsAccounts = [...oldAccounts, ...newAccounts]


    console.log(JSON.stringify(newAccounts, null, 2));

    return;
    fs.writeFileSync(config.appAccountsPath, JSON.stringify(appAccountsData, null, 2));
}

auth()