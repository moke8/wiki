const Model = require('objection').Model

/**
 * AI Chat Log model
 */
module.exports = class AIChatLog extends Model {
  static get tableName() { return 'aiChatLogs' }

  static get jsonSchema () {
    return {
      type: 'object',
      required: ['question', 'answer', 'status'],

      properties: {
        id: {type: 'integer'},
        question: {type: 'string'},
        answer: {type: 'string'},
        sources: {type: 'array'},
        userId: {type: ['integer', 'null']},
        userName: {type: ['string', 'null']},
        userEmail: {type: ['string', 'null']},
        ip: {type: ['string', 'null']},
        locale: {type: ['string', 'null']},
        path: {type: ['string', 'null']},
        duration: {type: ['integer', 'null']},
        status: {type: 'string'},
        error: {type: ['string', 'null']},
        createdAt: {type: 'string'}
      }
    }
  }

  static get jsonAttributes() {
    return ['sources']
  }
}
