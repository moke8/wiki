/* global WIKI */

const Model = require('objection').Model
const moment = require('moment')
const crypto = require('crypto')
const _ = require('lodash')

/**
 * MCP API Key model
 */
module.exports = class McpApiKey extends Model {
  static get tableName() { return 'mcpApiKeys' }

  static get jsonSchema () {
    return {
      type: 'object',
      required: ['name', 'keyHash', 'keyPrefix', 'ipAllowlist'],

      properties: {
        id: {type: 'integer'},
        name: {type: 'string'},
        keyHash: {type: 'string'},
        keyPrefix: {type: 'string'},
        ipAllowlist: {type: 'array'},
        isRevoked: {type: 'boolean'},
        lastUsedAt: {type: ['string', 'null']},
        createdAt: {type: 'string'},
        updatedAt: {type: 'string'}
      }
    }
  }

  static get jsonAttributes() {
    return ['ipAllowlist']
  }

  async $beforeUpdate(opt, context) {
    await super.$beforeUpdate(opt, context)
    this.updatedAt = moment.utc().toISOString()
  }

  async $beforeInsert(context) {
    await super.$beforeInsert(context)
    this.createdAt = moment.utc().toISOString()
    this.updatedAt = moment.utc().toISOString()
  }

  static hashKey (key) {
    return crypto.createHash('sha256').update(key).digest('hex')
  }

  static normalizeIpAllowlist (ipAllowlist) {
    if (!ipAllowlist) {
      return []
    }
    if (_.isArray(ipAllowlist)) {
      return _.uniq(ipAllowlist.map(ip => _.trim(ip)).filter(Boolean))
    }
    if (_.isString(ipAllowlist)) {
      return _.uniq(ipAllowlist.split(/[\n,]/).map(ip => _.trim(ip)).filter(Boolean))
    }
    return []
  }

  static async createNewKey ({ name, ipAllowlist }) {
    const raw = crypto.randomBytes(32).toString('base64url')
    const key = `mcp_${raw}`
    const keyPrefix = key.substring(0, 12)

    await WIKI.models.mcpApiKeys.query().insert({
      name,
      keyHash: McpApiKey.hashKey(key),
      keyPrefix,
      ipAllowlist: McpApiKey.normalizeIpAllowlist(ipAllowlist),
      isRevoked: false
    })

    return key
  }

  static extractBearerToken (req) {
    const auth = _.get(req, 'headers.authorization', '')
    const match = auth.match(/^Bearer\s+(.+)$/i)
    return match ? match[1] : null
  }

  static normalizeRequestIp (ip) {
    if (!ip) {
      return ''
    }
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7)
    }
    return ip
  }

  static isIpAllowed (ip, ipAllowlist) {
    const allowlist = McpApiKey.normalizeIpAllowlist(ipAllowlist)
    if (allowlist.length < 1) {
      return true
    }
    const normalizedIp = McpApiKey.normalizeRequestIp(ip)
    return allowlist.includes(normalizedIp) || allowlist.includes(ip)
  }

  static async authenticateRequest (req) {
    const key = McpApiKey.extractBearerToken(req)
    if (!key || !key.startsWith('mcp_')) {
      return { ok: false, status: 401, error: 'Missing or invalid MCP API key.' }
    }

    const keyHash = McpApiKey.hashKey(key)
    const entry = await WIKI.models.mcpApiKeys.query().findOne({ keyHash })
    if (!entry || entry.isRevoked) {
      return { ok: false, status: 401, error: 'Invalid MCP API key.' }
    }

    if (!McpApiKey.isIpAllowed(req.ip, entry.ipAllowlist)) {
      return { ok: false, status: 403, error: 'This IP address is not allowed to use this MCP API key.' }
    }

    await WIKI.models.mcpApiKeys.query().findById(entry.id).patch({
      lastUsedAt: moment.utc().toISOString()
    })

    return { ok: true, key: entry }
  }
}
