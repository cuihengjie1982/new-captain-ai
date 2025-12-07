import { Router } from 'express';
import businessService from '@/services/businessService';
import { logger } from '@/utils/logger';
import { requireAdminAuth } from '@/middleware/adminAuth';

const router = Router();

// 验证函数
const validateLeadData = (data: any) => {
  const errors: string[] = [];
  if (!data.name?.trim()) errors.push('姓名不能为空');
  if (!data.position?.trim()) errors.push('职位不能为空');
  if (!data.company?.trim()) errors.push('公司名称不能为空');
  if (!data.phone?.trim()) errors.push('手机号码不能为空');
  if (!data.email?.trim()) errors.push('邮箱不能为空');
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('请输入有效的邮箱地址');
  }
  return errors;
};

const validateContactInfo = (data: any) => {
  const errors: string[] = [];
  if (!data.contactPerson?.trim()) errors.push('联系人姓名不能为空');
  if (!data.contactMethod?.trim()) errors.push('联系方式不能为空');
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('请输入有效的邮箱地址');
  }
  return errors;
};

// 公开接口：创建商务线索
router.post('/leads', async (req, res) => {
  try {
    const errors = validateLeadData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: '请求参数验证失败',
        errors
      });
    }

    const lead = await businessService.createLead(req.body);

    logger.info('商务线索创建成功', {
      leadId: lead.id,
      email: lead.email,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      message: '商务线索提交成功',
      data: lead
    });
  } catch (error) {
    logger.error('创建商务线索失败', error);
    res.status(500).json({
      success: false,
      message: '提交失败，请稍后重试'
    });
  }
});

// 公开接口：获取商务联系人信息
router.get('/contact-info', async (req, res) => {
  try {
    const contactInfo = await businessService.getBusinessContactInfo();
    const qrCode = await businessService.getPaymentQRCode();

    res.json({
      success: true,
      message: '获取成功',
      data: { contactInfo, qrCode }
    });
  } catch (error) {
    logger.error('获取商务联系人信息失败', error);
    res.status(500).json({
      success: false,
      message: '获取失败，请稍后重试'
    });
  }
});

// 管理员接口：获取商务线索列表
router.get('/admin/leads', requireAdminAuth, async (req, res) => {
  try {
    const result = await businessService.getLeads(req.query);

    res.json({
      success: true,
      message: '获取成功',
      data: result
    });
  } catch (error) {
    logger.error('获取商务线索列表失败', error);
    res.status(500).json({
      success: false,
      message: '获取失败，请稍后重试'
    });
  }
});

// 管理员接口：获取商务线索详情
router.get('/admin/leads/:id', requireAdminAuth, async (req, res) => {
  try {
    const lead = await businessService.getLeadById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: '商务线索不存在'
      });
    }

    res.json({
      success: true,
      message: '获取成功',
      data: lead
    });
  } catch (error) {
    logger.error('获取商务线索详情失败', error);
    res.status(500).json({
      success: false,
      message: '获取失败，请稍后重试'
    });
  }
});

// 管理员接口：更新商务线索
router.put('/admin/leads/:id', requireAdminAuth, async (req, res) => {
  try {
    const lead = await businessService.updateLead(req.params.id, req.body);

    res.json({
      success: true,
      message: '更新成功',
      data: lead
    });
  } catch (error) {
    if (error.message === '商务线索不存在') {
      return res.status(404).json({
        success: false,
        message: '商务线索不存在'
      });
    }

    logger.error('更新商务线索失败', error);
    res.status(500).json({
      success: false,
      message: '更新失败，请稍后重试'
    });
  }
});

// 管理员接口：删除商务线索
router.delete('/admin/leads/:id', requireAdminAuth, async (req, res) => {
  try {
    await businessService.deleteLead(req.params.id);

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    if (error.message === '商务线索不存在') {
      return res.status(404).json({
        success: false,
        message: '商务线索不存在'
      });
    }

    logger.error('删除商务线索失败', error);
    res.status(500).json({
      success: false,
      message: '删除失败，请稍后重试'
    });
  }
});

// 管理员接口：获取商务线索统计
router.get('/admin/leads-stats', requireAdminAuth, async (req, res) => {
  try {
    const stats = await businessService.getLeadStats();

    res.json({
      success: true,
      message: '获取成功',
      data: stats
    });
  } catch (error) {
    logger.error('获取商务线索统计失败', error);
    res.status(500).json({
      success: false,
      message: '获取失败，请稍后重试'
    });
  }
});

// 管理员接口：导出商务线索
router.get('/admin/leads-export', requireAdminAuth, async (req, res) => {
  try {
    const leads = await businessService.exportLeads(req.query);

    // 设置响应头
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="business-leads-${new Date().toISOString().split('T')[0]}.csv"`);

    // 生成CSV内容
    const csvHeader = 'ID,姓名,职位,公司,手机,邮箱,状态,备注,负责人,创建时间,跟进时间\n';
    const csvData = leads.map(lead => [
      lead.id,
      lead.name,
      lead.position,
      lead.company,
      lead.phone,
      lead.email,
      lead.status,
      lead.notes || '',
      lead.assigned_to || '',
      lead.created_at.toISOString(),
      lead.followed_up_at?.toISOString() || ''
    ].join(',')).join('\n');

    const csvContent = csvHeader + csvData;
    const bom = '\uFEFF'; // 支持中文
    res.send(bom + csvContent);
  } catch (error) {
    logger.error('导出商务线索失败', error);
    res.status(500).json({
      success: false,
      message: '导出失败，请稍后重试'
    });
  }
});

// 管理员接口：更新商务联系人信息
router.put('/admin/contact-info', requireAdminAuth, async (req, res) => {
  try {
    const errors = validateContactInfo(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: '请求参数验证失败',
        errors
      });
    }

    await businessService.updateBusinessContactInfo(req.body);

    res.json({
      success: true,
      message: '商务联系人信息更新成功'
    });
  } catch (error) {
    logger.error('更新商务联系人信息失败', error);
    res.status(500).json({
      success: false,
      message: '更新失败，请稍后重试'
    });
  }
});

// 管理员接口：更新支付二维码
router.put('/admin/payment-qr', async (req, res) => {
  try {
    if (!req.body.qrCode) {
      return res.status(400).json({
        success: false,
        message: '二维码数据不能为空'
      });
    }

    await businessService.updatePaymentQRCode(req.body.qrCode);

    res.json({
      success: true,
      message: '支付二维码更新成功'
    });
  } catch (error) {
    logger.error('更新支付二维码失败', error);
    res.status(500).json({
      success: false,
      message: '更新失败，请稍后重试'
    });
  }
});

// 管理员接口：批量更新线索状态
router.put('/admin/leads/batch-status', async (req, res) => {
  try {
    const { ids, status, assigned_to } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ID列表不能为空'
      });
    }

    if (!['new', 'contacted', 'qualified', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '状态值无效'
      });
    }

    const updateData: any = { status };
    if (assigned_to) {
      updateData.assigned_to = assigned_to;
      updateData.followed_up_at = new Date();
    }

    // 批量更新
    const promises = ids.map((id: string) =>
      businessService.updateLead(id, updateData)
    );

    await Promise.all(promises);

    res.json({
      success: true,
      message: `成功更新 ${ids.length} 条线索状态`
    });
  } catch (error) {
    logger.error('批量更新线索状态失败', error);
    res.status(500).json({
      success: false,
      message: '批量更新失败，请稍后重试'
    });
  }
});

export default router;