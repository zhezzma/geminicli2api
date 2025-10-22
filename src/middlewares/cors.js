import { handleCors, appendCorsPreflightHeaders, appendCorsHeaders, isPreflightRequest } from 'h3';

const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: "*",
  allowedHeaders: "*",
  exposeHeaders: "*",
  credentials: false,
  maxAge: 86400, // 24 hours
  preflight: {
    statusCode: 204
  }
};
/**
 * CORS (跨域资源共享) 中间件。
 * 使用 H3 内置的 CORS 处理功能。
 * @param {import('h3').H3Event} event - H3 事件对象。
 * @param {import('h3').next} next - 下一个中间件函数。
 * @returns {Response|void} 如果是 OPTIONS 预检请求，则返回处理结果。
 */

export default async function corsMiddleware(event, next) {
  const corsRes = handleCors(event, corsOptions);
  if (isPreflightRequest(event)) {
    return corsRes;
  }
  if (corsRes !== false) {
    return corsRes;
  }
  const rawBody = await next();
  // [intercept response]
  return rawBody;
}

 