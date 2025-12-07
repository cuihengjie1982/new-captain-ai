import db from '@/config/database';
import { logger } from '@/utils/logger';
import {
  BusinessLead,
  CreateBusinessLeadData,
  UpdateBusinessLeadData,
  BusinessLeadQuery,
  BusinessLeadStats,
  BusinessConfig,
  CreateBusinessConfigData,
  UpdateBusinessConfigData,
  BusinessConfigQuery,
  BusinessContactInfo
} from '@/models';

export class BusinessService {

  // 商务线索相关方法

  async createLead(data: CreateBusinessLeadData): Promise<BusinessLead> {
    try {
      const [lead] = await db('business_leads')
        .insert({
          ...data,
          status: 'new',
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      logger.info('商务线索创建成功', { leadId: lead.id, email: lead.email });

      // 发送通知邮件给管理员（如果配置了邮件服务）
      // await this.notifyNewLead(lead);

      return lead;
    } catch (error) {
      logger.error('创建商务线索失败', error);
      throw error;
    }
  }

  async getLeads(query: BusinessLeadQuery = {}): Promise<{
    leads: BusinessLead[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      const page = Math.max(1, query.page || 1);
      const limit = Math.min(100, Math.max(1, query.limit || 10));
      const offset = (page - 1) * limit;

      let dbQuery = db('business_leads');

      // 状态筛选
      if (query.status) {
        dbQuery = dbQuery.where('status', query.status);
      }

      // 负责人筛选
      if (query.assigned_to) {
        dbQuery = dbQuery.where('assigned_to', query.assigned_to);
      }

      // 搜索功能
      if (query.search) {
        const searchTerm = `%${query.search}%`;
        dbQuery = dbQuery.where(function() {
          this.where('name', 'ilike', searchTerm)
              .orWhere('company', 'ilike', searchTerm)
              .orWhere('email', 'ilike', searchTerm)
              .orWhere('phone', 'ilike', searchTerm);
        });
      }

      // 日期范围筛选
      if (query.start_date) {
        dbQuery = dbQuery.where('created_at', '>=', query.start_date);
      }
      if (query.end_date) {
        dbQuery = dbQuery.where('created_at', '<=', query.end_date);
      }

      // 获取总数
      const totalResult = await dbQuery.clone().count('* as count').first();
      const total = parseInt(totalResult?.count || '0');

      // 获取数据
      const leads = await dbQuery
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(total / limit);

      return {
        leads,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('获取商务线索列表失败', error);
      throw error;
    }
  }

  async getLeadById(id: string): Promise<BusinessLead | null> {
    try {
      const lead = await db('business_leads')
        .where('id', id)
        .first();

      return lead || null;
    } catch (error) {
      logger.error('获取商务线索详情失败', { id, error });
      throw error;
    }
  }

  async updateLead(id: string, data: UpdateBusinessLeadData): Promise<BusinessLead> {
    try {
      const [lead] = await db('business_leads')
        .where('id', id)
        .update({
          ...data,
          updated_at: new Date()
        })
        .returning('*');

      if (!lead) {
        throw new Error('商务线索不存在');
      }

      logger.info('商务线索更新成功', { leadId: id, changes: Object.keys(data) });
      return lead;
    } catch (error) {
      logger.error('更新商务线索失败', { id, error });
      throw error;
    }
  }

  async deleteLead(id: string): Promise<void> {
    try {
      const deletedCount = await db('business_leads')
        .where('id', id)
        .del();

      if (deletedCount === 0) {
        throw new Error('商务线索不存在');
      }

      logger.info('商务线索删除成功', { leadId: id });
    } catch (error) {
      logger.error('删除商务线索失败', { id, error });
      throw error;
    }
  }

  async getLeadStats(): Promise<BusinessLeadStats> {
    try {
      const stats = await db('business_leads')
        .select(
          db.raw('COUNT(*) as total'),
          db.raw('COUNT(CASE WHEN status = \'new\' THEN 1 END) as new'),
          db.raw('COUNT(CASE WHEN status = \'contacted\' THEN 1 END) as contacted'),
          db.raw('COUNT(CASE WHEN status = \'qualified\' THEN 1 END) as qualified'),
          db.raw('COUNT(CASE WHEN status = \'closed\' THEN 1 END) as closed')
        )
        .first();

      const total = parseInt(stats?.total || '0');
      const qualified = parseInt(stats?.qualified || '0');
      const conversionRate = total > 0 ? (qualified / total) * 100 : 0;

      // 计算平均响应时间（从创建到首次跟进）
      const avgResponseTime = await db('business_leads')
        .whereNotNull('followed_up_at')
        .select(
          db.raw('AVG(EXTRACT(EPOCH FROM (followed_up_at - created_at))/3600) as avg_hours')
        )
        .first();

      return {
        total,
        new: parseInt(stats?.new || '0'),
        contacted: parseInt(stats?.contacted || '0'),
        qualified,
        closed: parseInt(stats?.closed || '0'),
        conversion_rate: Math.round(conversionRate * 100) / 100,
        average_response_time: Math.round((parseFloat(avgResponseTime?.avg_hours || '0') || 0) * 100) / 100
      };
    } catch (error) {
      logger.error('获取商务线索统计失败', error);
      throw error;
    }
  }

  async exportLeads(query: BusinessLeadQuery = {}): Promise<BusinessLead[]> {
    try {
      // 获取所有符合条件的线索（不分页）
      let dbQuery = db('business_leads');

      if (query.status) {
        dbQuery = dbQuery.where('status', query.status);
      }
      if (query.assigned_to) {
        dbQuery = dbQuery.where('assigned_to', query.assigned_to);
      }
      if (query.search) {
        const searchTerm = `%${query.search}%`;
        dbQuery = dbQuery.where(function() {
          this.where('name', 'ilike', searchTerm)
              .orWhere('company', 'ilike', searchTerm)
              .orWhere('email', 'ilike', searchTerm);
        });
      }
      if (query.start_date) {
        dbQuery = dbQuery.where('created_at', '>=', query.start_date);
      }
      if (query.end_date) {
        dbQuery = dbQuery.where('created_at', '<=', query.end_date);
      }

      const leads = await dbQuery.orderBy('created_at', 'desc');
      return leads;
    } catch (error) {
      logger.error('导出商务线索失败', error);
      throw error;
    }
  }

  // 商务配置相关方法

  async getBusinessContactInfo(): Promise<BusinessContactInfo | null> {
    try {
      const configs = await this.getMultipleConfigs([
        'business_contact_person',
        'business_contact_method',
        'business_contact_email'
      ]);

      if (!configs['business_contact_person'] || !configs['business_contact_method']) {
        return null;
      }

      return {
        contactPerson: configs['business_contact_person'].config_value,
        contactMethod: configs['business_contact_method'].config_value,
        email: configs['business_contact_email']?.config_value || ''
      };
    } catch (error) {
      logger.error('获取商务联系人信息失败', error);
      throw error;
    }
  }

  async updateBusinessContactInfo(data: BusinessContactInfo): Promise<void> {
    try {
      await db.transaction(async (trx) => {
        await trx('business_configs')
          .insert({
            config_key: 'business_contact_person',
            config_value: data.contactPerson,
            description: '商务联系人姓名',
            type: 'string',
            created_at: new Date(),
            updated_at: new Date()
          })
          .onConflict('config_key')
          .merge({
            config_value: data.contactPerson,
            updated_at: new Date()
          });

        await trx('business_configs')
          .insert({
            config_key: 'business_contact_method',
            config_value: data.contactMethod,
            description: '商务联系方式（微信号/电话）',
            type: 'string',
            created_at: new Date(),
            updated_at: new Date()
          })
          .onConflict('config_key')
          .merge({
            config_value: data.contactMethod,
            updated_at: new Date()
          });

        if (data.email) {
          await trx('business_configs')
            .insert({
              config_key: 'business_contact_email',
              config_value: data.email,
              description: '商务联系邮箱',
              type: 'string',
              created_at: new Date(),
              updated_at: new Date()
            })
            .onConflict('config_key')
            .merge({
              config_value: data.email,
              updated_at: new Date()
            });
        }
      });

      logger.info('商务联系人信息更新成功', data);
    } catch (error) {
      logger.error('更新商务联系人信息失败', error);
      throw error;
    }
  }

  async getPaymentQRCode(): Promise<string | null> {
    try {
      const config = await this.getConfig('payment_qr_code');
      return config?.config_value || null;
    } catch (error) {
      logger.error('获取支付二维码失败', error);
      return null;
    }
  }

  async updatePaymentQRCode(base64Data: string): Promise<void> {
    try {
      await db('business_configs')
        .insert({
          config_key: 'payment_qr_code',
          config_value: base64Data,
          description: '支付/商务二维码',
          type: 'string',
          created_at: new Date(),
          updated_at: new Date()
        })
        .onConflict('config_key')
        .merge({
          config_value: base64Data,
          updated_at: new Date()
        });

      logger.info('支付二维码更新成功');
    } catch (error) {
      logger.error('更新支付二维码失败', error);
      throw error;
    }
  }

  // 通用配置方法

  async getConfig(key: string): Promise<BusinessConfig | null> {
    try {
      const config = await db('business_configs')
        .where('config_key', key)
        .where('is_active', true)
        .first();

      return config || null;
    } catch (error) {
      logger.error('获取配置失败', { key, error });
      throw error;
    }
  }

  async getMultipleConfigs(keys: string[]): Promise<Record<string, BusinessConfig>> {
    try {
      const configs = await db('business_configs')
        .whereIn('config_key', keys)
        .where('is_active', true);

      const result: Record<string, BusinessConfig> = {};
      configs.forEach(config => {
        result[config.config_key] = config;
      });

      return result;
    } catch (error) {
      logger.error('批量获取配置失败', { keys, error });
      throw error;
    }
  }

  async getAllConfigs(query: BusinessConfigQuery = {}): Promise<BusinessConfig[]> {
    try {
      let dbQuery = db('business_configs');

      if (query.key) {
        dbQuery = dbQuery.where('config_key', 'like', `%${query.key}%`);
      }
      if (query.type) {
        dbQuery = dbQuery.where('type', query.type);
      }
      if (query.is_active !== undefined) {
        dbQuery = dbQuery.where('is_active', query.is_active);
      }

      return await dbQuery.orderBy('config_key');
    } catch (error) {
      logger.error('获取所有配置失败', error);
      throw error;
    }
  }

  async createConfig(data: CreateBusinessConfigData): Promise<BusinessConfig> {
    try {
      const [config] = await db('business_configs')
        .insert({
          ...data,
          is_active: data.is_active ?? true,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      logger.info('配置创建成功', { key: config.config_key });
      return config;
    } catch (error) {
      logger.error('创建配置失败', error);
      throw error;
    }
  }

  async updateConfig(key: string, data: UpdateBusinessConfigData): Promise<BusinessConfig> {
    try {
      const [config] = await db('business_configs')
        .where('config_key', key)
        .update({
          ...data,
          updated_at: new Date()
        })
        .returning('*');

      if (!config) {
        throw new Error('配置不存在');
      }

      logger.info('配置更新成功', { key, changes: Object.keys(data) });
      return config;
    } catch (error) {
      logger.error('更新配置失败', { key, error });
      throw error;
    }
  }

  async deleteConfig(key: string): Promise<void> {
    try {
      const deletedCount = await db('business_configs')
        .where('config_key', key)
        .del();

      if (deletedCount === 0) {
        throw new Error('配置不存在');
      }

      logger.info('配置删除成功', { key });
    } catch (error) {
      logger.error('删除配置失败', { key, error });
      throw error;
    }
  }

  // 私有方法：发送新线索通知
  private async notifyNewLead(lead: BusinessLead): Promise<void> {
    try {
      // 这里可以实现邮件通知、短信通知等
      // 例如调用邮件服务发送通知给管理员
      logger.info('新商务线索通知', { leadId: lead.id, email: lead.email });
    } catch (error) {
      logger.error('发送新线索通知失败', { leadId: lead.id, error });
      // 不抛出错误，避免影响主要流程
    }
  }
}

export default new BusinessService();