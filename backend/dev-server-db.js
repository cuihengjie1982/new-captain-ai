const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 数据库连接
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 中间件
app.use(cors());
app.use(express.json());

// 初始化数据库表
async function initDatabase() {
  try {
    // 创建用户表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        plan VARCHAR(50) DEFAULT 'free',
        phone VARCHAR(20),
        avatar TEXT,
        email_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP
      )
    `);

    // 创建博客文章表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        summary TEXT,
        content TEXT NOT NULL,
        thumbnail TEXT,
        category VARCHAR(100),
        author VARCHAR(255),
        status VARCHAR(50) DEFAULT 'draft',
        required_plan VARCHAR(50) DEFAULT 'free',
        like_count INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建评论表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES blog_posts(id),
        user_id INTEGER REFERENCES users(id),
        user_name VARCHAR(255),
        user_avatar TEXT,
        content TEXT NOT NULL,
        like_count INTEGER DEFAULT 0,
        reply_count INTEGER DEFAULT 0,
        is_top BOOLEAN DEFAULT false,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建聊天会话表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255),
        model VARCHAR(100) DEFAULT 'gemini-pro',
        context TEXT,
        message_count INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建聊天消息表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES chat_sessions(id),
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 插入示例数据
    const postsCount = await pool.query('SELECT COUNT(*) FROM blog_posts');
    if (parseInt(postsCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO blog_posts (title, summary, content, category, author, status, required_plan, like_count, view_count) VALUES
        ('人工智能在现代教育中的应用', '探索AI技术如何改变传统教育模式，提升学习效率', '人工智能正在深刻改变教育领域...', 'AI技术', 'AI专家', 'published', 'free', 42, 156),
        ('机器学习基础入门指南', '从零开始学习机器学习的核心概念和实践方法', '机器学习是人工智能的一个重要分支...', '机器学习', '技术专家', 'published', 'pro', 28, 89)
      `);
    }

    console.log('数据库初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
  }
}

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
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json(errorResponse('用户已存在'));
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, role, plan, email_verified, created_at',
      [name, email, hashedPassword]
    );

    const user = result.rows[0];
    res.json(successResponse(null, '注册成功'));
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json(errorResponse('注册失败'));
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT id, name, email, password, role, plan, email_verified FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json(errorResponse('邮箱或密码错误'));
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json(errorResponse('邮箱或密码错误'));
    }

    // 更新最后登录时间
    await pool.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

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
        emailVerified: user.email_verified
      },
      accessToken,
      refreshToken,
      expiresIn: 86400
    }, '登录成功'));
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json(errorResponse('登录失败'));
  }
});

app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, plan, email_verified, created_at, last_login_at FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse('用户不存在'));
    }

    const user = result.rows[0];
    res.json(successResponse({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at
    }));
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json(errorResponse('获取用户信息失败'));
  }
});

// 博客API
app.get('/api/blog/posts', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM blog_posts WHERE status = $1';
    let params = ['published'];

    if (category) {
      query += ' AND category = $' + (params.length + 1);
      params.push(category);
    }

    if (search) {
      query += ' AND (title ILIKE $' + (params.length + 1) + ' OR content ILIKE $' + (params.length + 2) + ')';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), offset);

    const result = await pool.query(query);

    // 获取总数
    let countQuery = 'SELECT COUNT(*) FROM blog_posts WHERE status = $1';
    let countParams = ['published'];

    if (category) {
      countQuery += ' AND category = $' + (countParams.length + 1);
      countParams.push(category);
    }

    if (search) {
      countQuery += ' AND (title ILIKE $' + (countParams.length + 1) + ' OR content ILIKE $' + (countParams.length + 2) + ')';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalPosts = parseInt(countResult.rows[0].count);

    res.json(successResponse({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalPosts,
        totalPages: Math.ceil(totalPosts / limit),
        hasNext: offset + result.rows.length < totalPosts,
        hasPrev: page > 1
      }
    }));
  } catch (error) {
    console.error('获取博客列表错误:', error);
    res.status(500).json(errorResponse('获取博客列表失败'));
  }
});

app.get('/api/blog/posts/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM blog_posts WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json(errorResponse('文章不存在'));
    }

    // 增加浏览量
    await pool.query('UPDATE blog_posts SET view_count = view_count + 1 WHERE id = $1', [req.params.id]);

    res.json(successResponse(result.rows[0]));
  } catch (error) {
    console.error('获取文章详情错误:', error);
    res.status(500).json(errorResponse('获取文章详情失败'));
  }
});

// 评论API
app.get('/api/comments/:postId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM comments WHERE post_id = $1 AND status = $2 ORDER BY created_at DESC',
      [req.params.postId, 'active']
    );

    res.json(successResponse({
      comments: result.rows.map(comment => ({
        ...comment,
        replies: [] // 简化实现，不包含回复
      })),
      pagination: {
        page: 1,
        limit: 10,
        total: result.rows.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    }));
  } catch (error) {
    console.error('获取评论列表错误:', error);
    res.status(500).json(errorResponse('获取评论列表失败'));
  }
});

// AI聊天API
app.post('/api/chat/send-message', authenticateToken, async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    let session;
    if (sessionId) {
      const sessionResult = await pool.query(
        'SELECT * FROM chat_sessions WHERE id = $1 AND user_id = $2',
        [sessionId, req.user.userId]
      );
      session = sessionResult.rows[0];
    }

    if (!session) {
      const sessionResult = await pool.query(
        'INSERT INTO chat_sessions (user_id, model, message_count) VALUES ($1, $2, $3) RETURNING *',
        [req.user.userId, 'gemini-pro', 0]
      );
      session = sessionResult.rows[0];
    }

    // 模拟AI响应
    const aiResponse = `这是对"${message}"的模拟AI回复。在实际应用中，这里会调用真实的AI服务。`;

    const userMessage = await pool.query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3) RETURNING *',
      [session.id, 'user', message]
    );

    const assistantMessage = await pool.query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3) RETURNING *',
      [session.id, 'assistant', aiResponse]
    );

    // 更新会话消息数
    await pool.query(
      'UPDATE chat_sessions SET message_count = message_count + 2, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [session.id]
    );

    res.json(successResponse({
      session,
      userMessage: userMessage.rows[0],
      aiMessage: assistantMessage.rows[0]
    }));
  } catch (error) {
    console.error('发送聊天消息错误:', error);
    res.status(500).json(errorResponse('消息发送失败'));
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

// 启动服务器
async function startServer() {
  await initDatabase();

  app.listen(PORT, () => {
    console.log(`支持PostgreSQL的开发服务器运行在 http://localhost:${PORT}`);
    console.log(`数据库连接: ${process.env.DATABASE_URL}`);
  });
}

startServer();