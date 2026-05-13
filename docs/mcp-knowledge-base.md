# 知识库 MCP 支持

本仓库新增了面向智能体的最简 MCP 接入能力，用于让支持 MCP / JSON-RPC 工具调用的智能体检索和读取 Wiki 知识库内容。

## 功能范围

当前版本提供：

- 后台 MCP API Key 管理。
- API Key 名称管理。
- API Key IP 限制。
- API Key 最后使用时间记录。
- MCP JSON-RPC HTTP endpoint。
- 面向知识库的 MCP tools。

当前版本不做用户级权限区分。只要 MCP API Key 有效，即可消费全站已发布文章。

## 后台管理

后台入口：

```text
/a/mcp
```

可管理内容：

- 创建 MCP API Key。
- 设置名称。
- 设置 IP 限制。
- 查看 Key 前缀。
- 查看最后使用时间。
- 撤销 API Key。

IP 限制规则：

- 留空表示不限制 IP。
- 支持多行输入。
- 支持逗号分隔。
- 当前最简版本只支持精确 IP 匹配，不支持 CIDR。

创建成功后，完整 MCP API Key 只显示一次，请立即复制保存。

## 数据存储

MCP API Key 存储在数据库表：

```text
mcpApiKeys
```

迁移文件：

```text
server/db/migrations/2.5.203.js
server/db/migrations-sqlite/2.5.203.js
```

模型文件：

```text
server/models/mcpApiKeys.js
```

字段说明：

| 字段 | 说明 |
|---|---|
| `id` | 主键 |
| `name` | Key 名称 |
| `keyHash` | MCP API Key 的 SHA-256 哈希 |
| `keyPrefix` | Key 前缀，用于后台展示 |
| `ipAllowlist` | IP 白名单，空数组表示不限制 |
| `isRevoked` | 是否已撤销 |
| `lastUsedAt` | 最后使用时间 |
| `createdAt` | 创建时间 |
| `updatedAt` | 更新时间 |

完整 Key 不会明文存储，数据库只保存哈希值。

## MCP Endpoint

HTTP endpoint：

```text
POST /mcp
GET /mcp
```

认证方式：

```http
Authorization: Bearer mcp_xxx
```

`GET /mcp` 仅用于简单健康检查。

`POST /mcp` 使用 JSON-RPC 2.0 请求格式。

## 支持的方法

当前最简版本支持以下 JSON-RPC 方法：

```text
initialize
tools/list
tools/call
notifications/initialized
```

其中除 `initialize` 外，其余方法都需要有效 MCP API Key。

## 支持的 Tools

### wiki_search

搜索已发布 Wiki 页面。

参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `query` | string | 是 | 搜索关键词 |
| `locale` | string | 否 | 语言代码 |
| `path` | string | 否 | 路径前缀 |
| `limit` | integer | 否 | 返回数量，默认 10，最大 50 |

示例：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "wiki_search",
    "arguments": {
      "query": "批量导入 Markdown",
      "locale": "zh",
      "limit": 5
    }
  }
}
```

### wiki_get_page

读取已发布 Wiki 页面内容。

参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `id` | integer | 否 | 页面 ID |
| `path` | string | 否 | 页面路径 |
| `locale` | string | 否 | 使用 `path` 查询时的语言代码 |

`id` 和 `path` 至少提供一个。

返回内容优先为 Markdown 源文 `content`。

示例：

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "wiki_get_page",
    "arguments": {
      "path": "admin/import",
      "locale": "zh"
    }
  }
}
```

### wiki_tree

读取 Wiki 页面树。

参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `locale` | string | 否 | 语言代码 |
| `parent` | integer | 否 | 父级树节点 ID |
| `mode` | string | 否 | `ALL`、`FOLDERS` 或 `PAGES` |
| `limit` | integer | 否 | 返回数量，默认 100，最大 500 |

示例：

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "wiki_tree",
    "arguments": {
      "locale": "zh",
      "limit": 100
    }
  }
}
```

### wiki_retrieve_context

使用向量搜索召回与问题相关的知识库分块。

该工具要求当前启用的搜索引擎为 `vector`，并且页面已完成向量化。

参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `question` | string | 是 | 问题 |
| `locale` | string | 否 | 语言代码 |
| `path` | string | 否 | 路径过滤 |
| `topK` | integer | 否 | 返回分块数量 |
| `minScore` | number | 否 | 最低相似度 |

示例：

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "wiki_retrieve_context",
    "arguments": {
      "question": "如何批量导入 Markdown？",
      "locale": "zh",
      "topK": 6
    }
  }
}
```

## 示例：列出工具

```http
POST /mcp
Authorization: Bearer mcp_xxx
Content-Type: application/json
```

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

## 注意事项

- 当前实现是最简 MCP JSON-RPC HTTP 子集，未引入官方 MCP SDK。
- 当前未实现 SSE / Streamable HTTP transport。
- 当前不做用户级权限隔离，MCP Key 可以读取全站已发布文章。
- 若部署在反向代理后，并依赖 IP 限制，请确保 Wiki.js 的 `securityTrustProxy` 配置符合实际代理链路，否则 `req.ip` 可能不是客户端真实 IP。
- 建议只给受信任的智能体或内网服务分发 MCP API Key。
