const express = require('express')
const router = express.Router()
const _ = require('lodash')

/* global WIKI */

function jsonRpcResult (id, result) {
  return {
    jsonrpc: '2.0',
    id,
    result
  }
}

function jsonRpcError (id, code, message) {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message
    }
  }
}

function toolTextResult (payload) {
  return {
    content: [{
      type: 'text',
      text: _.isString(payload) ? payload : JSON.stringify(payload, null, 2)
    }]
  }
}

async function searchWiki (args = {}) {
  const query = _.trim(args.query || '')
  if (!query) {
    throw new Error('query is required')
  }
  const limit = Math.min(Math.max(parseInt(args.limit, 10) || 10, 1), 50)

  if (WIKI.data.searchEngine) {
    const resp = await WIKI.data.searchEngine.query(query, {
      locale: args.locale,
      path: args.path,
      limit
    })
    return {
      results: _.take((resp.results || []).map(r => ({
        id: r.id,
        title: r.title,
        path: r.path,
        locale: r.locale,
        description: r.description,
        score: r.score
      })), limit),
      totalHits: resp.totalHits || 0,
      suggestions: resp.suggestions || []
    }
  }

  const likeOperator = WIKI.config.db.type === 'postgres' ? 'ILIKE' : 'LIKE'
  const results = await WIKI.models.pages.query()
    .column(['id', 'title', 'path', { locale: 'localeCode' }, 'description', 'updatedAt'])
    .where({ isPublished: true })
    .andWhere(builder => {
      builder.where('title', likeOperator, `%${query}%`)
      builder.orWhere('description', likeOperator, `%${query}%`)
      builder.orWhere('path', likeOperator, `%${query}%`)
      builder.orWhere('content', likeOperator, `%${query}%`)
    })
    .modify(builder => {
      if (args.locale) {
        builder.andWhere('localeCode', args.locale)
      }
      if (args.path) {
        builder.andWhere('path', likeOperator, `${args.path}%`)
      }
    })
    .limit(limit)

  return {
    results,
    totalHits: results.length,
    suggestions: []
  }
}

async function getWikiPage (args = {}) {
  let page
  if (args.id) {
    page = await WIKI.models.pages.getPageFromDb(parseInt(args.id, 10))
  } else if (args.path) {
    page = await WIKI.models.pages.getPageFromDb({
      path: args.path,
      locale: args.locale || WIKI.config.lang.code
    })
  } else {
    throw new Error('id or path is required')
  }

  if (!page || !page.isPublished) {
    throw new Error('Page not found')
  }

  return {
    id: page.id,
    title: page.title,
    path: page.path,
    locale: page.localeCode,
    description: page.description,
    content: page.content,
    contentType: page.contentType,
    tags: (page.tags || []).map(t => t.tag),
    createdAt: page.createdAt,
    updatedAt: page.updatedAt
  }
}

async function getWikiTree (args = {}) {
  const locale = args.locale || WIKI.config.lang.code
  const parent = parseInt(args.parent, 10) || null
  const limit = Math.min(Math.max(parseInt(args.limit, 10) || 100, 1), 500)

  const results = await WIKI.models.knex('pageTree').where(builder => {
    builder.where('localeCode', locale)
    if (args.mode === 'FOLDERS') {
      builder.andWhere('isFolder', true)
    } else if (args.mode === 'PAGES') {
      builder.andWhereNotNull('pageId')
    }
    if (!parent) {
      builder.whereNull('parent')
    } else {
      builder.where('parent', parent)
    }
  }).orderBy([{ column: 'isFolder', order: 'desc' }, 'title']).limit(limit)

  return {
    items: results.map(r => ({
      id: r.id,
      pageId: r.pageId,
      title: r.title,
      path: r.path,
      locale: r.localeCode,
      parent: r.parent || 0,
      isFolder: r.isFolder,
      isPrivate: r.isPrivate
    }))
  }
}

