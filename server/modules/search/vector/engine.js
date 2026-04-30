const { pipeline } = require('node:stream/promises')
const { Transform } = require('node:stream')
const { chunkText } = require('./chunker')
const { generateEmbeddings, generateEmbedding, resetClient } = require('./embedder')
const pgvector = require('pgvector')

/* global WIKI */

module.exports = {
  async activate () {
    if (WIKI.config.db.type !== 'postgres') {
      throw new WIKI.Error.SearchActivationFailed('Vector search requires PostgreSQL with pgvector extension!')
    }
    // Verify pgvector extension is available
    try {
      await WIKI.models.knex.raw('CREATE EXTENSION IF NOT EXISTS vector')
    } catch (err) {
      throw new WIKI.Error.SearchActivationFailed('Failed to enable pgvector extension. Please install pgvector on your PostgreSQL server.')
    }
  },

  async deactivate () {
    WIKI.logger.info('(SEARCH/VECTOR) Dropping vector tables...')
    await WIKI.models.knex.schema.dropTableIfExists('pageVectors')
    // Remove vectorization columns from pages
    const hasCol = await WIKI.models.knex.schema.hasColumn('pages', 'isVectorized')
    if (hasCol) {
      await WIKI.models.knex.schema.alterTable('pages', table => {
        table.dropColumn('isVectorized')
        table.dropColumn('vectorizedAt')
      })
    }
    resetClient()
    WIKI.logger.info('(SEARCH/VECTOR) Vector tables dropped.')
  },

  async init () {
    WIKI.logger.info('(SEARCH/VECTOR) Initializing...')

    await WIKI.models.knex.raw('CREATE EXTENSION IF NOT EXISTS vector')

    const dimensions = parseInt(this.config.embeddingDimensions, 10) || 1024

    // Create pageVectors table if not exists
    const tableExists = await WIKI.models.knex.schema.hasTable('pageVectors')
    if (!tableExists) {
      await WIKI.models.knex.schema.createTable('pageVectors', table => {
        table.increments('id').primary()
        table.integer('pageId').unsigned().notNullable()
          .references('id').inTable('pages').onDelete('CASCADE')
        table.integer('chunkIndex').notNullable().defaultTo(0)
        table.text('chunkText').notNullable()
        table.timestamp('createdAt').notNullable().defaultTo(WIKI.models.knex.fn.now())
        table.timestamp('updatedAt').notNullable().defaultTo(WIKI.models.knex.fn.now())
        table.unique(['pageId', 'chunkIndex'])
        table.index(['pageId'])
      })

      await WIKI.models.knex.raw(
        `ALTER TABLE "pageVectors" ADD COLUMN "embedding" vector(${dimensions}) NOT NULL`
      )

      await WIKI.models.knex.raw(`
        CREATE INDEX "pageVectors_embedding_idx"
        ON "pageVectors" USING hnsw ("embedding" vector_cosine_ops)
      `)
    }

    // Ensure pages table has vectorization columns
    const hasCol = await WIKI.models.knex.schema.hasColumn('pages', 'isVectorized')
    if (!hasCol) {
      await WIKI.models.knex.schema.alterTable('pages', table => {
        table.boolean('isVectorized').notNullable().defaultTo(false)
        table.timestamp('vectorizedAt').nullable()
      })
    }

    WIKI.logger.info('(SEARCH/VECTOR) Initialization completed.')
  },

  /**
   * QUERY - Semantic vector search
   */
  async query (q, opts) {
    try {
      const topK = parseInt(this.config.topK, 10) || 20
      const minScore = parseFloat(this.config.minScore) || 0.5

      // Generate query embedding
      const queryEmbedding = await generateEmbedding(q, this.config)
      const vectorStr = pgvector.toSql(queryEmbedding)

      // Vector similarity search (parameterized)
      const qryParts = [`
        SELECT
          pv."pageId" AS id,
          p.path,
          p."localeCode" AS locale,
          p.title,
          p.description,
          1 - (pv."embedding" <=> ?::vector) AS score
        FROM "pageVectors" pv
        JOIN pages p ON p.id = pv."pageId"
        WHERE p."isPublished" = true
      `]
      const qryParams = [vectorStr]

      if (opts.locale) {
        qryParts.push(` AND p."localeCode" = ?`)
        qryParams.push(opts.locale)
      }
      if (opts.path) {
        qryParts.push(` AND p.path ILIKE ?`)
        qryParams.push(`%${opts.path}`)
      }

      qryParts.push(` ORDER BY pv."embedding" <=> ?::vector ASC LIMIT ?`)
      qryParams.push(vectorStr, topK)

      const qry = qryParts.join('')

      const results = await WIKI.models.knex.raw(qry, qryParams)

      // Aggregate by pageId (take highest score per page)
      const pageMap = new Map()
      for (const row of results.rows) {
        const existing = pageMap.get(row.id)
        if (!existing || row.score > existing.score) {
          pageMap.set(row.id, row)
        }
      }

      // Filter by minScore and format results
      const filtered = Array.from(pageMap.values())
        .filter(r => r.score >= minScore)
        .sort((a, b) => b.score - a.score)

      return {
        results: filtered.map(r => ({
          id: r.id,
          path: r.path,
          locale: r.locale,
          title: r.title,
          description: r.description
        })),
        suggestions: [],
        totalHits: filtered.length
      }
    } catch (err) {
      WIKI.logger.warn('(SEARCH/VECTOR) Search error:')
      WIKI.logger.warn(err)
      return { results: [], suggestions: [], totalHits: 0 }
    }
  },

  async getContext (q, opts = {}) {
    const topK = parseInt(opts.topK || this.config.chatTopK || this.config.topK, 10) || 6
    const minScore = parseFloat(opts.minScore || this.config.chatMinScore || this.config.minScore) || 0.5

    const queryEmbedding = await generateEmbedding(q, this.config)
    const vectorStr = pgvector.toSql(queryEmbedding)

    const qryParts = [`
        SELECT
          pv."pageId",
          pv."chunkIndex",
          pv."chunkText",
          p.path,
          p."localeCode" AS locale,
          p.title,
          1 - (pv."embedding" <=> ?::vector) AS score
        FROM "pageVectors" pv
        JOIN pages p ON p.id = pv."pageId"
        WHERE p."isPublished" = true
      `]
    const qryParams = [vectorStr]

    if (opts.locale) {
      qryParts.push(` AND p."localeCode" = ?`)
      qryParams.push(opts.locale)
    }
    if (opts.path) {
      qryParts.push(` AND p.path ILIKE ?`)
      qryParams.push(`%${opts.path}`)
    }

    qryParts.push(` ORDER BY pv."embedding" <=> ?::vector ASC LIMIT ?`)
    qryParams.push(vectorStr, topK)

    const results = await WIKI.models.knex.raw(qryParts.join(''), qryParams)
    return results.rows
      .filter(r => r.score >= minScore)
      .map(r => ({
        pageId: r.pageId,
        title: r.title,
        path: r.path,
        locale: r.locale,
        chunkIndex: r.chunkIndex,
        chunkText: r.chunkText,
        score: r.score
      }))
  },

  /**
   * CREATED - Vectorize a newly created page
   */
  async created (page) {
    try {
      await this._vectorizePage(page)
    } catch (err) {
      WIKI.logger.warn(`(SEARCH/VECTOR) Failed to vectorize page ${page.path}: ${err.message}`)
    }
  },

  /**
   * UPDATED - Re-vectorize an updated page
   */
  async updated (page) {
    try {
      // Delete old vectors
      await WIKI.models.knex('pageVectors').where('pageId', page.id).del()
      // Re-vectorize
      await this._vectorizePage(page)
    } catch (err) {
      WIKI.logger.warn(`(SEARCH/VECTOR) Failed to re-vectorize page ${page.path}: ${err.message}`)
    }
  },

  /**
   * DELETED - Remove vectors for a deleted page
   */
  async deleted (page) {
    await WIKI.models.knex('pageVectors').where('pageId', page.id).del()
  },

  /**
   * RENAMED - Vectors are linked by pageId, no action needed
   */
  async renamed (page) {
    // No action needed - vectors reference pageId, not path
  },

  /**
   * REBUILD - Full index rebuild
   */
  async rebuild () {
    WIKI.logger.info('(SEARCH/VECTOR) Rebuilding vector index...')

    // Clear all vectors
    await WIKI.models.knex('pageVectors').truncate()
    await WIKI.models.knex('pages').update({ isVectorized: false, vectorizedAt: null })

    // Stream all published pages and vectorize
    await pipeline(
      WIKI.models.knex.column('id', 'path', 'localeCode', 'title', 'description', 'render')
        .select().from('pages').where({
          isPublished: true,
          isPrivate: false
        }).stream(),
      new Transform({
        objectMode: true,
        transform: async (page, enc, cb) => {
          try {
            const content = WIKI.models.pages.cleanHTML(page.render)
            await this._vectorizePage({
              id: page.id,
              path: page.path,
              localeCode: page.localeCode,
              title: page.title,
              description: page.description,
              safeContent: content
            })
          } catch (err) {
            WIKI.logger.warn(`(SEARCH/VECTOR) Failed to vectorize page ${page.path}: ${err.message}`)
          }
          cb()
        }
      })
    )

    WIKI.logger.info('(SEARCH/VECTOR) Vector index rebuilt successfully.')
  },

  /**
   * Internal: vectorize a single page
   */
  async _vectorizePage (page) {
    const maxChunkSize = parseInt(this.config.maxChunkSize, 10) || 500
    const overlapSize = parseInt(this.config.overlapSize, 10) || 50

    // Build text: title + description + content
    const content = page.safeContent || ''
    const fullText = [page.title, page.description, content].filter(Boolean).join('\n\n')

    if (!fullText || fullText.trim().length === 0) {
      return
    }

    // Chunk the text
    const chunks = chunkText(fullText, maxChunkSize, overlapSize)
    if (chunks.length === 0) {
      return
    }

    // Generate embeddings
    const embeddings = await generateEmbeddings(chunks, this.config)

    // Insert into pageVectors
    for (let i = 0; i < chunks.length; i++) {
      const vectorStr = pgvector.toSql(embeddings[i])
      await WIKI.models.knex.raw(`
        INSERT INTO "pageVectors" ("pageId", "chunkIndex", "chunkText", "embedding")
        VALUES (?, ?, ?, ?::vector)
        ON CONFLICT ("pageId", "chunkIndex")
        DO UPDATE SET "chunkText" = EXCLUDED."chunkText",
                      "embedding" = EXCLUDED."embedding",
                      "updatedAt" = NOW()
      `, [page.id, i, chunks[i], vectorStr])
    }

    // Remove stale chunks (if page now has fewer chunks than before)
    await WIKI.models.knex('pageVectors')
      .where('pageId', page.id)
      .andWhere('chunkIndex', '>=', chunks.length)
      .del()

    // Update page vectorization status
    await WIKI.models.knex('pages').where('id', page.id).update({
      isVectorized: true,
      vectorizedAt: new Date().toISOString()
    })
  }
}
