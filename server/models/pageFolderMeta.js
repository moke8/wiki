const Model = require('objection').Model
const _ = require('lodash')

/**
 * Page folder display metadata model
 */
module.exports = class PageFolderMeta extends Model {
  static get tableName() { return 'pageFolderMeta' }

  static get jsonSchema () {
    return {
      type: 'object',
      required: ['localeCode', 'path', 'title'],

      properties: {
        id: {type: 'integer'},
        localeCode: {type: 'string'},
        path: {type: 'string'},
        title: {type: 'string'},
        createdAt: {type: 'string'},
        updatedAt: {type: 'string'}
      }
    }
  }

  $beforeUpdate() {
    this.updatedAt = new Date().toISOString()
  }

  $beforeInsert() {
    this.createdAt = new Date().toISOString()
    this.updatedAt = new Date().toISOString()
  }

  static normalizePath(path) {
    return _.trim(String(path || ''), '/')
  }

  static normalizeTitle(title) {
    return _.trim(String(title || ''))
  }

  static async upsertMeta({ locale, localeCode, path, title }) {
    const targetLocale = localeCode || locale
    const targetPath = this.normalizePath(path)
    const targetTitle = this.normalizeTitle(title)

    if (!targetLocale || !targetPath || !targetTitle) {
      return null
    }

    const existing = await this.query().where({
      localeCode: targetLocale,
      path: targetPath
    }).first()

    if (existing) {
      await this.query().patch({
        title: targetTitle
      }).findById(existing.id)
      return this.query().findById(existing.id)
    }

    return this.query().insert({
      localeCode: targetLocale,
      path: targetPath,
      title: targetTitle
    })
  }

  static async copyMeta({ sourceLocale, sourcePath, destinationLocale, destinationPath }) {
    const fromPath = this.normalizePath(sourcePath)
    const toPath = this.normalizePath(destinationPath)
    const fromLocale = sourceLocale
    const toLocale = destinationLocale || sourceLocale

    if (!fromLocale || !toLocale || !fromPath || !toPath || fromPath === toPath) {
      return null
    }

    const existingSource = await this.query().where({
      localeCode: fromLocale,
      path: fromPath
    }).first()

    if (!existingSource) {
      return null
    }

    const existingTarget = await this.query().where({
      localeCode: toLocale,
      path: toPath
    }).first()

    if (existingTarget) {
      return existingTarget
    }

    return this.query().insert({
      localeCode: toLocale,
      path: toPath,
      title: existingSource.title
    })
  }
}
