import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('chat_messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('sessionId').notNullable().references('id').inTable('chat_sessions').onDelete('CASCADE');
    table.enum('role', ['user', 'assistant', 'system']).notNullable();
    table.text('content').notNullable();
    table.jsonb('metadata').nullable();
    table.timestamp('createdAt').defaultTo(knex.fn.now());

    // 索引
    table.index(['sessionId']);
    table.index(['role']);
    table.index(['createdAt']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('chat_messages');
}