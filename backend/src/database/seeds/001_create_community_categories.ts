import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex('community_categories').del();

  // Insert seed entries
  await knex('community_categories').insert([
    {
      id: knex.raw('gen_random_uuid()'),
      name: '技术交流',
      description: '技术讨论和问题解答',
      icon: 'Code',
      color: '#3B82F6',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: '案例分享',
      description: '成功案例和经验分享',
      icon: 'TrendingUp',
      color: '#10B981',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: '产品反馈',
      description: '产品建议和功能需求',
      icon: 'MessageSquare',
      color: '#F59E0B',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: '行业动态',
      description: '行业新闻和趋势分析',
      icon: 'Newspaper',
      color: '#8B5CF6',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);
}