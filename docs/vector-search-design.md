# Wiki.js 向量搜索功能设计文档

## 1. 概述

为 Wiki.js 增加基于向量化的语义搜索能力，作为现有搜索引擎插件体系的新模块接入。

### 1.1 目标

- 文章发布/更新后自动生成向量，存入向量数据库
- 搜索时支持语义搜索，提升模糊查询和自然语言查询的准确率
- 管理后台可查看文章向量化状态
- 兼容 OpenAI 协议，支持接入阿里百炼等第三方模型服务

### 1.2 非目标（第一期不做）

- AI 对话问答（RAG Chat）
- 图片内容识别与向量化
- 文档结构化分析
- Rerank 重排序（配置预留，逻辑不实现）

## 2. 技术方案

### 2.1 整体架构

```
文章发布/更新
    │
    ▼
Search Engine 插件接口 (created/updated/deleted)
    │
    ▼
Vector Engine Module (server/modules/search/vector/)
    │
    ├──► Embedding API (OpenAI 协议) ──► 文本转向量
    │
    └──► pgvector (PostgreSQL 扩展) ──► 向量存储与检索
```

### 2.2 向量数据库选型：pgvector

使用 PostgreSQL 的 pgvector 扩展，理由：
- Wiki.js 主力数据库就是 PostgreSQL，无需额外部署
- pgvector 支持 HNSW 索引，百万级向量检索 <100ms
- 复用现有数据库连接（Knex）

### 2.3 Embedding 模型接入

通过 OpenAI 兼容协议调用，支持任何兼容 `POST /v1/embeddings` 的服务：

| 服务商 | base_url | 推荐模型 |
|--------|----------|---------|
| 阿里百炼 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | text-embedding-v3 |
| OpenAI | `https://api.openai.com/v1` | text-embedding-3-small |
| 本地 Ollama | `http://localhost:11434/v1` | bge-m3 |

## 3. 配置设计

### 3.1 config.yml 新增配置项

```yaml
vector:
  # 是否启用向量搜索（与现有搜索引擎共存，非替代）
  enabled: false

  # Embedding 模型配置 (OpenAI 兼容协议)
  embedding:
    baseUrl: https://dashscope.aliyuncs.com/compatible-mode/v1
    apiKey: sk-xxx
    model: text-embedding-v3
    dimensions: 1024
    # 单次批量请求的文本数量上限
    batchSize: 20

  # 文本分块配置
  chunking:
    # 每个分块的最大字符数
    maxChunkSize: 500
    # 分块之间的重叠字符数
    overlapSize: 50

  # Rerank 配置（预留，第一期不实现）
  rerank:
    enabled: false
    baseUrl: https://dashscope.aliyuncs.com/compatible-mode/v1
    apiKey: sk-xxx
    model: gte-rerank
    topN: 5

  # 搜索配置
  search:
    # 向量召回数量
    topK: 20
    # 最低相似度阈值 (0-1)
    minScore: 0.5
    # 是否启用混合搜索（向量 + 关键词）
    hybrid: true
    # 混合搜索中向量搜索的权重 (0-1)
    vectorWeight: 0.7
```

### 3.2 管理后台配置界面

在现有的 Administration > Search Engine 页面中，新增 "Vector Search" 引擎选项，配置项通过 `definition.yml` 定义，复用现有的搜索引擎配置 UI。

## 4. 数据库设计

### 4.1 新增 pgvector 扩展

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 4.2 新增表：pageVectors

存储文章分块后的向量数据。

```sql
CREATE TABLE "pageVectors" (
  "id"         SERIAL PRIMARY KEY,
  "pageId"     INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  "chunkIndex" INTEGER NOT NULL DEFAULT 0,    -- 分块序号
  "chunkText"  TEXT NOT NULL,                  -- 分块原文（用于搜索结果展示）
  "embedding"  vector(1024) NOT NULL,          -- 向量数据，维度与模型配置一致
  "createdAt"  TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT "pageVectors_unique" UNIQUE ("pageId", "chunkIndex")
);

-- HNSW 索引，加速向量检索
CREATE INDEX "pageVectors_embedding_idx"
  ON "pageVectors"
  USING hnsw ("embedding" vector_cosine_ops);

-- 按 pageId 查询的索引
CREATE INDEX "pageVectors_pageId_idx"
  ON "pageVectors" ("pageId");
```

