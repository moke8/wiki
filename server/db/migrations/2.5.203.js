exports.up = async knex => {
  const hasTable = await knex.schema.hasTable('mcpApiKeys')
  if (!hasTable) {
    await knex.schema.createTable('mcpApiKeys', table => {
      table.increments('id').primary()
      table.string('name').notNullable()
      table.string('keyHash').notNullable()
      table.string('keyPrefix').notNullable()
      table.json('ipAllowlist').notNullable()
      table.boolean('isRevoked').notNullable().defaultTo(false)
      table.timestamp('lastUsedAt')
      table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now())
      table.timestamp('updatedAt').notNullable().defaultTo(knex.fn.now())
      table.index(['keyPrefix'])
      table.index(['isRevoked'])
    })
  }
}

exports.down = async knex => {
  await knex.schema.dropTableIfExists('mcpApiKeys')
}
