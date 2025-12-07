import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.string('email').notNullable().unique();
    table.string('password').notNullable();
    table.string('phone').nullable();
    table.string('avatar').nullable();
    table.enum('role', ['admin', 'user']).defaultTo('user');
    table.enum('plan', ['free', 'pro']).defaultTo('free');
    table.boolean('emailVerified').defaultTo(false);
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.timestamp('lastLoginAt').nullable();

    // 索引
    table.index(['email']);
    table.index(['role']);
    table.index(['plan']);
    table.index(['createdAt']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('users');
}