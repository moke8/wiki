# 本仓库改动说明

> 本仓库基于 Wiki.js 二次开发。以下内容用于说明本仓库相对官方 Wiki.js 的主要改动、开发方式和部署方式。下方原官方 README 内容保持不变。

## 主要功能改动

- **Zidan 主题**
  - 新增并启用 `zidan` 主题，包含页面布局、左侧目录树、右侧目录/元信息栏、页脚、搜索结果列表、悬浮按钮、暗色模式等主题定制。
  - 主题文件主要位于 `client/themes/zidan/`。
  - 主题列表中注册了 `zidan`，可在后台主题设置中选择。
  - zidan 主题会根据后台 `/a/general` 配置的 Logo URL 动态设置浏览器 favicon；未配置 Logo 时回退到原 `/favicon.ico`。

- **文章数据向量化 / 语义搜索**
  - 新增基于 PostgreSQL + pgvector 的文章向量化能力。
  - 支持通过 OpenAI 兼容的 Embedding API 生成文章分块向量。
  - 支持向量检索相关配置，设计说明见 `docs/vector-search-design.md`。
  - 本地开发和生产 Docker 配置均使用 `pgvector/pgvector:pg17` 作为数据库镜像。

- **AI 问答**
  - 新增页面侧 AI Chat / AI 问答入口与前端组件。
  - AI 问答与向量检索能力配合使用，用于基于知识库内容进行问答。
  - 前端组件主要位于 `client/components/common/ai-chat.vue`，zidan 页面中已集成入口。

- **知识库 MCP 支持**
  - 新增面向智能体的 MCP JSON-RPC HTTP endpoint：`POST /mcp`。
  - 后台新增 MCP API Key 管理入口：`/a/mcp`，支持名称、IP 限制、撤销和最后使用时间查看。
  - MCP Key 不做用户级权限区分，可消费全站已发布文章。
  - 当前暴露 `wiki_search`、`wiki_get_page`、`wiki_tree`、`wiki_retrieve_context` 等知识库工具。
  - 功能说明见 `docs/mcp-knowledge-base.md`。

- **文件夹别名 / 目录展示增强**
  - 增强目录树展示能力，支持更适合知识库导航的文件夹展示与别名/标题化展示场景。
  - zidan 主题左侧目录树位于 `client/themes/zidan/components/nav-sidebar.vue`。

- **Markdown ZIP 批量导入**
  - 管理后台新增 Markdown ZIP 批量导入能力，可一次性上传包含多个 `.md` 文件的压缩包并批量创建文章。
  - 导入逻辑会校验压缩包内容，仅处理 Markdown 文件，并避免目录、非法路径等不安全输入。
  - 批量导入时文章路径默认使用 UUID 生成，避免中文标题直接进入 URL 路径带来的编码、可读性不稳定和重名冲突问题，更适合中文知识库场景。
  - 批量导入主要面向已有 Markdown 文档迁移，适合将本地文档批量导入为 Wiki 页面。

- **文章路径 UUID 化**
  - 新建文章路径不再依赖固定的 `new-page` 或中文标题 slug，而是默认生成 UUID 作为页面路径。
  - 单独创建文章时也默认使用 UUID 路径，标题可继续使用中文，URL 路径保持稳定、唯一且不受中文分词/转写规则影响。
  - 该策略降低了中文化场景下路径编码、标题重名、标题变更影响链接等问题，文章展示名称仍以页面标题和目录标题为准。

- **文章页 SPA 跳转**
  - 前台普通文章页面之间支持无刷新跳转：点击侧边栏文章、文章正文内同站文章链接、文章页内搜索结果时，会通过接口加载目标文章并局部更新当前页面。
  - 首次访问、刷新和分享链接仍使用服务端 `res.render('page')` 输出完整页面，不影响 SEO、分享卡片和无 JS 访问基础能力。
  - SPA 范围仅限普通文章页之间；管理后台 `/a`、编辑 `/e`、历史 `/h`、源码 `/s`、下载 `/d`、标签页 `/t`、个人中心 `/p`、登录登出等仍保持整页跳转。
  - 新增文章数据接口 `GET /_page/:locale/:path`，复用服务端文章权限、发布状态、评论模板、目录等渲染数据逻辑。
  - SPA 切换后会更新文章标题、描述、正文、评论区域、TOC、面包屑、Vuex 页面状态、浏览器地址和 meta 信息，并重新执行代码高亮、Mermaid、正文链接拦截等页面增强逻辑。
  - 左侧目录树在文章 SPA 切换时不会重新加载整棵树，仅更新当前文章激活状态；语言切换时仍会重新加载对应语言目录树。
  - 相关前端改动主要位于 `client/helpers/index.js`、`client/themes/default/components/page.vue`、`client/themes/zidan/components/page.vue` 以及两个主题的 `nav-sidebar.vue`。