### 4.3 pages 表新增字段

```sql
ALTER TABLE pages ADD COLUMN "isVectorized" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE pages ADD COLUMN "vectorizedAt" TIMESTAMP;
```

## 5. 搜索引擎模块设计

### 5.1 模块结构

```
server/modules/search/vector/
├── definition.yml    # 模块定义与配置项声明
└── engine.js         # 引擎实现
```

### 5.2 definition.yml

```yaml
key: vector
title: Vector Search (AI Embedding)
description: 基于 AI Embedding 的语义向量搜索引擎，支持 OpenAI 兼容协议。
author: requarks.io
logo: https://static.requarks.io/logo/postgresql.svg
website: https://www.requarks.io/
isAvailable: true
props:
  embeddingBaseUrl:
    type: String
    title: Embedding API Base URL
    hint: "OpenAI 兼容的 Embedding API 地址"
    default: "https://dashscope.aliyuncs.com/compatible-mode/v1"
    order: 1
  embeddingApiKey:
    type: String
    title: Embedding API Key
    hint: "API 密钥"
    default: ""
    sensitive: true
    order: 2
  embeddingModel:
    type: String
    title: Embedding Model
    hint: "模型名称"
    default: "text-embedding-v3"
    order: 3
  embeddingDimensions:
    type: Number
    title: Embedding Dimensions
    hint: "向量维度"
    default: 1024
    order: 4
  maxChunkSize:
    type: Number
    title: Max Chunk Size
    hint: "文本分块最大字符数"
    default: 500
    order: 5
  overlapSize:
    type: Number
    title: Chunk Overlap Size
    hint: "分块重叠字符数"
    default: 50
    order: 6
  topK:
    type: Number
    title: Search Top K
    hint: "向量召回数量"
    default: 20
    order: 7
  minScore:
    type: Number
    title: Minimum Similarity Score
    hint: "最低相似度阈值 (0-1)"
    default: 0.5
    order: 8
```

### 5.3 engine.js 核心接口

遵循现有搜索引擎插件接口规范：

```javascript
module.exports = {
  async activate() {
    // 检查 PostgreSQL + pgvector 扩展是否可用
  },

  async deactivate() {
    // 删除 pageVectors 表
  },

  async init() {
    // 1. CREATE EXTENSION IF NOT EXISTS vector
    // 2. 创建 pageVectors 表（如不存在）
    // 3. 创建 HNSW 索引
    // 4. pages 表增加 isVectorized / vectorizedAt 字段
  },

  async query(q, opts) {
    // 1. 调用 Embedding API 将查询文本转为向量
    // 2. 在 pageVectors 表中执行向量相似度搜索
    // 3. 按 pageId 聚合结果（一篇文章多个分块取最高分）
    // 4. 返回 { results, suggestions, totalHits }
  },

  async created(page) {
    // 1. 清洗 HTML 内容为纯文本
    // 2. 按 chunking 配置分块
    // 3. 批量调用 Embedding API 生成向量
    // 4. 插入 pageVectors 表
    // 5. 更新 pages.isVectorized = true, vectorizedAt = now()
  },

  async updated(page) {
    // 1. 删除该 page 的旧向量
    // 2. 重新执行 created 流程
  },

  async deleted(page) {
    // 1. 删除 pageVectors 中该 pageId 的所有记录
    // 2. (pages 记录已被删除，无需更新)
  },

  async renamed(page) {
    // 向量数据通过 pageId 关联，无需额外处理
  },

  async rebuild() {
    // 1. 清空 pageVectors 表
    // 2. 流式读取所有已发布页面
    // 3. 逐页执行向量化
    // 4. 更新所有页面的 isVectorized 状态
  }
}
```

### 5.4 文本分块策略

```
原始文章内容（纯文本，已去除 HTML 标签）
    │
    ▼
按段落分割（\n\n）
    │
    ▼
合并短段落 / 拆分长段落（不超过 maxChunkSize）
    │
    ▼
相邻分块保留 overlapSize 字符重叠
    │
    ▼
每个分块独立调用 Embedding API
```

