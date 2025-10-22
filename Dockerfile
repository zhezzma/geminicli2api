# 多阶段构建 - 构建阶段
FROM node:23-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖（包括 devDependencies 用于构建）
RUN npm ci

# 复制源代码和构建脚本
COPY . .

# 构建项目
RUN npm run build

# 生产阶段
FROM node:23-alpine

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 只安装生产依赖
RUN npm ci --omit=dev && \
    npm cache clean --force

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist

# 复制必要的配置文件（如果需要）
COPY .env.example .env.example

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 设置环境变量
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# 启动应用
CMD ["node", "dist/index.js"]