async function retrieveWikiContext (args = {}) {
  if (!WIKI.data.searchEngine || WIKI.data.searchEngine.key !== 'vector' || !_.isFunction(WIKI.data.searchEngine.getContext)) {
    throw new Error('Vector search engine is not enabled')
  }
  const question = _.trim(args.question || args.query || '')
  if (!question) {
    throw new Error('question is required')
  }
  const chunks = await WIKI.data.searchEngine.getContext(question, {
    locale: args.locale,
    path: args.path,
    topK: args.topK,
    minScore: args.minScore
  })
  return { chunks }
}

const tools = [
  {
    name: 'wiki_search',
    description: 'Search published wiki pages by keyword.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query.' },
        locale: { type: 'string', description: 'Optional locale code.' },
        path: { type: 'string', description: 'Optional page path prefix.' },
        limit: { type: 'integer', description: 'Maximum number of results. Default 10, max 50.' }
      },
      required: ['query']
    }
  },
  {
    name: 'wiki_get_page',
    description: 'Get a published wiki page by id or path.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'Page id.' },
        path: { type: 'string', description: 'Page path.' },
        locale: { type: 'string', description: 'Locale code when using path.' }
      }
    }
  },
  {
    name: 'wiki_tree',
    description: 'List wiki page tree items.',
    inputSchema: {
      type: 'object',
      properties: {
        locale: { type: 'string', description: 'Optional locale code.' },
        parent: { type: 'integer', description: 'Optional parent tree item id.' },
        mode: { type: 'string', enum: ['ALL', 'FOLDERS', 'PAGES'] },
        limit: { type: 'integer', description: 'Maximum number of items. Default 100, max 500.' }
      }
    }
  },
  {
    name: 'wiki_retrieve_context',
    description: 'Retrieve semantic wiki chunks using the vector search engine.',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'Question to retrieve context for.' },
        locale: { type: 'string', description: 'Optional locale code.' },
        path: { type: 'string', description: 'Optional path filter.' },
        topK: { type: 'integer', description: 'Maximum chunks to return.' },
        minScore: { type: 'number', description: 'Minimum similarity score.' }
      },
      required: ['question']
    }
  }
]

async function callTool (name, args) {
  switch (name) {
    case 'wiki_search':
      return toolTextResult(await searchWiki(args))
    case 'wiki_get_page':
      return toolTextResult(await getWikiPage(args))
    case 'wiki_tree':
      return toolTextResult(await getWikiTree(args))
    case 'wiki_retrieve_context':
      return toolTextResult(await retrieveWikiContext(args))
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

router.post('/mcp', async (req, res) => {
  const id = _.get(req, 'body.id', null)
  const method = _.get(req, 'body.method')
  const params = _.get(req, 'body.params', {})

  try {
    if (!method) {
      return res.status(400).json(jsonRpcError(id, -32600, 'Invalid JSON-RPC request'))
    }

    if (method !== 'initialize') {
      const authResult = await WIKI.models.mcpApiKeys.authenticateRequest(req)
      if (!authResult.ok) {
        return res.status(authResult.status).json(jsonRpcError(id, -32001, authResult.error))
      }
    }

    switch (method) {
      case 'initialize':
        return res.json(jsonRpcResult(id, {
          protocolVersion: _.get(params, 'protocolVersion', '2024-11-05'),
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'wiki-mcp',
            version: WIKI.version || '1.0.0'
          }
        }))
      case 'tools/list':
        return res.json(jsonRpcResult(id, { tools }))
      case 'tools/call': {
        const result = await callTool(_.get(params, 'name'), _.get(params, 'arguments', {}))
        return res.json(jsonRpcResult(id, result))
      }
      case 'notifications/initialized':
        return res.status(204).end()
      default:
        return res.status(404).json(jsonRpcError(id, -32601, `Method not found: ${method}`))
    }
  } catch (err) {
    WIKI.logger.warn(`MCP request failed: ${err.message}`)
    return res.status(500).json(jsonRpcError(id, -32000, err.message))
  }
})

router.get('/mcp', (req, res) => {
  res.json({
    name: 'wiki-mcp',
    status: 'ok'
  })
})

module.exports = router
