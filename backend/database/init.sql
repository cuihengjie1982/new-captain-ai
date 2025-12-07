-- Captain AI 数据库初始化脚本

-- 创建数据库（如果不存在）
CREATE DATABASE captain_ai;

-- 使用数据库
\c captain_ai;

-- 创建必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建索引优化性能
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON blog_posts(authorId);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(publishedAt);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(postId);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(userId);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(createdAt);

CREATE INDEX IF NOT EXISTS idx_comment_replies_comment_id ON comment_replies(commentId);
CREATE INDEX IF NOT EXISTS idx_comment_replies_user_id ON comment_replies(userId);
CREATE INDEX IF NOT EXISTS idx_comment_replies_created_at ON comment_replies(createdAt);

CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON user_notes(userId);
CREATE INDEX IF NOT EXISTS idx_user_notes_source_type ON user_notes(sourceType);
CREATE INDEX IF NOT EXISTS idx_user_notes_source_id ON user_notes(sourceId);
CREATE INDEX IF NOT EXISTS idx_user_notes_created_at ON user_notes(createdAt);

CREATE INDEX IF NOT EXISTS idx_user_history_user_id ON user_history(userId);
CREATE INDEX IF NOT EXISTS idx_user_history_action_type ON user_history(actionType);
CREATE INDEX IF NOT EXISTS idx_user_history_item_type ON user_history(itemType);
CREATE INDEX IF NOT EXISTS idx_user_history_created_at ON user_history(createdAt);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(userId);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(createdAt);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(sessionId);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON chat_messages(role);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(createdAt);

CREATE INDEX IF NOT EXISTS idx_user_uploads_user_id ON user_uploads(userId);
CREATE INDEX IF NOT EXISTS idx_user_uploads_type ON user_uploads(type);
CREATE INDEX IF NOT EXISTS idx_user_uploads_created_at ON user_uploads(createdAt);

-- 插入初始数据
INSERT INTO users (id, name, email, password, role, plan, emailVerified, createdAt, updatedAt) VALUES
('00000000-0000-0000-0000-000000000001', '系统管理员', 'admin@captainai.cc', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.Lr5', 'admin', 'pro', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 插入示例博客文章
INSERT INTO blog_posts (id, title, summary, content, authorId, author, category, tags, requiredPlan, status, publishedAt, createdAt, updatedAt) VALUES
('10000000-0000-0000-0000-000000000001', '欢迎使用 Captain AI', '这是一个强大的呼叫中心智能辅助平台', '<h1>欢迎使用 Captain AI</h1><p>Captain AI 是一个专为呼叫中心行业设计的智能辅助平台...</p>', '00000000-0000-0000-0000-000000000001', 'Captain AI 团队', '教程', '{\"入门\",\"平台介绍\",\"AI助手\"}', 'free', 'published', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO blog_posts (id, title, summary, content, authorId, author, category, tags, requiredPlan, status, publishedAt, createdAt, updatedAt) VALUES
('10000000-0000-0000-0000-000000000002', 'AI 助手使用指南', '学习如何有效使用 AI 学习助手提升工作效率', '<h1>AI 助手使用指南</h1><p>Captain AI 的 AI 助手是一个强大的工具...</p>', '00000000-0000-0000-0000-000000000001', 'Captain AI 团队', '教程', '{\"AI助手\",\"使用指南\",\"效率提升\"}', 'free', 'published', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO blog_posts (id, title, summary, content, authorId, author, category, tags, requiredPlan, status, publishedAt, createdAt, updatedAt) VALUES
('10000000-0000-0000-0000-000000000003', '呼叫中心最佳实践', '分享呼叫中心运营的最佳实践和经验', '<h1>呼叫中心最佳实践</h1><p>在本文中，我们将分享呼叫中心运营的最佳实践...</p>', '00000000-0000-0000-0000-000000000001', 'Captain AI 团队', '运营', '{\"最佳实践\",\"运营管理\",\"客户服务\"}', 'pro', 'published', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 设置序列值（如果使用自增ID）
-- ALTER SEQUENCE users_id_seq RESTART WITH 2;
-- ALTER SEQUENCE blog_posts_id_seq RESTART WITH 4;

-- 输出初始化完成信息
\echo '数据库初始化完成！';
\echo '默认管理员账户：admin@captainai.cc';
\echo '默认密码：captainai123';