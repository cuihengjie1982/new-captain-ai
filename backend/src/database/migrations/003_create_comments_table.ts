import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('comments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('postId').notNullable().references('id').inTable('blog_posts').onDelete('CASCADE');
    table.uuid('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('userName').notNullable();
    table.string('userAvatar').nullable();
    table.text('content').notNullable();
    table.integer('likeCount').defaultTo(0);
    table.integer('replyCount').defaultTo(0);
    table.boolean('isTop').defaultTo(false);
    table.enum('status', ['active', 'hidden', 'deleted']).defaultTo('active');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());

    // 索引
    table.index(['postId']);
    table.index(['userId']);
    table.index(['status']);
    table.index(['isTop']);
    table.index(['createdAt']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('comments');
}