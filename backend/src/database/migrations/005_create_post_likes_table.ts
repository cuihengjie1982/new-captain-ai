import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('post_likes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('postId').notNullable().references('id').inTable('blog_posts').onDelete('CASCADE');
    table.uuid('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('createdAt').defaultTo(knex.fn.now());

    // 唯一约束：一个用户对一篇文章只能点赞一次
    table.unique(['postId', 'userId']);

    // 索引
    table.index(['postId']);
    table.index(['userId']);
    table.index(['createdAt']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('post_likes');
}