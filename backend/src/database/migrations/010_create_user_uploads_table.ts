import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('user_uploads', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('originalName').notNullable();
    table.string('filename').notNullable();
    table.string('mimetype').notNullable();
    table.integer('size').notNullable();
    table.string('path').notNullable();
    table.string('url').notNullable();
    table.enum('type', ['avatar', 'blog', 'video', 'document']).defaultTo('document');
    table.timestamp('createdAt').defaultTo(knex.fn.now());

    // 索引
    table.index(['userId']);
    table.index(['type']);
    table.index(['createdAt']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('user_uploads');
}