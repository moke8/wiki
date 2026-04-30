const { OpenAI } = require('openai')
const graphHelper = require('../../helpers/graph')

/* global WIKI */

function isChatEnabled (value) {
  return value === true || value === 'true' || value === 1 || value === '1'
}

function getChatConfig () {
  const engine = WIKI.data.searchEngine
  const config = engine ? engine.config || {} : {}
  return {
    ...config,
    chatBaseUrl: config.chatBaseUrl || config.embeddingBaseUrl,
    chatApiKey: config.chatApiKey || config.embeddingApiKey,
    chatModel: config.chatModel || 'qwen-plus',
    chatTopK: parseInt(config.chatTopK, 10) || 6,
    chatMinScore: parseFloat(config.chatMinScore) || 0.5
  }
}

function assertChatAvailable (config) {
  if (!WIKI.data.searchEngine || WIKI.data.searchEngine.key !== 'vector') {
    throw new Error('AI Chat requires the Vector Search engine to be enabled.')
  }
  if (!WIKI.data.searchEngine.getContext) {
    throw new Error('AI Chat requires vector context retrieval support.')
  }
  if (!isChatEnabled(config.chatEnabled)) {
    throw new Error('AI Chat is not enabled.')
  }
  if (!config.chatBaseUrl || !config.chatApiKey || !config.chatModel) {
    throw new Error('AI Chat model configuration is incomplete.')
  }
}

function buildMessages ({ question, contextItems, config }) {
  const contextText = contextItems.length > 0 ?
    contextItems.map((item, idx) => {
      return `[${idx + 1}] ${item.title || item.path}\nPath: /${item.locale}/${item.path}\n${item.chunkText}`
    }).join('\n\n') :
    'No relevant document context was found.'

  return [
    {
      role: 'system',
      content: `${config.chatSystemPrompt || 'You are a helpful documentation assistant. Answer using only the provided context.'}\n\nDocument context:\n${contextText}`
    },
    {
      role: 'user',
      content: question
    }
  ]
}

async function insertLog (payload) {
  try {
    await WIKI.models.aiChatLogs.query().insert(payload)
  } catch (err) {
    WIKI.logger.warn(`Failed to write AI chat log: ${err.message}`)
  }
}

module.exports = {
  Query: {
    async ai() { return {} }
  },
  Mutation: {
    async ai() { return {} }
  },
  AIQuery: {
    async status () {
      const config = getChatConfig()
      return {
        isEnabled: !!(WIKI.data.searchEngine && WIKI.data.searchEngine.key === 'vector' && isChatEnabled(config.chatEnabled))
      }
    },
    async logs (obj, args) {
      const limit = Math.min(Math.max(parseInt(args.limit, 10) || 50, 1), 200)
      const offset = Math.max(parseInt(args.offset, 10) || 0, 0)
      const result = await WIKI.models.aiChatLogs.query()
        .orderBy('createdAt', 'desc')
        .page(Math.floor(offset / limit), limit)
      return {
        items: result.results.map(log => ({
          ...log,
          sources: log.sources ? JSON.stringify(log.sources) : null
        })),
        total: result.total
      }
    }
  },
  AIMutation: {
    async chat (obj, args, context) {
      const startedAt = Date.now()
      const question = (args.question || '').trim()
      let logBase = {
        question,
        answer: '',
        sources: [],
        userId: context.req.user ? context.req.user.id : null,
        userName: context.req.user ? context.req.user.name : null,
        userEmail: context.req.user ? context.req.user.email : null,
        ip: context.req.ip,
        locale: args.locale || null,
        path: args.path || null,
        status: 'error',
        createdAt: new Date().toISOString()
      }

      try {
        if (!question) {
          throw new Error('Question is required.')
        }

        const config = getChatConfig()
        assertChatAvailable(config)

        const contextItems = await WIKI.data.searchEngine.getContext(question, {
          locale: args.locale,
          path: args.path,
          topK: config.chatTopK,
          minScore: config.chatMinScore
        })

        const visibleContextItems = contextItems.filter(item => {
          return WIKI.auth.checkAccess(context.req.user, ['read:pages'], {
            path: item.path,
            locale: item.locale
          })
        })

        const client = new OpenAI({
          baseURL: config.chatBaseUrl,
          apiKey: config.chatApiKey
        })

        const completion = await client.chat.completions.create({
          model: config.chatModel,
          messages: buildMessages({
            question,
            contextItems: visibleContextItems,
            config
          }),
          temperature: 0.2
        })

        const answer = completion.choices && completion.choices[0] && completion.choices[0].message ?
          completion.choices[0].message.content || '' :
          ''
        const sources = visibleContextItems.map(item => ({
          pageId: item.pageId,
          title: item.title,
          path: item.path,
          locale: item.locale,
          chunkIndex: item.chunkIndex,
          score: item.score
        }))

        await insertLog({
          ...logBase,
          answer,
          sources,
          duration: Date.now() - startedAt,
          status: 'success'
        })

        return {
          responseResult: graphHelper.generateSuccess('AI chat completed successfully.'),
          answer,
          sources
        }
      } catch (err) {
        await insertLog({
          ...logBase,
          answer: '',
          duration: Date.now() - startedAt,
          status: 'error',
          error: err.message
        })
        return {
          responseResult: graphHelper.generateError(err),
          answer: null,
          sources: []
        }
      }
    }
  }
}