分块规则：
- 优先按段落（`\n\n`）分割
- 单段落超过 `maxChunkSize` 时，按句号/问号/感叹号二次分割
- 合并后的分块不超过 `maxChunkSize` 字符
- 相邻分块保留 `overlapSize` 字符重叠，避免语义断裂
- 文章标题和描述作为独立分块（权重更高）

### 5.5 Embedding API 调用

使用 OpenAI 兼容协议，通过 `openai` npm 包调用：

```javascript
const { OpenAI } = require('openai')

const client = new OpenAI({
  baseURL: config.embeddingBaseUrl,
  apiKey: config.embeddingApiKey
})

const response = await client.embeddings.create({
  model: config.embeddingModel,
  input: chunks,           // string[]，支持批量
  dimensions: config.embeddingDimensions
})

// response.data[i].embedding → float[]
```

## 6. GraphQL 接口变更

### 6.1 Schema 变更

`server/graph/schemas/page.graphql`：

```graphql
# PageListItem 新增字段
type PageListItem {
  # ... 现有字段 ...
  isVectorized: Boolean!
  vectorizedAt: Date
}

# PageMutation 新增操作
type PageMutation {
  # ... 现有操作 ...
  vectorize(id: Int!): DefaultResponse
    @auth(requires: ["manage:system"])
  vectorizeAll: DefaultResponse
    @auth(requires: ["manage:system"])
}
```

### 6.2 Resolver 变更

`server/graph/resolvers/page.js`：

```javascript
// Query - list 已自动返回 pages 表字段，新增字段无需改动

// Mutation
async vectorize(obj, args, context) {
  // 手动触发单篇文章向量化
  const page = await WIKI.models.pages.query().findById(args.id)
  await WIKI.data.searchEngine.updated(page)
  return { responseResult: { succeeded: true } }
},

async vectorizeAll(obj, args, context) {
  // 手动触发全量重建
  await WIKI.data.searchEngine.rebuild()
  return { responseResult: { succeeded: true } }
}
```

## 7. 前端变更

### 7.1 管理后台页面列表 (`admin-pages.vue`)

在页面列表表格中新增"向量化"列：

```pug
//- 表头新增
{ text: 'Vectorized', value: 'isVectorized', width: 120 }

//- 单元格渲染
td
  v-icon(v-if='props.item.isVectorized', color='green', small) mdi-check-circle
  v-icon(v-else, color='grey lighten-1', small) mdi-circle-outline
```

### 7.2 搜索引擎配置页

复用现有的 `admin-search.vue` 配置界面，vector 模块通过 `definition.yml` 自动注册配置项，无需额外前端开发。

## 8. 数据库迁移

新增迁移文件 `server/db/migrations/2.5.xxx.js`：

```javascript
exports.up = async knex => {
  // 1. 启用 pgvector 扩展
  await knex.raw('CREATE EXTENSION IF NOT EXISTS vector')

  // 2. pages 表新增字段
  await knex.schema.alterTable('pages', table => {
    table.boolean('isVectorized').notNullable().defaultTo(false)
    table.timestamp('vectorizedAt').nullable()
  })

  // 3. 创建 pageVectors 表
  await knex.schema.createTable('pageVectors', table => {
    table.increments('id').primary()
    table.integer('pageId').unsigned().notNullable()
      .references('id').inTable('pages').onDelete('CASCADE')
    table.integer('chunkIndex').notNullable().defaultTo(0)
    table.text('chunkText').notNullable()
    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now())
    table.timestamp('updatedAt').notNullable().defaultTo(knex.fn.now())
    table.unique(['pageId', 'chunkIndex'])
    table.index(['pageId'])
  })

  // 4. 添加 vector 列（Knex 不直接支持 vector 类型，用 raw）
  await knex.raw(
    'ALTER TABLE "pageVectors" ADD COLUMN "embedding" vector(1024) NOT NULL'
  )

  // 5. 创建 HNSW 索引
  await knex.raw(`
    CREATE INDEX "pageVectors_embedding_idx"
    ON "pageVectors" USING hnsw ("embedding" vector_cosine_ops)
  `)
}

exports.down = async knex => {
  await knex.schema.dropTableIfExists('pageVectors')
  await knex.schema.alterTable('pages', table => {
    table.dropColumn('isVectorized')
    table.dropColumn('vectorizedAt')
  })
}
```

