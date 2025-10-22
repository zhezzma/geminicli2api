# GeminiCLI2API

🚀 一个将 OpenAI API 请求格式转换为 Google Gemini CLI 格式的 HTTP 服务器

## 📖 简介

GeminiCLI2API 是一个轻量级的 HTTP 服务器，它提供了与 OpenAI API 兼容的接口，但底层使用 Google Gemini CLI Core 来处理请求。这使得你可以使用任何支持 OpenAI API 格式的客户端来访问 Google Gemini 的强大功能。

## ✨ 特性

- 🔄 **OpenAI 兼容**: 提供标准的 `/v1/chat/completions` 端点
- 🤖 **Gemini 驱动**: 使用 Google Gemini CLI Core 作为后端
- 🔐 **身份验证**: 支持 API Token 认证
- 🌐 **CORS 支持**: 内置 CORS 中间件，便于前端集成
- 🎯 **轻量高效**: 基于 H3 框架，性能出色
- 🔧 **灵活配置**: 通过环境变量轻松配置
- 📊 **健康检查**: 提供健康检查端点
- 🐳 **Docker 支持**: 可轻松容器化部署

## 📋 前置要求

- Node.js 18+ 
- Google Cloud 账户和相应的认证凭据
- OAuth 2.0 凭据文件 (`oauth_creds.json`)

## 🚀 快速开始

### 安装