import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('comment_replies', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('commentId').notNullable().references('id').inTable('comments').onDelete('CASCADE');
    table.uuid('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('userName').notNullable();
    table.string('userAvatar').nullable();
    table.text('content').notNullable();
    table.integer('likeCount').defaultTo(0);
    table.enum('status', ['active', 'hidden', 'deleted']).defaultTo('active');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());

    // 索引
    table.index(['commentId']);
    table.index(['userId']);
    table.index(['status']);
    table.index(['createdAt']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('comment_replies');
}