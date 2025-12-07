import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('user_notes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('lessonTitle').nullable();
    table.text('content').notNullable();
    table.text('quote').nullable();
    table.enum('sourceType', ['article', 'video', 'manual']).defaultTo('manual');
    table.uuid('sourceId').nullable().references('id').inTable('blog_posts').onDelete('SET NULL');
    table.string('timestampDisplay').nullable();
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());

    // 索引
    table.index(['userId']);
    table.index(['sourceType']);
    table.index(['sourceId']);
    table.index(['createdAt']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('user_notes');
}