- **界面与交互修正**
  - 优化 zidan 主题下搜索栏、搜索结果列表、编辑悬浮按钮、AI Chat 悬浮按钮、返回顶部按钮等样式。
  - 修复 Vuex `startLoading` 不存在导致的 `[vuex] unknown action type: startLoading` 报错。

## 开发方式

本仓库开发模式为：**依赖服务使用 Docker，Wiki.js 应用在宿主机通过 npm/yarn 启动**。

### 1. 启动本地依赖服务

```bash
cd docker/dev
docker compose up -d
```

该环境只启动开发依赖服务：

- PostgreSQL + pgvector：`localhost:15432`
- Adminer：`http://localhost:3001`

> Adminer 仅用于本地查看和调试数据库，不是 Wiki.js 管理后台。Wiki.js 管理后台仍是应用内 `/a`。

### 2. 启动 Wiki.js 开发服务

在项目根目录启动：

```bash
CONFIG_FILE=docker/dev/config.yml npm run dev
```

Windows PowerShell 可使用：

```powershell
$env:CONFIG_FILE="docker/dev/config.yml"
npm run dev
```

如果使用 yarn：

```bash
CONFIG_FILE=docker/dev/config.yml yarn dev
```

> 注意：宿主机开发连接 Docker 数据库时，`docker/dev/config.yml` 应指向 `localhost:15432`。

## 生产部署方式

本仓库包含源码改动，生产环境不应直接使用官方镜像 `requarks/wiki:2`，否则不会包含 zidan 主题、向量化、AI 问答等本仓库改动。

生产部署使用当前源码构建自定义镜像：

```bash
cd docker/prod
cp .env.example .env
# 修改 .env 中的 POSTGRES_PASSWORD 等配置
docker compose up -d --build
```

生产部署配置位于：

- `docker/prod/docker-compose.yml`
- `docker/prod/.env.example`

生产 compose 会：

- 使用 `dev/build/Dockerfile` 从当前源码构建 Wiki.js 镜像。
- 使用 `pgvector/pgvector:pg17` 作为 PostgreSQL 数据库。
- 使用 Docker volume 持久化数据库和 Wiki.js data 目录。

更新应用镜像：

```bash
cd docker/prod
docker compose up -d --build --force-recreate --no-deps wiki
```

> 修改前端、主题、Vue 组件或主题 JS 后，必须重新构建镜像或重新执行前端构建；仅重启 Node 服务不会更新已打包的 `assets` 文件。

---

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://static.requarks.io/logo/wikijs-full-darktheme.svg">
  <img alt="Wiki.js" src="https://static.requarks.io/logo/wikijs-full.svg" width="600">
</picture>

