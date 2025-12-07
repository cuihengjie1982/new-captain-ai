import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('business_configs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('config_key').unique().notNullable().comment('配置键');
    table.text('config_value').notNullable().comment('配置值');
    table.string('description').nullable().comment('配置描述');
    table.string('type').defaultTo('string').comment('配置类型');
    table.boolean('is_active').defaultTo(true).comment('是否启用');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // 索引
    table.index(['config_key'], 'idx_business_configs_key');
    table.index(['is_active'], 'idx_business_configs_active');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('business_configs');
}