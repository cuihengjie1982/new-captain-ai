import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('business_leads', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable().comment('联系人姓名');
    table.string('position').notNullable().comment('职位头衔');
    table.string('company').notNullable().comment('公司名称');
    table.string('phone').notNullable().comment('手机号码');
    table.string('email').notNullable().comment('邮箱地址');
    table.enum('status', ['new', 'contacted', 'qualified', 'closed']).defaultTo('new').comment('线索状态');
    table.text('notes').nullable().comment('备注信息');
    table.string('assigned_to').nullable().comment('负责人ID');
    table.timestamp('followed_up_at').nullable().comment('跟进时间');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // 索引
    table.index(['status'], 'idx_business_leads_status');
    table.index(['created_at'], 'idx_business_leads_created');
    table.index(['email'], 'idx_business_leads_email');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('business_leads');
}