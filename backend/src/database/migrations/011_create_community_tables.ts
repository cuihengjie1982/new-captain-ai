import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 创建社区分类表
  await knex.schema.createTable('community_categories', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable().unique();
    table.text('description').nullable();
    table.string('icon').notNullable().defaultTo('MessageSquare'); // Lucide icon name
    table.string('color').notNullable().defaultTo('#3B82F6');
    table.integer('postCount').defaultTo(0);
    table.enum('status', ['active', 'inactive']).defaultTo('active');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());

    // 索引
    table.index(['name']);
    table.index(['status']);
  });

  // 创建社区帖子表
  await knex.schema.createTable('community_posts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('title').notNullable();
    table.text('content').notNullable();
    table.uuid('authorId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('authorName').notNullable(); // 冗余存储，避免关联查询
    table.string('authorAvatar').nullable();
    table.enum('authorRole', ['admin', 'user']).notNullable();
    table.uuid('categoryId').notNullable().references('id').inTable('community_categories').onDelete('RESTRICT');
    table.string('categoryName').notNullable(); // 冗余存储
    table.specificType('tags', 'text[]').defaultTo('{}');
    table.enum('requiredPlan', ['free', 'pro']).defaultTo('free');
    table.integer('viewCount').defaultTo(0);
    table.integer('likeCount').defaultTo(0);
    table.integer('replyCount').defaultTo(0);
    table.boolean('isPinned').defaultTo(false);
    table.boolean('isLocked').defaultTo(false); // 是否锁定回复
    table.enum('status', ['published', 'hidden', 'deleted']).defaultTo('published');
    table.timestamp('lastReplyAt').nullable();
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());

    // 索引
    table.index(['authorId']);
    table.index(['categoryId']);
    table.index(['status']);
    table.index(['isPinned']);
    table.index(['requiredPlan']);
    table.index(['viewCount']);
    table.index(['likeCount']);
    table.index(['replyCount']);
    table.index(['createdAt']);
    table.index(['lastReplyAt']);
  });

  // 创建社区回复表
  await knex.schema.createTable('community_replies', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('postId').notNullable().references('id').inTable('community_posts').onDelete('CASCADE');
    table.uuid('parentId').nullable().references('id').inTable('community_replies').onDelete('CASCADE'); // 支持嵌套回复
    table.uuid('authorId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('authorName').notNullable();
    table.string('authorAvatar').nullable();
    table.enum('authorRole', ['admin', 'user']).notNullable();
    table.text('content').notNullable();
    table.integer('likeCount').defaultTo(0);
    table.boolean('isAuthor').defaultTo(false); // 是否是楼主的回复
    table.enum('status', ['published', 'hidden', 'deleted']).defaultTo('published');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());

    // 索引
    table.index(['postId']);
    table.index(['parentId']);
    table.index(['authorId']);
    table.index(['status']);
    table.index(['isAuthor']);
    table.index(['createdAt']);
  });

  // 创建社区点赞表（用于帖子和回复的点赞）
  await knex.schema.createTable('community_likes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('targetId').notNullable(); // 帖子或回复的ID
    table.enum('targetType', ['post', 'reply']).notNullable();
    table.timestamp('createdAt').defaultTo(knex.fn.now());

    // 确保同一用户对同一目标只能点赞一次
    table.unique(['userId', 'targetId', 'targetType']);

    // 索引
    table.index(['userId']);
    table.index(['targetId', 'targetType']);
  });

  // 创建社区用户已读记录表（记录帖子阅读状态）
  await knex.schema.createTable('community_reads', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('postId').notNullable().references('id').inTable('community_posts').onDelete('CASCADE');
    table.timestamp('readAt').defaultTo(knex.fn.now());

    // 确保同一用户对同一帖子只有一条阅读记录
    table.unique(['userId', 'postId']);

    // 索引
    table.index(['userId']);
    table.index(['postId']);
    table.index(['readAt']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('community_reads');
  await knex.schema.dropTableIfExists('community_likes');
  await knex.schema.dropTableIfExists('community_replies');
  await knex.schema.dropTableIfExists('community_posts');
  await knex.schema.dropTableIfExists('community_categories');
}