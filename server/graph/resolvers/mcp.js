const graphHelper = require('../../helpers/graph')

/* global WIKI */

module.exports = {
  Query: {
    async mcp () { return {} }
  },
  Mutation: {
    async mcp () { return {} }
  },
  McpQuery: {
    async apiKeys () {
      const keys = await WIKI.models.mcpApiKeys.query().orderBy(['isRevoked', 'name'])
      return keys.map(k => ({
        id: k.id,
        name: k.name,
        keyPrefix: `${k.keyPrefix}...`,
        ipAllowlist: k.ipAllowlist || [],
        isRevoked: k.isRevoked,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
        updatedAt: k.updatedAt
      }))
    }
  },
  McpMutation: {
    async createApiKey (obj, args) {
      try {
        const key = await WIKI.models.mcpApiKeys.createNewKey(args)
        return {
          key,
          responseResult: graphHelper.generateSuccess('MCP API Key created successfully')
        }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    },
    async revokeApiKey (obj, args) {
      try {
        await WIKI.models.mcpApiKeys.query().findById(args.id).patch({
          isRevoked: true
        })
        return {
          responseResult: graphHelper.generateSuccess('MCP API Key revoked successfully')
        }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    }
  }
}
