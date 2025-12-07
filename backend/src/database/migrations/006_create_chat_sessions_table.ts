import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('chat_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('title').nullable();
    table.string('model').defaultTo('gemini-pro');
    table.text('context').nullable();
    table.integer('messageCount').defaultTo(0);
    table.enum('status', ['active', 'archived']).defaultTo('active');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());

    // 索引
    table.index(['userId']);
    table.index(['status']);
    table.index(['createdAt']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('chat_sessions');
}