[![Release](https://img.shields.io/github/release/Requarks/wiki.svg?style=flat&maxAge=3600)](https://github.com/Requarks/wiki/releases)
[![License](https://img.shields.io/badge/license-AGPLv3-blue.svg?style=flat)](https://github.com/requarks/wiki/blob/master/LICENSE)
[![Standard - JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-green.svg?style=flat&logo=javascript&logoColor=white)](http://standardjs.com/)
[![Build + Publish](https://github.com/Requarks/wiki/actions/workflows/build.yml/badge.svg)](https://github.com/Requarks/wiki/actions/workflows/build.yml)  
[![GitHub Sponsors](https://img.shields.io/github/sponsors/ngpixel?logo=github&color=ea4aaa)](https://github.com/users/NGPixel/sponsorship)
[![Open Collective backers and sponsors](https://img.shields.io/opencollective/all/wikijs?label=backers&color=218bff&logo=opencollective&logoColor=white)](https://opencollective.com/wikijs)
[![Downloads](https://img.shields.io/github/downloads/Requarks/wiki/total.svg?style=flat&logo=github)](https://github.com/Requarks/wiki/releases)
[![Docker Pulls](https://img.shields.io/docker/pulls/requarks/wiki.svg?logo=docker&logoColor=white)](https://hub.docker.com/r/requarks/wiki/)  
[![Chat on Discord](https://img.shields.io/badge/discord-join-8D96F6.svg?style=flat&logo=discord&logoColor=white)](https://discord.gg/rcxt9QS2jd)
[![Follow on Bluesky](https://img.shields.io/badge/bluesky-%40js.wiki-blue.svg?style=flat&logo=bluesky&logoColor=white)](https://bsky.app/profile/js.wiki)
[![Follow on Telegram](https://img.shields.io/badge/telegram-%40wiki__js-blue.svg?style=flat&logo=telegram)](https://t.me/wiki_js)
[![Reddit](https://img.shields.io/badge/reddit-%2Fr%2Fwikijs-orange?logo=reddit&logoColor=white)](https://www.reddit.com/r/wikijs/)

##### A modern, lightweight and powerful wiki app built on NodeJS

</div>

- **[Official Website](https://js.wiki/)**
- **[Documentation](https://docs.requarks.io/)**
- [Requirements](https://docs.requarks.io/install/requirements)
- [Installation](https://docs.requarks.io/install)
- [Demo](https://docs.requarks.io/demo)
- [Changelog](https://github.com/requarks/wiki/releases)
- [Feature Requests](https://feedback.js.wiki/wiki)
- Chat with us on [Discord](https://discord.gg/rcxt9QS2jd)
- [Translations](https://docs.requarks.io/dev/translations) *(We need your help!)*
- [Special Thanks](#special-thanks)
- [Contribute](#contributors)

[Follow our Twitter feed](https://twitter.com/requarks) to learn about upcoming updates and new releases!

<h2 align="center">Donate</h2>

<div align="center">

Wiki.js is an open source project that has been made possible due to the generous contributions by community [backers](https://js.wiki/about). If you are interested in supporting this project, please consider [becoming a sponsor](https://github.com/users/NGPixel/sponsorship), [becoming a patron](https://www.patreon.com/requarks), donating to our [OpenCollective](https://opencollective.com/wikijs), via [Paypal](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=FLV5X255Z9CJU&source=url) or via Ethereum (`0xe1d55c19ae86f6bcbfb17e7f06ace96bdbb22cb5`).
  
  [![Become a Sponsor](https://img.shields.io/badge/donate-github-ea4aaa.svg?style=popout&logo=github)](https://github.com/users/NGPixel/sponsorship)
  [![Become a Patron](https://img.shields.io/badge/donate-patreon-orange.svg?style=popout&logo=patreon)](https://www.patreon.com/requarks)
  [![Donate on OpenCollective](https://img.shields.io/badge/donate-open%20collective-blue.svg?style=popout&logo=data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIHdpZHRoPSIyNTZweCIgaGVpZ2h0PSIyNTZweCIgdmlld0JveD0iMCAwIDI1NiAyNTYiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgcHJlc2VydmVBc3BlY3RSYXRpbz0ieE1pZFlNaWQiPjxnPjxwYXRoIGQ9Ik0yMDkuNzY1MTQ0LDEyOC4xNDk5NzkgQzIwOS43NjUxNDQsMTQ0LjE2MzMgMjA0Ljg2NDM4MSwxNTkuNDg5ODkgMTk2LjQ5ODc0NywxNzIuNzI1MDcyIEwyMjkuOTQ1Njc1LDIwNi4xNzE5OTkgQzI0Ni42ODIxMDUsMTgzLjg1Njc1OSAyNTUuNzI5MzA3LDE1Ni43MTUxNTIgMjU1LjcyOTMwNywxMjguODIxMTAyIEMyNTUuNzI5MzA3LDk5LjU1Njk5MTcgMjQ1Ljk3NDYwMyw3My4wNzEwMjA3IDIyOS4yNTg5NDQsNTEuNDg1ODEyOCBMMTk2LjQ4MzE0LDg0LjIxNDc5NCBDMjA1LjEyMjU2MSw5Ny4yMjI0NjgzIDIwOS43MzY5MDcsMTEyLjQ4NzgxIDIwOS43NDk1MzcsMTI4LjEwMzE1NiBMMjA5Ljc2NTE0NCwxMjguMTQ5OTc5IFoiIGZpbGw9IiNCOEQzRjQiPjwvcGF0aD48cGF0aCBkPSJNMTI3LjUxMzQ4NCwyMTAuMzU0ODE2IEM4Mi4xNDYwODcyLDIxMC4yNjg5NTggNDUuMzg3NTA5NCwxNzMuNTE3MzU4IDQ1LjI5MzAzOTMsMTI4LjE0OTk3OSBDNDUuMzYxNzUwMiw4Mi43NjQzMTM4IDgyLjEyNzg0ODcsNDUuOTg0MjU3IDEyNy41MTM0ODQsNDUuODk4MzE4NiBDMTQ0LjI0NDc1Miw0NS44OTgzMTg2IDE1OS41NzEzNDIsNTAuNzk5MDgxNyAxNzIuMTE5NzkyLDU5LjE2NDcxNTQgTDIwNC44NjQzODEsMjYuMzg4OTExNiBDMTgyLjU0MzY1LDkuNjY2NjUxMjkgMTU1LjQwMzQyOSwwLjYzMDg2MzI5OCAxMjcuNTEzNDg0LDAuNjM2NDk0NDAzIEM1Ny4xMjM1NDM3LDAuNjM2NDk0NDAzIDAsNTcuNzYwMDM4MSAwLDEyOC4xNDk5NzkgQzAsMTk4LjUwODcwNCA1Ny4xMjM1NDM3LDI1NS42NjM0NjMgMTI3LjUxMzQ4NCwyNTUuNjYzNDYzIEMxNTUuNTM3MzUyLDI1NS43NDA4NzYgMTgyLjc3NTk4OSwyNDYuNDA4NTEgMjA0Ljg2NDM4MSwyMjkuMTYxODg0IEwxNzEuNDE3NDU0LDE5NS43MzA1NjQgQzE1OS41NTU3MzQsMjA1LjQ4NTI2OCAxNDQuMjYwMzU5LDIxMC4zNTQ4MTYgMTI3LjUxMzQ4NCwyMTAuMzU0ODE2IEwxMjcuNTEzNDg0LDIxMC4zNTQ4MTYgWiIgZmlsbD0iIzdGQURGMiI+PC9wYXRoPjwvZz48L3N2Zz4=)](https://opencollective.com/wikijs)
  [![Donate via Paypal](https://img.shields.io/badge/donate-paypal-blue.svg?style=popout&logo=paypal)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=FLV5X255Z9CJU&source=url)  
  [![Donate via Ethereum](https://img.shields.io/badge/donate-ethereum-999.svg?style=popout&logo=ethereum&logoColor=CCC)](https://etherscan.io/address/0xe1d55c19ae86f6bcbfb17e7f06ace96bdbb22cb5)
  [![Donate via Bitcoin](https://img.shields.io/badge/donate-bitcoin-ff9900.svg?style=popout&logo=bitcoin&logoColor=CCC)](https://checkout.opennode.com/p/2553c612-f863-4407-82b3-1a7685268747)
  [![Buy a T-Shirt](https://img.shields.io/badge/buy-t--shirts-teal.svg?style=popout&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHg9IjBweCIgeT0iMHB4Igp3aWR0aD0iMjQiIGhlaWdodD0iMjQiCnZpZXdCb3g9IjAgMCAxOTIgMTkyIgpzdHlsZT0iIGZpbGw6IzAwMDAwMDsiPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0ibm9uemVybyIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1saW5lY2FwPSJidXR0IiBzdHJva2UtbGluZWpvaW49Im1pdGVyIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHN0cm9rZS1kYXNoYXJyYXk9IiIgc3Ryb2tlLWRhc2hvZmZzZXQ9IjAiIGZvbnQtZmFtaWx5PSJub25lIiBmb250LXdlaWdodD0ibm9uZSIgZm9udC1zaXplPSJub25lIiB0ZXh0LWFuY2hvcj0ibm9uZSIgc3R5bGU9Im1peC1ibGVuZC1tb2RlOiBub3JtYWwiPjxwYXRoIGQ9Ik0wLDE5MnYtMTkyaDE5MnYxOTJ6IiBmaWxsPSJub25lIj48L3BhdGg+PGcgZmlsbD0iIzFhYmM5YyI+PGcgaWQ9InN1cmZhY2UxIj48cGF0aCBkPSJNOTYsMGMtMTUuMjE4NzUsMCAtMjQuNjg3NSwzLjY1NjI1IC0yNS41LDRsLTIyLjUsNy4yNWMtMTAuNDA2MjUsMy4xODc1IC0xOS4wOTM3NSw5LjQzNzUgLTI1LjUsMTguMjVsLTIyLjUsNDIuNWwyNy4yNSwxNi43NWwxMi43NSwtMjR2MTE5LjI1YzAsNC40MDYyNSAyNS4wNjI1LDggNTYsOGMzMC45Mzc1LDAgNTYsLTMuNTkzNzUgNTYsLTh2LTExOS4yNWwxMi43NSwyNGwyNy4yNSwtMTYuNzVsLTIyLjUsLTQyLjVjLTYuNDA2MjUsLTguODEyNSAtMTUuMTU2MjUsLTE1LjA2MjUgLTI0Ljc1LC0xOC4yNWwtMjIuMjUsLTcuMjVjLTAuMTg3NSwwIC0xLjAzMTI1LDEuMzEyNSAtMiwyLjc1bDEuMjUsLTIuNWMwLDAgLTkuODQzNzUsLTQuMjUgLTI1Ljc1LC00LjI1ek05Niw4YzExLjQwNjI1LDAgMTguNDM3NSwyLjI1IDIxLDMuMjVjLTQuNDY4NzUsNS43NSAtMTEuNDA2MjUsMTIuNzUgLTIxLDEyLjc1Yy05LjQwNjI1LDAgLTE2LjQwNjI1LC03LjA2MjUgLTIwLjc1LC0xMi43NWMyLjg3NSwtMS4wNjI1IDkuODc1LC0zLjI1IDIwLjc1LC0zLjI1eiI+PC9wYXRoPjwvZz48L2c+PC9nPjwvc3ZnPg==)](https://wikijs.threadless.com)

</div>

<h2 align="center">Gold Tier Sponsors</h2>

<div align="center">
<table>
  <tbody>
    <tr>
      <td align="center" valign="middle" width="444">
        <a href="https://trans-zero.com/" target="_blank">
          <img src="https://cdn.js.wiki/images/sponsors/transzero.png">
        </a>
      </td>
    </tr>
  </tbody>
</table>
</div>

<h2 align="center">GitHub Sponsors</h2>

Support this project by becoming a sponsor. Your name will show up in the Contribute page of all Wiki.js installations as well as here with a link to your website! [[Become a sponsor](https://github.com/users/NGPixel/sponsorship)]

<div align="center">
<table>
  <tbody>
    <tr>
      <td align="center" valign="middle" width="444">
        <a href="https://www.stellarhosted.com/" target="_blank">
          <img src="https://cdn.js.wiki/images/sponsors/stellarhosted.png">
        </a>
      </td>
    </tr>
  </tbody>
</table>
</div>

<div align="center">
<table>
  <tbody>
    <tr>
      <td align="center" valign="middle" width="130">
        <a href="https://acceleanation.com/" target="_blank">
          <img src="https://avatars.githubusercontent.com/u/41210718?s=200&v=4">
        </a>
      </td>
      <td align="center" valign="middle" width="130">
        <a href="https://github.com/alexksso" target="_blank">
          Alexander Casassovici<br />(@alexksso)
        </a>
      </td>
      <td align="center" valign="middle" width="130">
        <a href="https://github.com/broxen" target="_blank">
          Broxen<br />(@broxen)
        </a>
      </td>
      <td align="center" valign="middle" width="130">
        <a href="https://github.com/xDacon" target="_blank">
          Dacon<br />(@xDacon)
        </a>
      </td>
      <td align="center" valign="middle" width="130">
        <a href="https://github.com/DonNabla" target="_blank">
          Maxime Pierre<br />(@DonNabla)
        </a>
      </td>
      <td align="center" valign="middle" width="130">
        <a href="https://github.com/GigabiteLabs" target="_blank">
          <img src="https://static.requarks.io/sponsors/gigabitelabs-148x129.png">
        </a>
      </td>
      <td align="center" valign="middle" width="130">
        <a href="https://www.hostwiki.com/" target="_blank">
          <img src="https://cdn.js.wiki/images/sponsors/hostwiki.png">
        </a>
      </td>
    </tr>
    <tr>
      <td align="center" valign="middle" width="130">
        <a href="https://github.com/JayDaley" target="_blank">
          Jay Daley<br />(@JayDaley)
        </a>
      </td>
      <td align="center" valign="middle" width="130">
        <a href="https://github.com/idokka" target="_blank">
          Oleksii<br />(@idokka)
        </a>
      </td>
      <td align="center" valign="middle" width="130">
        <a href="https://www.openhost-network.com/" target="_blank">
          <img src="https://avatars.githubusercontent.com/u/114218287?s=200&v=4">
        </a>
      </td>
      <td align="center" valign="middle" width="130">
        <a href="https://www.prevo.ch/" target="_blank">
          <img src="https://avatars.githubusercontent.com/u/114394792?v=4">
        </a>
      </td>
      <td align="center" valign="middle" width="130">
        <a href="https://github.com/shanekearney" target="_blank">
          Shane Kearney<br />(@shanekearney)
        </a>
      </td>
      <td align="center" valign="middle" width="130">
        <a href="http://www.taicep.org/" target="_blank">
          <img src="https://avatars.githubusercontent.com/u/160072306?v=4">
        </a>
      </td>
      <td align="center" valign="middle" width="130"></td>
    </tr>
  </tbody>
</table>

<table><tbody><tr><td>
<img width="441" height="1" />

- Akira Suenami ([@a-suenami](https://github.com/a-suenami))
- Armin Reiter ([@arminreiter](https://github.com/arminreiter))
- Arnaud Marchand ([@snuids](https://github.com/snuids))
- Brian Douglass ([@bhdouglass](https://github.com/bhdouglass))
- Bryon Vandiver ([@asterick](https://github.com/asterick))
- Cameron Steele ([@ATechAdventurer](https://github.com/ATechAdventurer))
- Charlie Schliesser ([@charlie-s](https://github.com/charlie-s))
- Cloud Data Hosting LLC ([@CloudDataHostingLLC](https://github.com/CloudDataHostingLLC))
- Cole Manning ([@RVRX](https://github.com/RVRX))
- CrazyMarvin ([@CrazyMarvin](https://github.com/CrazyMarvin))
- Daniel Horner ([@danhorner](https://github.com/danhorner))
- David Christian Holin ([@SirGibihm](https://github.com/SirGibihm))
- Dragan Espenschied ([@despens](https://github.com/despens))
- Elijah Zobenko ([@he110](https://github.com/he110))
- Emerson-Perna ([@Emerson-Perna](https://github.com/Emerson-Perna))
- Ernie ([@iamernie](https://github.com/iamernie))
- Fabio Ferrari ([@devxops](https://github.com/devxops))
- Finsa S.p.A. ([@finsaspa](https://github.com/finsaspa))
- Florian Moss ([@florianmoss](https://github.com/florianmoss))
- GoodCorporateCitizen ([@GoodCorporateCitizen](https://github.com/GoodCorporateCitizen))
- HeavenBay ([@HeavenBay](https://github.com/heavenbay))
- HikaruEgashira ([@HikaruEgashira](https://github.com/HikaruEgashira))
- Ian Hyzy ([@ianhyzy](https://github.com/ianhyzy))
- Jaimyn Mayer ([@jabelone](https://github.com/jabelone))
- Jay Lee ([@polyglotm](https://github.com/polyglotm))
- Kelly Wardrop ([@dropcoded](https://github.com/dropcoded))
- Loki ([@binaryloki](https://github.com/binaryloki))
- MaFarine ([@MaFarine](https://github.com/MaFarine))
- Marcilio Leite Neto ([@marclneto](https://github.com/marclneto))
- Mattias Johnson ([@mattiasJohnson](https://github.com/mattiasJohnson))
- Max Ricketts-Uy ([@MaxRickettsUy](https://github.com/MaxRickettsUy))
- Mickael Asseline ([@PAPAMICA](https://github.com/PAPAMICA))
- Mitchell Rowton ([@mrowton](https://github.com/mrowton))
        
</td><td>
<img width="441" height="1" />

- M. Scott Ford ([@mscottford](https://github.com/mscottford))
- Nick Halase ([@nhalase](https://github.com/nhalase))
- Nick Price ([@DominoTree](https://github.com/DominoTree))
- Nina Reynolds ([@cutecycle](https://github.com/cutecycle))
- Noel Cower ([@nilium](https://github.com/nilium))
- Oleksandr Koltsov ([@crambo](https://github.com/crambo))
- Phi Zeroth ([@phizeroth](https://github.com/phizeroth))
- Philipp Schmitt ([@pschmitt](https://github.com/pschmitt))
- Robert Lanzke ([@winkelement](https://github.com/winkelement))
- Ruizhe Li ([@liruizhe1995](https://github.com/liruizhe1995))
- Sam Martin ([@ABitMoreDepth](https://github.com/ABitMoreDepth))
- Sean Coffey ([@seanecoffey](https://github.com/seanecoffey))
- Simon Ott ([@ottsimon](https://github.com/ottsimon))
- Stephan Kristyn ([@stevek-pro](https://github.com/stevek-pro))
- Theodore Chu ([@TheodoreChu](https://github.com/TheodoreChu))
- Tim Elmer ([@tim-elmer](https://github.com/tim-elmer))
- Tyler Denman ([@tylerguy](https://github.com/tylerguy))
- Victor Bilgin ([@vbilgin](https://github.com/vbilgin))
- VMO Solutions ([@vmosolutions](https://github.com/vmosolutions))
- YazMogg35 ([@YazMogg35](https://github.com/YazMogg35))
- Yu Yongwoo ([@uyu423](https://github.com/uyu423))
- ameyrakheja ([@ameyrakheja](https://github.com/ameyrakheja))
- aniketpanjwani ([@aniketpanjwani](https://github.com/aniketpanjwani))
- aytaa ([@aytaa](https://github.com/aytaa))
- cesar ([@cesarnr21](https://github.com/cesarnr21))
- chaee ([@chaee](https://github.com/chaee))
- lwileczek ([@lwileczek](https://github.com/lwileczek))
- magicpotato ([@fortheday](https://github.com/fortheday))
- motoacs ([@motoacs](https://github.com/motoacs))
- muzian666 ([@muzian666](https://github.com/muzian666))
- rburckner ([@rburckner](https://github.com/rburckner))
- scorpion ([@scorpion](https://github.com/scorpion))
- valantien ([@valantien](https://github.com/valantien))
        
</td></tr></tbody></table>
</div>

<h2 align="center">OpenCollective Sponsors</h2>

Support this project by becoming a sponsor. Your logo will show up in the Contribute page of all Wiki.js installations as well as here with a link to your website! [[Become a sponsor](https://opencollective.com/wikijs#sponsor)]

<div align="center">
<table>
  <tbody>
    <tr>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/0/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/0/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/1/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/1/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/2/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/2/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/3/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/3/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/4/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/4/avatar.svg"></a>
      </td>
    </tr>
    <tr>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/5/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/5/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/6/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/6/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/7/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/7/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/8/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/8/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/9/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/9/avatar.svg"></a>
      </td>
    </tr>
    <tr>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/10/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/10/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/11/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/11/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/12/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/12/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/13/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/13/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/14/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/14/avatar.svg"></a>
      </td>
    </tr>
    <tr>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/15/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/15/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/16/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/16/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/17/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/17/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/18/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/18/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/19/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/19/avatar.svg"></a>
      </td>
    </tr>
    <tr>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/20/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/20/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/21/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/21/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/22/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/22/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/23/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/23/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/24/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/24/avatar.svg"></a>
      </td>
    </tr>
    <tr>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/25/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/25/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/26/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/26/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/27/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/27/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/28/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/28/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/29/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/29/avatar.svg"></a>
      </td>
    </tr>
    <tr>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/30/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/30/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/31/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/31/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/32/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/32/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/33/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/33/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/34/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/34/avatar.svg"></a>
      </td>
    </tr>
    <tr>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/35/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/35/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/36/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/36/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/37/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/37/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/38/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/38/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/39/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/39/avatar.svg"></a>
      </td>
    </tr>
    <tr>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/40/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/40/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/41/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/41/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/42/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/42/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/43/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/43/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/44/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/44/avatar.svg"></a>
      </td>
    </tr>
    <tr>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/40/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/45/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/41/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/46/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/42/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/47/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/43/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/48/avatar.svg"></a>
      </td>
      <td align="center" valign="middle">
        <a href="https://opencollective.com/wikijs/sponsor/44/website" target="_blank"><img src="https://opencollective.com/wikijs/sponsor/49/avatar.svg"></a>
      </td>
    </tr>
  </tbody>
</table>
</div>

<h2 align="center">Patreon Backers</h2>

Thank you to all our patrons! 🙏 [[Become a patron](https://www.patreon.com/requarks)]

<div align="center">
<table><tbody><tr><td>
<img width="441" height="1" />

- Aeternum
- Al Romano
- Alex Balabanov
- Alex Milanov
- Alex Zen
- Arti Zirk
- Ave
- Brandon Curtis
- Damien Hottelier
- Daniel T. Holtzclaw
- Dave 'Sri' Seah
- djagoo
- dz
- Douglas Lassance
- Ergoflix
- Ernie Reid
- Etienne
- Flemis Jurgenheimer
- Florent
- Günter Pavlas
- hong
- Hope
- Ian
- Imari Childress
- Iskander Callos
  
</td><td>
<img width="441" height="1" />

- Josh Stewart
- Justin Dunsworth
- Keir
- Loïc CRAMPON
- Ludgeir Ibanez
- Lyn Matten
- Mads Rosendahl
- Mark Mansur
- Matt Gedigian
- Mike Ditton
- Nate Figz
- Patryk
- Paul O'Fallon
- Philipp Schürch
- Tracey Duffy
- Quaxim
- Richeir
- Sergio Navarro Fernández
- Shad Narcher
- ShadowVoyd
- SmartNET.works
- Stepan Sokolovskyi
- Zach Crawford
- Zach Maynard
- 张白驹

</td></tr></tbody></table>
</div>

<h2 align="center">OpenCollective Backers</h2>

Thank you to all our backers! 🙏 [[Become a backer](https://opencollective.com/wikijs#backer)]

<a href="https://opencollective.com/wikijs#backers" target="_blank"><img src="https://opencollective.com/wikijs/backers.svg?width=890"></a>

<h2 align="center">Contributors</h2>

This project exists thanks to all the people who contribute. [[Contribute]](https://github.com/Requarks/wiki/blob/master/.github/CONTRIBUTING.md).
<a href="https://github.com/Requarks/wiki/graphs/contributors"><img src="https://opencollective.com/wikijs/contributors.svg?width=890" /></a>

<h2 align="center">Special Thanks</h2>

![Browserstack](https://js.wiki/legacy/logo_browserstack.png)  
[Browserstack](https://www.browserstack.com/) for providing access to their great cross-browser testing tools.

![Cloudflare](https://js.wiki/legacy/logo_cloudflare.png)  
[Cloudflare](https://www.cloudflare.com/) for providing their great CDN, SSL and advanced networking services.

![DigitalOcean](https://js.wiki/legacy/logo_digitalocean.png)  
[DigitalOcean](https://m.do.co/c/5f7445bfa4d0) for providing hosting of the Wiki.js documentation site and APIs.

![Icons8](https://static.requarks.io/logo/icons8-text-h40.png)  
[Icons8](https://icons8.com/) for providing access to their beautiful icon sets.

![Lokalise](https://static.requarks.io/logo/lokalise-text-h40.png)  
[Lokalise](https://lokalise.com/) for providing access to their great localization tool.

![MacStadium](https://static.requarks.io/logo/macstadium-h40.png)  
[MacStadium](https://www.macstadium.com) for providing access to their Mac hardware in the cloud.

![Netlify](https://js.wiki/legacy/logo_netlify.png)  
[Netlify](https://www.netlify.com) for providing hosting for our website.

![ngrok](https://static.requarks.io/logo/ngrok-h40.png)  
[ngrok](https://ngrok.com) for providing access to their great HTTP tunneling services.

![Porkbun](https://static.requarks.io/logo/porkbun.png)  
[Porkbun](https://www.porkbun.com) for providing domain registration services.
