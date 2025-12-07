const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 中间件
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3002', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// 模拟数据库
let users = [];
let blogPosts = [
  {
    id: '1',
    title: '人工智能在现代教育中的应用',
    summary: '探索AI技术如何改变传统教育模式，提升学习效率',
    content: '人工智能正在深刻改变教育领域...',
    category: 'AI技术',
    tags: ['人工智能', '教育', '创新'],
    author: 'AI专家',
    status: 'published',
    requiredPlan: 'free',
    likeCount: 42,
    viewCount: 156,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    title: '机器学习基础入门指南',
    summary: '从零开始学习机器学习的核心概念和实践方法',
    content: '机器学习是人工智能的一个重要分支...',
    category: '机器学习',
    tags: ['机器学习', 'Python', '算法'],
    author: '技术专家',
    status: 'published',
    requiredPlan: 'pro',
    likeCount: 28,
    viewCount: 89,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let comments = [
  {
    id: '1',
    postId: '1',
    userId: 'user1',
    userName: '张三',
    userAvatar: '',
    content: '非常好的文章，对AI在教育中的应用有了更深的理解！',
    likeCount: 5,
    replyCount: 2,
    isTop: false,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let chatSessions = [];

// 验证token中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '访问令牌不存在'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: '访问令牌无效'
      });
    }
    req.user = user;
    next();
  });
};

// 响应格式化函数
const successResponse = (data, message = '操作成功') => ({
  success: true,
  message,
  data
});

const errorResponse = (message, code = 400) => ({
  success: false,
  message
});

// 健康检查
// 健康检查（根路径）
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/health', (req, res) => {
  res.json(successResponse({
    status: 'ok',
    timestamp: new Date().toISOString()
  }));
});

// 用户认证
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 检查用户是否已存在
    if (users.find(u => u.email === email)) {
      return res.status(400).json(errorResponse('用户已存在'));
    }

    const user = {
      id: Date.now().toString(),
      name,
      email,
      password, // 实际应用中应该加密
      role: 'user',
      plan: 'free',
      emailVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    users.push(user);
    res.json(successResponse(null, '注册成功'));
  } catch (error) {
    res.status(500).json(errorResponse('注册失败'));
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      return res.status(401).json(errorResponse('邮箱或密码错误'));
    }

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json(successResponse({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        emailVerified: user.emailVerified
      },
      accessToken,
      refreshToken,
      expiresIn: 86400
    }, '登录成功'));
  } catch (error) {
    res.status(500).json(errorResponse('登录失败'));
  }
});

app.get('/api/auth/profile', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json(errorResponse('用户不存在'));
  }

  res.json(successResponse({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    plan: user.plan,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt
  }));
});

// 博客API
app.get('/api/blog/posts', (req, res) => {
  const { page = 1, limit = 10, category, search } = req.query;
  let filteredPosts = blogPosts.filter(post => post.status === 'published');

  if (category) {
    filteredPosts = filteredPosts.filter(post => post.category === category);
  }

  if (search) {
    filteredPosts = filteredPosts.filter(post =>
      post.title.includes(search) || post.content.includes(search)
    );
  }

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedPosts = filteredPosts.slice(startIndex, endIndex);

  res.json(successResponse({
    data: paginatedPosts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: filteredPosts.length,
      totalPages: Math.ceil(filteredPosts.length / limit),
      hasNext: endIndex < filteredPosts.length,
      hasPrev: page > 1
    }
  }));
});

app.get('/api/blog/posts/:id', (req, res) => {
  const post = blogPosts.find(p => p.id === req.params.id);
  if (!post) {
    return res.status(404).json(errorResponse('文章不存在'));
  }
  res.json(successResponse(post));
});

