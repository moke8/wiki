exports.up = async knex => {
  // Only applicable to PostgreSQL with pgvector extension
  const dbType = knex.client.config.client
  if (dbType !== 'pg' && dbType !== 'postgres' && dbType !== 'postgresql') {
    return
  }

  // 1. Enable pgvector extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS vector')

  // 2. Add vectorization status fields to pages table
  const hasIsVectorized = await knex.schema.hasColumn('pages', 'isVectorized')
  if (!hasIsVectorized) {
    await knex.schema.alterTable('pages', table => {
      table.boolean('isVectorized').notNullable().defaultTo(false)
      table.timestamp('vectorizedAt').nullable()
    })
  }

  // 3. Create pageVectors table
  const hasTable = await knex.schema.hasTable('pageVectors')
  if (!hasTable) {
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

    // 4. Add vector column (Knex does not natively support vector type)
    await knex.raw(
      'ALTER TABLE "pageVectors" ADD COLUMN "embedding" vector(1024) NOT NULL'
    )

    // 5. Create HNSW index for fast vector similarity search
    await knex.raw(`
      CREATE INDEX "pageVectors_embedding_idx"
      ON "pageVectors" USING hnsw ("embedding" vector_cosine_ops)
    `)
  }
}

exports.down = async knex => {
  const dbType = knex.client.config.client
  if (dbType !== 'pg' && dbType !== 'postgres' && dbType !== 'postgresql') {
    return
  }

  await knex.schema.dropTableIfExists('pageVectors')

  const hasIsVectorized = await knex.schema.hasColumn('pages', 'isVectorized')
  if (hasIsVectorized) {
    await knex.schema.alterTable('pages', table => {
      table.dropColumn('isVectorized')
      table.dropColumn('vectorizedAt')
    })
  }
}
