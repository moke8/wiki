exports.up = async knex => {
  const hasTable = await knex.schema.hasTable('pageFolderMeta')
  if (!hasTable) {
    await knex.schema.createTable('pageFolderMeta', table => {
      table.increments('id').primary()
      table.string('localeCode', 5).notNullable()
      table.string('path').notNullable()
      table.string('title').notNullable()
      table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now())
      table.timestamp('updatedAt').notNullable().defaultTo(knex.fn.now())
      table.unique(['localeCode', 'path'])
      table.index(['localeCode'])
      table.index(['path'])
    })
  }
}

exports.down = async knex => {
  await knex.schema.dropTableIfExists('pageFolderMeta')
}