app.post('/api/blog/posts', authenticateToken, (req, res) => {
  const { title, summary, content, category, tags } = req.body;

  const post = {
    id: Date.now().toString(),
    title,
    summary,
    content,
    category,
    tags,
    author: req.user.email,
    status: 'draft',
    requiredPlan: 'free',
    likeCount: 0,
    viewCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  blogPosts.push(post);
  res.json(successResponse(post, '文章创建成功'));
});

// 评论API
app.get('/api/comments/:postId', (req, res) => {
  const { postId } = req.params;
  const postComments = comments.filter(c => c.postId === postId && c.status === 'active');

  res.json(successResponse({
    comments: postComments.map(comment => ({
      ...comment,
      replies: [] // 简化实现
    })),
    pagination: {
      page: 1,
      limit: 10,
      total: postComments.length,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    }
  }));
});

app.post('/api/comments/:postId', authenticateToken, (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;

  const comment = {
    id: Date.now().toString(),
    postId,
    userId: req.user.userId,
    userName: req.user.email,
    content,
    likeCount: 0,
    replyCount: 0,
    isTop: false,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  comments.push(comment);
  res.json(successResponse(comment, '评论发表成功'));
});

// AI聊天API
app.post('/api/chat/send-message', authenticateToken, async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    let session;
    if (sessionId) {
      session = chatSessions.find(s => s.id === sessionId);
    }

    if (!session) {
      session = {
        id: Date.now().toString(),
        userId: req.user.userId,
        model: 'gemini-pro',
        messageCount: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      chatSessions.push(session);
    }

    // 模拟AI响应
    const aiResponse = `这是对"${message}"的模拟AI回复。在实际应用中，这里会调用真实的AI服务。`;

    const userMessage = {
      id: Date.now().toString(),
      sessionId: session.id,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString()
    };

    const assistantMessage = {
      id: (Date.now() + 1).toString(),
      sessionId: session.id,
      role: 'assistant',
      content: aiResponse,
      createdAt: new Date().toISOString()
    };

    session.messageCount += 2;
    session.updatedAt = new Date().toISOString();

    res.json(successResponse({
      session,
      userMessage,
      aiMessage: assistantMessage
    }));
  } catch (error) {
    res.status(500).json(errorResponse('消息发送失败'));
  }
});

app.get('/api/chat/sessions', authenticateToken, (req, res) => {
  const userSessions = chatSessions.filter(s => s.userId === req.user.userId);

  res.json(successResponse({
    sessions: userSessions,
    pagination: {
      page: 1,
      limit: 10,
      total: userSessions.length,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    }
  }));
});

// 用户统计
app.get('/api/user/stats', authenticateToken, (req, res) => {
  res.json(successResponse({
    totalUsers: users.length,
    activeUsers: users.filter(u => u.emailVerified).length,
    adminUsers: users.filter(u => u.role === 'admin').length,
    proUsers: users.filter(u => u.plan === 'pro').length,
    freeUsers: users.filter(u => u.plan === 'free').length
  }));
});

// 商务API接口 - 模拟数据
let businessLeads = [];
let businessContact = null;
let paymentQRCode = null;

// 验证函数
const validateLeadData = (data) => {
  const errors = [];
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

// 商务线索相关接口
app.post('/api/business/leads', async (req, res) => {
  try {
    const errors = validateLeadData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: '请求参数验证失败',
        errors
      });
    }

    const lead = {
      id: Date.now().toString(),
      ...req.body,
      status: 'new',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    businessLeads.unshift(lead);
    console.log('商务线索创建成功:', lead.id, lead.email);

    res.status(201).json(successResponse(lead, '商务线索提交成功'));
  } catch (error) {
    console.error('创建商务线索失败:', error);
    res.status(500).json(errorResponse('提交失败，请稍后重试'));
  }
});

app.get('/api/business/contact-info', (req, res) => {
  try {
    res.json(successResponse({
      contactInfo: businessContact,
      qrCode: paymentQRCode
    }));
  } catch (error) {
    console.error('获取商务联系人信息失败:', error);
    res.status(500).json(errorResponse('获取失败，请稍后重试'));
  }
});

app.get('/api/business/admin/leads', (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    let filteredLeads = businessLeads;

    if (status) {
      filteredLeads = filteredLeads.filter(lead => lead.status === status);
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedLeads = filteredLeads.slice(startIndex, endIndex);

    res.json(successResponse({
      leads: paginatedLeads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredLeads.length,
        totalPages: Math.ceil(filteredLeads.length / limit),
        hasNext: endIndex < filteredLeads.length,
        hasPrev: page > 1
      }
    }));
  } catch (error) {
    console.error('获取商务线索列表失败:', error);
    res.status(500).json(errorResponse('获取失败，请稍后重试'));
  }
});

app.get('/api/business/admin/leads-stats', (req, res) => {
  try {
    const total = businessLeads.length;
    const newLeads = businessLeads.filter(l => l.status === 'new').length;
    const contacted = businessLeads.filter(l => l.status === 'contacted').length;
    const qualified = businessLeads.filter(l => l.status === 'qualified').length;
    const closed = businessLeads.filter(l => l.status === 'closed').length;

    const stats = {
      total,
      new: newLeads,
      contacted,
      qualified,
      closed,
      conversion_rate: total > 0 ? Math.round((qualified / total) * 100 * 100) / 100 : 0,
      average_response_time: 24 // 模拟数据
    };

    res.json(successResponse(stats));
  } catch (error) {
    console.error('获取商务线索统计失败:', error);
    res.status(500).json(errorResponse('获取失败，请稍后重试'));
  }
});

app.put('/api/business/admin/contact-info', (req, res) => {
  try {
    const { contactPerson, contactMethod, email } = req.body;

    if (!contactPerson?.trim() || !contactMethod?.trim()) {
      return res.status(400).json(errorResponse('联系人和联系方式不能为空'));
    }

    businessContact = { contactPerson, contactMethod, email: email || '' };
    console.log('商务联系人信息更新成功:', businessContact);

    res.json(successResponse(null, '商务联系人信息更新成功'));
  } catch (error) {
    console.error('更新商务联系人信息失败:', error);
    res.status(500).json(errorResponse('更新失败，请稍后重试'));
  }
});

app.put('/api/business/admin/payment-qr', (req, res) => {
  try {
    const { qrCode } = req.body;

    if (!qrCode) {
      return res.status(400).json(errorResponse('二维码数据不能为空'));
    }

    paymentQRCode = qrCode;
    console.log('支付二维码更新成功');

    res.json(successResponse(null, '支付二维码更新成功'));
  } catch (error) {
    console.error('更新支付二维码失败:', error);
    res.status(500).json(errorResponse('更新失败，请稍后重试'));
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json(errorResponse('服务器内部错误'));
});

// 404处理
app.use((req, res) => {
  res.status(404).json(errorResponse('接口不存在'));
});

app.listen(PORT, () => {
  console.log(`开发服务器运行在 http://localhost:${PORT}`);
});