## 9. 新增依赖

```json
{
  "openai": "^4.x",
  "pgvector": "^0.2.x"
}
```

- `openai`: 调用 OpenAI 兼容的 Embedding API
- `pgvector`: pgvector 的 Node.js 客户端，处理向量数据的序列化/反序列化

## 10. 搜索流程

### 10.1 向量搜索流程

```
用户输入查询
    │
    ▼
Embedding API: 查询文本 → 查询向量
    │
    ▼
pgvector: SELECT ... ORDER BY embedding <=> query_vector LIMIT topK
    │
    ▼
按 pageId 聚合（取每篇文章最高相似度分块）
    │
    ▼
过滤 minScore 以下的结果
    │
    ▼
返回结果列表
```

### 10.2 混合搜索流程（可选，hybrid: true）

```
用户输入查询
    │
    ├──► 向量搜索 → 结果集 A（带相似度分数）
    │
    └──► 关键词搜索（现有 PostgreSQL tsvector）→ 结果集 B（带 ts_rank 分数）
    │
    ▼
归一化两组分数到 0-1
    │
    ▼
加权合并: score = vectorWeight * scoreA + (1 - vectorWeight) * scoreB
    │
    ▼
去重 + 排序 → 最终结果
```

## 11. 错误处理

| 场景 | 处理方式 |
|------|---------|
| Embedding API 不可用 | 记录错误日志，文章正常发布，标记 isVectorized=false |
| Embedding API 超时 | 重试 1 次，仍失败则跳过，后续可手动触发 |
| pgvector 扩展未安装 | activate 时抛出错误，回退到默认搜索引擎 |
| 向量维度不匹配 | init 时校验配置维度与表结构，不匹配则提示重建索引 |
| 文章内容为空 | 跳过向量化，isVectorized=false |

## 12. 实施计划

| 阶段 | 任务 | 预估工时 | 状态 |
|------|------|---------|------|
| P1 | 数据库迁移 + pgvector 表结构 | 0.5 天 | ✅ 已完成 |
| P2 | search/vector 模块骨架 + definition.yml | 0.5 天 | ✅ 已完成 |
| P3 | Embedding API 调用 + 文本分块逻辑 | 1 天 | ✅ 已完成 |
| P4 | engine.js 完整实现 (created/updated/deleted/rebuild) | 1.5 天 | ✅ 已完成 |
| P5 | 向量搜索 query 实现 | 1 天 | ✅ 已完成 |
| P6 | GraphQL 接口 + 前端向量化状态展示 | 1 天 | ✅ 已完成 |
| P7 | 混合搜索（可选） | 0.5 天 | 待定 |
| P8 | 测试 + 文档更新 | 1 天 | ✅ 已完成 |

### 已实现的文件清单

```
新增文件:
  server/modules/search/vector/definition.yml   # 模块定义与配置项
  server/modules/search/vector/engine.js         # 引擎核心实现
  server/modules/search/vector/chunker.js        # 文本分块工具
  server/modules/search/vector/embedder.js       # Embedding API 封装
  server/db/migrations/2.5.200.js                # 数据库迁移
  docs/vector-search-design.md                   # 本设计文档

修改文件:
  server/graph/schemas/page.graphql              # 新增 isVectorized/vectorizedAt 字段 + vectorize/vectorizeAll mutation
  server/graph/resolvers/page.js                 # 新增 vectorize/vectorizeAll resolver + list 查询增加新字段
  server/models/pages.js                         # Model schema 增加 isVectorized/vectorizedAt
  client/components/admin/admin-pages.vue        # 页面列表增加 Vectorized 列
  client/graph/admin/pages/pages-query-list.gql  # GraphQL 查询增加新字段
  config.sample.yml                              # 增加向量搜索配置示例
  package.json                                   # 新增 openai + pgvector 依赖
```

## 13. 后续扩展（第二期）

- Rerank 重排序：配置已预留，实现 rerank 调用逻辑
- RAG 对话：基于向量搜索结果 + 大模型生成回答
- 增量向量化：只对变更的分块重新生成向量
- 多模态：图片 OCR → 文本 → 向量化
