import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('user_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('actionType', ['video_watch', 'article_read', 'note_create', 'comment_post']).notNullable();
    table.uuid('itemId').notNullable();
    table.enum('itemType', ['video', 'article', 'note', 'comment']).notNullable();
    table.integer('duration').nullable(); // 视频观看时长（秒）
    table.integer('progress').nullable(); // 阅读进度（百分比）
    table.jsonb('metadata').nullable(); // 额外的元数据
    table.timestamp('createdAt').defaultTo(knex.fn.now());

    // 索引
    table.index(['userId']);
    table.index(['actionType']);
    table.index(['itemType']);
    table.index(['itemId']);
    table.index(['createdAt']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('user_history');
}