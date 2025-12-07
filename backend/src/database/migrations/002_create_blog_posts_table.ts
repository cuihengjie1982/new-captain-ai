import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('blog_posts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('title').notNullable();
    table.text('summary').notNullable();
    table.text('content').notNullable();
    table.string('thumbnail').nullable();
    table.uuid('authorId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('author').notNullable();
    table.string('category').nullable();
    table.specificType('tags', 'text[]').defaultTo('{}');
    table.enum('requiredPlan', ['free', 'pro']).defaultTo('free');
    table.integer('viewCount').defaultTo(0);
    table.integer('likeCount').defaultTo(0);
    table.enum('status', ['draft', 'published', 'archived']).defaultTo('draft');
    table.timestamp('publishedAt').nullable();
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());

    // 索引
    table.index(['authorId']);
    table.index(['status']);
    table.index(['category']);
    table.index(['publishedAt']);
    table.index(['viewCount']);
    table.index(['likeCount']);
    table.index(['createdAt']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('blog_posts');
}