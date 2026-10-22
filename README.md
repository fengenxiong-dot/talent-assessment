# 人才盘点评价系统

把评价对象、评价关系、评分和进度集中管理，为人才盘点提供过程数据。

[项目主页](https://github.com/fengenxiong-dot/talent-assessment) · [作者与项目合集](https://github.com/fengenxiong-dot) · [许可证](LICENSE)

## 为什么做这个工具

人才盘点不仅需要一张结果表，还需要明确谁评价谁、使用哪些指标、进度如何以及分数怎样汇总。这个项目围绕 HR 组织评价时的过程管理需求，提供前后端工作区，用于继续完善和试验内部人才评价流程。

## 核心功能

- 管理员与评价人角色相关接口。
- 评价问卷与指标管理。
- 配置评价对象、评价人及评价关系和权重。
- 评价人查看自己的任务并提交评分。
- 查看评价进度与汇总结果。
- 包含联系人维护、钉钉身份接入及通知相关代码。

## 适合哪些场景

- 组织内部的人才盘点与多评价人评分。
- 需要跟踪评价覆盖率和任务完成进度的项目。
- 希望在现有 HR 场景上继续定制评价流程的开发实践。

## 第一次使用

### 准备环境

Node.js、pnpm、PostgreSQL；真实钉钉接入需要自己的企业应用。前端使用 React/Vite，后端使用 Express/TypeScript。

下载方式：会使用 Git 可按下面的命令克隆；也可在本页点击 **Code → Download ZIP**，解压后在项目目录打开终端，跳过 `git clone` 和 `cd` 两步。

### 安装与启动

```sh
git clone https://github.com/fengenxiong-dot/talent-assessment.git
cd talent-assessment
pnpm install
```

1. 在 PostgreSQL 创建测试数据库，并执行 `packages/backend/src/schema.sql`。例如已有本机数据库 `talent` 时：`psql -d talent -f packages/backend/src/schema.sql`。
2. 将根目录 `.env.example` 复制为 `packages/backend/.env`，设置 `DATABASE_URL`、随机 `JWT_SECRET` 及需要的钉钉参数。
3. 根据自己的钉钉应用，在前端配置 `VITE_DINGTALK_CORP_ID`、`VITE_DINGTALK_CLIENT_ID`；开发模拟模式使用 `VITE_MOCK_DINGTALK=true`，仅限本地测试。
4. 初始化管理员：`pnpm --filter @talent/backend run init-admin YOUR_DINGTALK_USER_ID 管理员`。请使用你自己的测试用户标识。
5. 运行 `pnpm dev`，访问 `http://localhost:5173`；默认后端端口为 3000。

### 操作流程

1. 先完成数据库初始化、身份接入与管理员配置。
2. 使用虚构联系人建立测试问卷和指标。
3. 建立评价对象、评价人及评价关系。
4. 以测试评价人提交评分，检查管理员看到的进度和汇总。
5. 核对权重、评分范围和统计口径后，再按实际流程继续定制。

## 当前状态与限制

当前属于需要技术配置的早期源码版本，不是下载即用的成品。初始化脚本、数据库连接、钉钉权限和前后端联调尚未在全新环境完整验证；没有提供生产部署承诺。盘点数据与判断应由授权人员复核。

**验证情况：** 本次核对了工作区、初始化脚本和数据库结构；未执行依赖安装、TypeScript 构建或数据库联调。

## 数据保存与配置

业务数据存放在你配置的 PostgreSQL 中，附件位置与备份方案需在部署时确认。

公开仓库只提供源码与示例配置。真实人员资料、业务文件、数据库和 API Key 需要由使用者自行管理。先用虚构数据走通流程，确认符合自己的需求后再投入实际工作。

## 关于作者

我是人力资源行业从业者，从完全零基础、零代码起步，通过 Web Coding 与 AI 辅助开发，把工作中的需求逐步做成工具。我主要负责场景梳理、需求描述、业务流程、试用反馈和迭代；代码实现借助 AI 完成。这些项目记录的是业务人员解决实际问题的实践过程。

如果你也在人力资源、培训或日常办公中遇到类似问题，欢迎通过本仓库 Issues 描述场景、复现问题或提出改进建议，请使用虚构示例。

## 更多说明

- [历史技术说明](TECHNICAL_GUIDE.md)：保留原有配置、功能细节和开发记录，注意其中的环境差异。
- [初次开源发布说明](OPEN_SOURCE_RELEASE.md)
- [第三方依赖说明](THIRD_PARTY_NOTICES.md)

## 许可证

本项目源码采用 **MIT**，见 [LICENSE](LICENSE)。第三方依赖保留各自许可证。
