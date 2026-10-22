# 历史技术说明

> 以下保留项目原有开发与配置细节，部分内容描述原开发环境；首次使用请以 [README](README.md) 为入口。文中提到的本机依赖、账号、安装包和运行数据不随开源仓库提供。

# 人才盘点评价系统

包含管理端、评价端、关系配置、评分、进度和汇总接口的 TypeScript 工作区。前端位于 packages/frontend，服务端位于 packages/backend。

使用 Node.js 和 pnpm 安装依赖：`pnpm install`，开发启动：`pnpm dev`，构建：`pnpm build`。

需要自行准备 PostgreSQL 并配置 .env.example 中的环境变量。钉钉登录和通知需要自己的应用。数据库初始化与线上部署尚未完成开源环境验证。请勿直接用于真实人员评价，先使用虚构数据完成联调。
