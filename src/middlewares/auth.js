import { HTTPError } from 'h3';
import config from '../config.js';

/**
 * API Token 认证中间件。
 * 验证请求头中的 `Authorization: Bearer <token>` 是否与配置的 API_TOKEN 匹配。
 * 如果设置了 USE_APP_TOKEN 环境变量，则跳过 API_TOKEN 认证，改为使用 APP_TOKEN 认证。
 * @param {import('h3').H3Event} event - H3 事件对象。
 * @throws {HTTPError} 如果认证失败，则抛出 H3 错误。
 */
export default function apiTokenAuth(event) {
    // 如果未配置 API_TOKEN，则跳过认证
    if (!config.apiToken) {
        // 在开发环境中，这可能是预期的行为，但在生产中应发出警告
        if (process.env.NODE_ENV === 'production') {
            console.warn('警告: API_TOKEN 未在生产环境中配置，API 对外开放！');
        }
        return false;
    }
    const authHeader = event.req.headers.get("authorization");

    if (!authHeader) {
        throw new HTTPError({
            statusCode: 401,
            statusMessage: 'Unauthorized: Missing Authorization header.'
        });
    }

    const [authType, token] = authHeader.split(' ');

    if (authType !== 'Bearer' || !token) {
        throw new HTTPError({
            statusCode: 401,
            statusMessage: 'Unauthorized: Invalid Authorization header format. Expected: Bearer <token>.'
        });
    }

    if (token !== config.apiToken) {
        throw new HTTPError({
            statusCode: 401,
            statusMessage: 'Unauthorized: Invalid API token.'
        });
    }

    return false;
}