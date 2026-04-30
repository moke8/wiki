exports.up = async knex => {
  const hasTable = await knex.schema.hasTable('aiChatLogs')
  if (!hasTable) {
    await knex.schema.createTable('aiChatLogs', table => {
      table.increments('id').primary()
      table.text('question').notNullable()
      table.text('answer').notNullable().defaultTo('')
      table.json('sources')
      table.integer('userId').unsigned().references('id').inTable('users').onDelete('SET NULL')
      table.string('userName')
      table.string('userEmail')
      table.string('ip')
      table.string('locale', 5)
      table.string('path')
      table.integer('duration').unsigned()
      table.string('status').notNullable().defaultTo('success')
      table.text('error')
      table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now())
      table.index(['createdAt'])
      table.index(['userId'])
    })
  }
}

exports.down = async knex => {
  await knex.schema.dropTableIfExists('aiChatLogs')
}
